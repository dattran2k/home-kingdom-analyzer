// UI initialization and utility functions
import { IMPORTANT_COLUMNS } from './constants.js';
import { applyFilters } from './filtering.js';
import { appState } from './state.js';

export function initializeUIElements(allData, preserveFilters = false) {
    console.log('Initializing UI elements with data:', allData.length, 'rows');
    
    if (!allData || allData.length === 0) return;
    
    // Normalize headers - use dynamic column names
    const headers = Object.keys(allData[0]);
    console.log('Headers found:', headers);
    
    // Save current filter values if preserving
    let currentFilters = {};
    if (preserveFilters) {
        currentFilters = {
            kingdom: document.getElementById('kingdomFilter')?.value || 'all',
            search: document.getElementById('searchInput')?.value || ''
        };
    }
    
    // Initialize kingdom filter based on dynamic columns
    const kingdomColumn = headers.find(h => 
        h.toLowerCase().includes('kingdom') || 
        h.toLowerCase().includes('server')
    );
    
    if (kingdomColumn) {
        const kingdoms = [...new Set(allData.map(d => d[kingdomColumn]))].filter(k => k).sort((a, b) => a - b);
        const kingdomSelect = document.getElementById('kingdomFilter');
        
        if (kingdomSelect) {
            kingdomSelect.innerHTML = '<option value="all">All Kingdoms</option>';
            kingdoms.forEach(kingdom => {
                const option = document.createElement('option');
                option.value = kingdom;
                option.textContent = `Kingdom ${kingdom}`;
                kingdomSelect.appendChild(option);
            });
            
            // Restore previous value if preserving filters
            if (preserveFilters && currentFilters.kingdom) {
                kingdomSelect.value = currentFilters.kingdom;
            }
        }
    }
    
    // Restore other filters
    if (preserveFilters) {
        if (currentFilters.search) {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = currentFilters.search;
        }
    }
    
    // Initialize columns filter
    initializeColumnsFilter(headers);
}

export function initializeColumnsFilter(headers) {
    const columnsFilter = document.getElementById('columnsFilter');
    if (!columnsFilter) return;
    
    columnsFilter.innerHTML = '';
    
    // Reorder headers to put name columns first
    const reorderedHeaders = reorderColumns(headers);
    
    // Categorize columns
    const importantColumns = reorderedHeaders.filter(h => isImportantColumn(h));
    const otherColumns = reorderedHeaders.filter(h => !isImportantColumn(h));
    
    // Add important columns first
    importantColumns.forEach(column => {
        addColumnCheckbox(columnsFilter, column, true);
    });
    
    // Add separator if both categories exist
    if (importantColumns.length > 0 && otherColumns.length > 0) {
        const separator = document.createElement('div');
        separator.className = 'columns-separator';
        separator.innerHTML = '<hr style="margin: 10px 0; opacity: 0.3;">';
        columnsFilter.appendChild(separator);
    }
    
    // Add other columns
    otherColumns.forEach(column => {
        addColumnCheckbox(columnsFilter, column, false);
    });
    
    // Add change listeners for immediate updates
    const changeHandler = () => {
        applyFilters();
    };
    
    // Use event delegation for better performance
    columnsFilter.addEventListener('change', changeHandler);
}

function reorderColumns(headers) {
    // Create a copy of headers for reordering
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
        // Remove them from array
        const nameIndex = headersCopy.indexOf(nameCol);
        const idIndex = headersCopy.indexOf(idCol);
        
        headersCopy.splice(Math.max(nameIndex, idIndex), 1);
        headersCopy.splice(Math.min(nameIndex, idIndex), 1);
        
        // Add them back at the beginning (after server/kingdom columns)
        const serverCol = headersCopy.findIndex(h => 
            h.toLowerCase().includes('server') || h.toLowerCase().includes('kingdom')
        );
        
        if (serverCol >= 0) {
            // Insert after server/kingdom column
            headersCopy.splice(serverCol + 1, 0, nameCol, idCol);
        } else {
            // Insert at beginning
            headersCopy.unshift(nameCol, idCol);
        }
    }
    
    return headersCopy;
}

function isImportantColumn(column) {
    const lowerColumn = column.toLowerCase();
    const importantPatterns = [
        'id', 'name', 'server', 'kingdom', 'power', 'merit', 
        'victory', 'victories', 'kill', 't5', 'alliance'
    ];
    
    return importantPatterns.some(pattern => lowerColumn.includes(pattern));
}

function addColumnCheckbox(container, column, checked) {
    const checkboxItem = document.createElement('div');
    checkboxItem.className = 'checkbox-item';
    const columnId = column.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Special handling for columns from URL
    const urlParams = new URLSearchParams(window.location.search);
    const columnsParam = urlParams.get('columns');
    if (columnsParam) {
        const selectedColumns = columnsParam.split(',');
        checked = selectedColumns.includes(column);
    }
    
    checkboxItem.innerHTML = `
        <input type="checkbox" id="col_${columnId}" value="${column}" ${checked ? 'checked' : ''}>
        <label for="col_${columnId}">${column}</label>
    `;
    container.appendChild(checkboxItem);
}

