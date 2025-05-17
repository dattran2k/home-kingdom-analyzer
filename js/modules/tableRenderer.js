// Table rendering functions
import { appState } from './state.js';
import { sortByColumn } from './sorting.js';
import { formatNumber, getColorForValue } from './ui.js';
import { chartManager } from './charts/chartManager.js';
import { chartContainer } from './charts/components/ConfigurableCharts/index.js';

// Reorder columns to put name before ID
function reorderColumns(headers) {
    const headersCopy = [...headers];
    
    // Find governor name and ID columns
    const nameCol = headersCopy.find(h => {
        const lower = h.toLowerCase();
        return lower.includes('governor') && lower.includes('name');
    });
    
    const idCol = headersCopy.find(h => {
        const lower = h.toLowerCase();
        return lower.includes('governor') && lower.includes('id');
    });
    
    // If we found both columns, reorder them
    if (nameCol && idCol) {
        const nameIndex = headersCopy.indexOf(nameCol);
        const idIndex = headersCopy.indexOf(idCol);
        
        if (idIndex < nameIndex) {
            // Remove them from array
            headersCopy.splice(Math.max(nameIndex, idIndex), 1);
            headersCopy.splice(Math.min(nameIndex, idIndex), 1);
            
            // Add them back in correct order (name first, then ID)
            const insertIndex = Math.min(nameIndex, idIndex);
            headersCopy.splice(insertIndex, 0, nameCol, idCol);
        }
    }
    
    return headersCopy;
}

