// Table rendering functions
import { appState } from './state.js';
import { sortByColumn } from './sorting.js';
import { formatNumber, getColorForValue } from './ui.js';
import { chartManager } from './charts/chartManager.js';

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
    
    // Use current columns, but reorder them to put name before ID
    const availableColumns = reorderColumns(appState.currentColumns).filter(col => 
        appState.data.length > 0 && col in appState.data[0]
    );
    
    if (availableColumns.length === 0) {
        console.error('No valid columns to display');
        return;
    }
    
    // Include row number as first column only
    const headers = ['#', ...availableColumns];
    
    headerRow.innerHTML = headers.map((col, index) => {
        if (col === '#') {
            return '<th style="width: 40px; text-align: center;">#</th>';
        }
        return `
            <th onclick="window.sortByColumn('${col}')" style="cursor: pointer;">
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
        numberTd.style.textAlign = 'center';
        numberTd.style.fontWeight = 'bold';
        numberTd.style.color = '#95a5a6';
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
                    } else if (changeValue.startsWith('-') && changeValue !== '-0') {
                        td.style.color = '#e74c3c'; // Red for negative
                        td.style.fontWeight = 'bold';
                    } else if (changeValue === '0') {
                        td.style.color = '#95a5a6'; // Gray for no change
                    }
                    td.textContent = changeValue;
                } else if (!col.toLowerCase().includes('id')) {
                    // Don't format IDs
                    value = formatNumber(numValue);
                    
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
                }
            } else if (row.is_change_row && typeof value === 'string') {
                // Handle string change values (already formatted with +/-)
                if (value.startsWith('+')) {
                    td.style.color = '#2ecc71'; // Green for positive
                    td.style.fontWeight = 'bold';
                } else if (value.startsWith('-') && value !== '-0') {
                    td.style.color = '#e74c3c'; // Red for negative
                    td.style.fontWeight = 'bold';
                } else if (value === '0') {
                    td.style.color = '#95a5a6'; // Gray for no change
                }
            }
            
            // Special styling for kingdom/server columns with colors
            if (col.toLowerCase().includes('kingdom')) {
                td.style.textAlign = 'center';
                td.style.fontWeight = 'bold';
                
                // Apply kingdom color based on value
                if (value && !isNaN(value)) {
                    td.className = 'kingdom-' + parseInt(value);
                }
            } else if (col.toLowerCase().includes('server')) {
                td.style.textAlign = 'center';
                td.style.fontWeight = 'bold';
            }
            
            td.textContent = value !== undefined && value !== null ? value : '-';
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