export function selectAllColumns() {
    document.querySelectorAll('#columnsFilter input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
    applyFilters();
}

export function selectImportantColumns() {
    // Get all checkboxes
    const checkboxes = document.querySelectorAll('#columnsFilter input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        const column = cb.value;
        cb.checked = isImportantColumn(column);
    });
    
    applyFilters();
}

export function formatNumber(num) {
    // Check if the value should not be formatted (contains 'id')
    if (typeof num === 'string' && num.toLowerCase().includes('id')) {
        return num;
    }
    
    const number = parseFloat(num);
    if (isNaN(number)) return num;
    
    // Format as number with commas
    return number.toLocaleString('en-US');
}

export function getColorForValue(value, average, isAboveGood = true) {
    const ratio = value / average;
    
    if (isAboveGood) {
        // Values above average are good (darker green)
        if (ratio > 1.2) return '#27ae60'; // Darker green
        return '#c0392b'; // Darker red
    } else {
        // Values below average are good (e.g., units dead)
        if (ratio < 0.8) return '#27ae60'; // Darker green
        return '#c0392b'; // Darker red
    }
}

export function updateURLWithConfig() {
    const selectedColumns = Array.from(document.querySelectorAll('#columnsFilter input:checked'))
        .map(cb => cb.value);
    
    const filters = {
        kingdom: document.getElementById('kingdomFilter')?.value,
        search: document.getElementById('searchInput')?.value,
        columns: selectedColumns
    };
    
    // Update URL
    const params = new URLSearchParams();
    if (filters.kingdom && filters.kingdom !== 'all') params.set('kingdom', filters.kingdom);
    if (filters.search) params.set('search', filters.search);
    if (filters.columns.length > 0) params.set('columns', filters.columns.join(','));
    
    // Add sheet information
    if (appState.sheets && appState.sheets.length > 0) {
        const sheetUrls = appState.sheets.map(s => s.url).filter(url => url);
        if (sheetUrls.length > 0) {
            params.set('sheets', sheetUrls.join(','));
        }
    }
    
    // Add selected sheet or changes
    if (appState.selectedSheet) {
        params.set('selected', appState.selectedSheet);
    } else if (appState.selectedChanges && appState.selectedChanges.size > 0) {
        params.set('changes', Array.from(appState.selectedChanges).join(','));
    }
    
    const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newURL);
}

export function loadConfigFromURL() {
    const params = new URLSearchParams(window.location.search);
    
    // Load sheet URLs directly
    const sheets = params.get('sheets');
    if (sheets) {
        const sheetUrls = sheets.split(',');
        console.log('Sheet URLs from URL:', sheetUrls);
        
        // Wait for container to be ready
        setTimeout(() => {
            const container = document.getElementById('sheetUrlsContainer');
            if (container) {
                // Clear existing inputs
                container.innerHTML = '';
                
                // Create input row for each URL
                sheetUrls.forEach((url, index) => {
                    const newRow = document.createElement('div');
                    newRow.className = 'sheet-url-row';
                    newRow.innerHTML = `
                        <input type="url" 
                               class="sheet-url-input"
                               placeholder="Enter Google Sheet URL..." 
                               style="padding: 10px;">
                        <button class="remove-url-btn" onclick="this.parentElement.remove()">✖</button>
                    `;
                    container.appendChild(newRow);
                    
                    // Set the value
                    const input = newRow.querySelector('.sheet-url-input');
                    if (input) {
                        input.value = url;
                    }
                });
            }
        }, 100);
    }
}

// Export the missing function
export function applyPendingSelection() {
    // This function applies any pending sheet or changes selection after sheets are loaded
    const urlParams = new URLSearchParams(window.location.search);
    const selected = urlParams.get('selected');
    const changes = urlParams.get('changes');
    
    if (selected && window.sheetManager) {
        console.log('Applying pending sheet selection:', selected);
        window.sheetManager.selectSheet(selected);
    } else if (changes && window.sheetManager) {
        console.log('Applying pending changes selection:', changes);
        const changeIds = changes.split(',');
        changeIds.forEach(id => {
            window.sheetManager.toggleChangeSelection(id);
        });
    }
}

// Export function to add UI for sheet tabs only - no duplicate sheet loading UI
export function createSheetUI() {
    // Check if sheet UI already exists
    if (document.querySelector('.sheet-ui-container')) {
        return;
    }
    
    const mainContent = document.getElementById('mainContent');
    const controls = document.querySelector('.controls');
    
    // Create only the sheet tabs container
    const sheetUIContainer = document.createElement('div');
    sheetUIContainer.className = 'sheet-ui-container';
    sheetUIContainer.innerHTML = `
        <div id="sheetTabsContainer" class="sheet-tabs-container" style="margin-bottom: 20px;">
            <!-- Sheet tabs will be dynamically added here -->
        </div>
    `;
    
    // Insert before controls
    mainContent.insertBefore(sheetUIContainer, controls);
}