export function renderTable() {
    if (!appState.data || appState.data.length === 0) return;
    
    console.log('Rendering table with columns:', appState.currentColumns);
    console.log('Data sample:', appState.data[0]);
    
    // Calculate averages for color coding
    const averages = calculateAverages();
    
    // Update headers
    const headerRow = document.getElementById('tableHeader');
    
    // Use current columns in the exact order they appear, preserving user-specified order
    let availableColumns = [];
    
    // First check if we have a custom column order in appState.columnOrder
    if (appState.columnOrder && appState.columnOrder.length > 0) {
        console.log('Using column order from appState.columnOrder:', appState.columnOrder);
        
        // Filter the ordered columns to only include those that exist in data
        const validOrderedColumns = appState.columnOrder.filter(col => 
            appState.data.length > 0 && col in appState.data[0]
        );
        
        // Only include columns that are in currentColumns (selected in UI)
        availableColumns = validOrderedColumns.filter(col => 
            appState.currentColumns.includes(col)
        );
        
        console.log('Final ordered columns for table:', availableColumns);
    } 
    // Then check if we have columns already in appState.currentColumns
    else if (appState.currentColumns && appState.currentColumns.length > 0) {
        // Filter out any columns that don't exist in the data
        availableColumns = appState.currentColumns.filter(col => 
            appState.data.length > 0 && col in appState.data[0]
        );
    } else {
        // Fallback to reordering headers if no currentColumns specified
        availableColumns = reorderColumns(Object.keys(appState.data[0]));
    }
    
    // Check if we have column mapping active
    if (appState.columnMapping && Object.keys(appState.columnMapping).length > 0) {
        console.log('Using column mapping:', appState.columnMapping);
        // Filter columns to only show mapped ones
        availableColumns = availableColumns.filter(col => 
            col in appState.columnMapping || 
            Object.values(appState.columnMapping).includes(col)
        );
    }
    
    if (availableColumns.length === 0) {
        console.error('No valid columns to display');
        return;
    }
    
    // Include row number as first column only
    const headers = ['#', ...availableColumns];
    
    headerRow.innerHTML = headers.map((col, index) => {
        if (col === '#') {
            return '<th class="index-column">#</th>';
        }
        return `
            <th onclick="window.sortByColumn('${col}')">
                ${col}
                <span class="sort-indicator">
                    ${appState.sortColumn === col ? (appState.sortDirection === 'asc' ? '▲' : '▼') : ''}
                </span>
            </th>
        `;
    }).join('');
    
    // Update body
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    appState.data.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Special styling for change detail rows
        if (row.is_change_detail) {
            tr.style.background = '#2c3e50';
            tr.style.fontSize = '0.9em';
        } else if (row.is_total) {
            tr.style.background = '#34495e';
            tr.style.fontWeight = 'bold';
        }
        
        // Add row number as first column
        const numberTd = document.createElement('td');
        numberTd.textContent = index + 1;
        numberTd.className = 'index-column';
        tr.appendChild(numberTd);
        
        // Add data columns
        availableColumns.forEach(col => {
            const td = document.createElement('td');
            let value = row[col];
            
            // Find ID column dynamically
            const idCol = appState.headers.find(h => {
                const lower = h.toLowerCase();
                return (lower.includes('governor') && lower.includes('id')) ||
                       (lower.includes('lord') && lower.includes('id')) ||
                       lower === 'id';
            });
            
            // Add click handler for governor name to highlight in chart
            if (col.toLowerCase().includes('name') && !col.toLowerCase().includes('alliance')) {
                td.style.cursor = 'pointer';
                td.onclick = () => {
                    if (idCol && row[idCol]) {
                        chartManager.highlightPlayer(row[idCol]);
                        // Also update in configurable charts if available
                        if (window.chartContainer) {
                            chartContainer.highlightPlayer(row[idCol]);
                        }
                    }
                };
            }
            
            // Handle units killed column with specific class
            if (col.toLowerCase().includes('units') && col.toLowerCase().includes('killed')) {
                td.className = 'units-killed';
            }
            
            // Format and color numeric values
            if (typeof value === 'number' || !isNaN(parseFloat(value))) {
                const numValue = parseFloat(value);
                
                // Special handling for change rows
                if (row.is_change_row) {
                    // Keep the +/- sign for changes
                    const changeValue = value.toString();
                    if (changeValue.startsWith('+')) {
                        td.style.color = '#2ecc71'; // Green for positive
                        td.style.fontWeight = 'bold';
                    } else if (changeValue.startsWith('-') || changeValue.startsWith('−')) {
                        td.style.color = '#e74c3c'; // Red for negative
                        td.style.fontWeight = 'bold';
                    } else if (changeValue === '0') {
                        td.style.color = '#95a5a6'; // Gray for no change
                    }
                    td.textContent = changeValue;
                } else if (!col.toLowerCase().includes('id')) {
                    // Don't format IDs
                    value = formatNumber(numValue);
                    td.textContent = value;
                    
                    // Apply color coding based on average
                    if (averages[col] && !row.is_change_detail && !row.is_total) {
                        // Simple above/below average coloring
                        const avg = averages[col];
                        
                        // For all metrics, higher than average = green, lower = red
                        if (numValue > avg) {
                            td.className = 'cell-above-average'; // Green
                        } else {
                            td.className = 'cell-below-average'; // Red
                        }
                    }
                } else {
                    td.textContent = value;
                }
            } else if (row.is_change_row && typeof value === 'string') {
                // Handle string change values (already formatted with +/-)
                if (value.startsWith('+')) {
                    td.style.color = '#2ecc71'; // Green for positive
                    td.style.fontWeight = 'bold';
                } else if (value.startsWith('-') || value.startsWith('−')) {
                    td.style.color = '#e74c3c'; // Red for negative
                    td.style.fontWeight = 'bold';
                } else if (value === '0') {
                    td.style.color = '#95a5a6'; // Gray for no change
                }
                td.textContent = value;
            } else {
                td.textContent = value !== undefined && value !== null ? value : '-';
            }
            
            // Special styling for kingdom/server columns with colors
            if (col.toLowerCase().includes('kingdom')) {
                td.classList.add('center-text');
                td.classList.add('bold-text');
                
                // Apply kingdom color based on value
                if (value && !isNaN(value)) {
                    td.classList.add('kingdom-' + parseInt(value));
                }
            } else if (col.toLowerCase().includes('server')) {
                td.classList.add('center-text');
                td.classList.add('bold-text');
            }
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
}

function calculateAverages() {
    const averages = {};
    const numericColumns = appState.headers.filter(h => {
        const lower = h.toLowerCase();
        return !lower.includes('id') && !lower.includes('name') && !lower.includes('tag');
    });
    
    numericColumns.forEach(col => {
        const values = appState.data
            .filter(row => !row.is_change_detail && !isNaN(parseFloat(row[col])))
            .map(row => parseFloat(row[col]));
        
        if (values.length > 0) {
            averages[col] = values.reduce((a, b) => a + b, 0) / values.length;
        }
    });
    
    return averages;
}

// Export sortByColumn to window for onclick handlers
window.sortByColumn = sortByColumn;
