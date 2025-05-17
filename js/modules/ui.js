// UI initialization and utility functions
import { applyFilters } from './filtering.js';
import { appState } from './state.js';

// Add a debugger function to help log the state
function logColumnOrder() {
    console.log('Current column order in appState.columnOrder:', appState.columnOrder);
    console.log('Current selected columns in appState.currentColumns:', appState.currentColumns);
    
    const chips = document.querySelectorAll('.column-chip');
    console.log('Current chips in DOM order:', Array.from(chips).map(chip => chip.dataset.value));
}

// Initialize drag and drop for column chips
function initializeDragAndDrop(container) {
    // Add dragstart, dragover, dragenter, dragleave, and drop event listeners
    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragenter', handleDragEnter);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
    container.addEventListener('dragend', handleDragEnd);
    
    // Make each chip draggable
    const chips = container.querySelectorAll('.column-chip');
    chips.forEach(chip => {
        chip.setAttribute('draggable', 'true');
        chip.style.cursor = 'grab';
    });
    
    // Variables to store dragging state
    let draggedItem = null;
    let placeholder = null;
    
    function handleDragStart(e) {
        // Ensure we're working with the chip and not a child element
        const chip = e.target.closest('.column-chip');
        if (!chip) return;
        
        draggedItem = chip;
        
        // Set data (required for Firefox)
        e.dataTransfer.setData('text/plain', chip.dataset.value);
        
        // Create a visual effect
        setTimeout(() => {
            chip.style.opacity = '0.4';
        }, 0);
        
        // Create placeholder
        placeholder = document.createElement('div');
        placeholder.className = 'column-chip placeholder';
        placeholder.style.opacity = '0.2';
        placeholder.style.backgroundColor = '#666';
        placeholder.style.border = '1px dashed #999';
    }
    
    function handleDragOver(e) {
        if (!draggedItem) return;
        
        // Prevent default to allow drop
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    function handleDragEnter(e) {
        if (!draggedItem) return;
        
        // Find the chip we're dragging over
        const chip = e.target.closest('.column-chip');
        if (chip && chip !== draggedItem && chip !== placeholder) {
            // Add visual indicator
            chip.style.transform = 'scale(1.05)';
            chip.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        }
    }
    
    function handleDragLeave(e) {
        if (!draggedItem) return;
        
        // Find the chip we're leaving
        const chip = e.target.closest('.column-chip');
        if (chip && chip !== draggedItem) {
            // Remove visual indicator
            chip.style.transform = '';
            chip.style.boxShadow = '';
        }
    }
    
    function handleDrop(e) {
        if (!draggedItem) return;
        
        // Prevent default to allow drop
        e.preventDefault();
        
        // Find the chip we're dropping onto
        const chip = e.target.closest('.column-chip');
        if (chip && chip !== draggedItem) {
            // Get the target position
            const targetRect = chip.getBoundingClientRect();
            const targetCenterX = targetRect.left + targetRect.width / 2;
            
            // Determine if we should insert before or after the target
            if (e.clientX < targetCenterX) {
                container.insertBefore(draggedItem, chip);
            } else {
                container.insertBefore(draggedItem, chip.nextSibling);
            }
            
            // Remove visual indicator
            chip.style.transform = '';
            chip.style.boxShadow = '';
            
            // Update the column order in the data table
            updateColumnOrder();
            
            // Log the state for debugging
            logColumnOrder();
        }
    }
    
    function handleDragEnd() {
        if (!draggedItem) return;
        
        // Reset appearance
        draggedItem.style.opacity = '';
        draggedItem = null;
        
        // Remove potential placeholders
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        placeholder = null;
        
        // Reset any chips that might still have the drag-over styles
        const chips = container.querySelectorAll('.column-chip');
        chips.forEach(chip => {
            chip.style.transform = '';
            chip.style.boxShadow = '';
        });
    }
    
    // Update columnOrder for the chips when ordering changes
    function updateColumnOrder() {
        // Get the new column order from the UI
        const chips = container.querySelectorAll('.column-chip');
        const columnOrder = Array.from(chips).map(chip => chip.dataset.value);
        
        // Update appState with the complete column order (including unselected columns)
        appState.columnOrder = columnOrder;
        
        console.log('Updated appState.columnOrder:', appState.columnOrder);
        
        // Update appState to reflect only the selected columns
        appState.currentColumns = columnOrder.filter(col => {
            const checkbox = container.querySelector(`input[value="${col}"]`);
            return checkbox && checkbox.checked;
        });
        
        console.log('Updated appState.currentColumns:', appState.currentColumns);
        
        // Update the data table to show columns in the new order
        applyFilters();
        
        // Update URL with new configuration
        updateURLWithConfig();
    }
}

export function initializeUIElements(allData, preserveFilters = false) {
    console.log('Initializing UI elements with data:', allData.length, 'rows');
    
    if (!allData || allData.length === 0) return;
    
    // Add chart controls
    addChartControls();
    
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
    
    // Check if we have column order already defined in the URL/appState
    let orderedHeaders = [];
    
    if (appState.columnOrder && appState.columnOrder.length > 0) {
        // Filter to make sure we only use headers that exist in the data
        const validOrderedHeaders = appState.columnOrder.filter(col => headers.includes(col));
        
        // Find any headers that are not in our order yet
        const missingHeaders = headers.filter(col => !validOrderedHeaders.includes(col));
        
        // Combine ordered headers with any missing headers
        orderedHeaders = [...validOrderedHeaders, ...missingHeaders];
        
        console.log('Using column order from URL:', orderedHeaders);
    } else {
        // Use default reordering if no specific order is specified
        orderedHeaders = reorderColumns(headers);
    }
    
    // Check if we have an active column mapping
    const hasMapping = appState.columnMapping && Object.keys(appState.columnMapping).length > 0;
    
    // If we have a mapping, only show mapped columns
    let filteredHeaders = orderedHeaders;
    if (hasMapping) {
        // Get mapped columns from the mapping
        filteredHeaders = Object.keys(appState.columnMapping);
        console.log('Filtered headers based on mapping:', filteredHeaders);
        
        // Make sure all headers exist in the data
        filteredHeaders = filteredHeaders.filter(col => headers.includes(col));
        
        // If we have a column order, reorder the filtered headers
        if (appState.columnOrder && appState.columnOrder.length > 0) {
            filteredHeaders.sort((a, b) => {
                const aIndex = appState.columnOrder.indexOf(a);
                const bIndex = appState.columnOrder.indexOf(b);
                
                // If both headers are in the column order, sort by their order
                if (aIndex >= 0 && bIndex >= 0) {
                    return aIndex - bIndex;
                }
                // If only one is in the column order, prioritize it
                if (aIndex >= 0) return -1;
                if (bIndex >= 0) return 1;
                // If neither is in the column order, keep their original order
                return 0;
            });
        }
    }
    
    // Categorize columns
    const importantColumns = filteredHeaders.filter(h => isImportantColumn(h));
    const otherColumns = filteredHeaders.filter(h => !isImportantColumn(h));
    
    // Add important columns first, in the order specified in appState.columnOrder if available
    const allColumns = [...importantColumns, ...otherColumns];
    
    // Reorder columns based on appState.columnOrder if available
    if (appState.columnOrder && appState.columnOrder.length > 0) {
        // Create a copy to sort
        const columnsToSort = [...allColumns];
        
        // Sort based on columnOrder
        columnsToSort.sort((a, b) => {
            const aIndex = appState.columnOrder.indexOf(a);
            const bIndex = appState.columnOrder.indexOf(b);
            
            // If both columns are in columnOrder, sort by their position
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
            }
            // If only one is in columnOrder, prioritize it
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            
            // If neither is in columnOrder, keep original order
            return allColumns.indexOf(a) - allColumns.indexOf(b);
        });
        
        // Add columns in the sorted order
        columnsToSort.forEach(column => {
            addColumnCheckbox(columnsFilter, column, true);
        });
    } else {
        // Use original order if no columnOrder specified
        importantColumns.forEach(column => {
            addColumnCheckbox(columnsFilter, column, true);
        });
        
        // Separator has been removed as per requirement
        
        // Add other columns
        otherColumns.forEach(column => {
            addColumnCheckbox(columnsFilter, column, false);
        });
    }
    
    // Add change listeners for immediate updates
    const changeHandler = () => {
        applyFilters();
    };
    
    // Use event delegation for better performance
    columnsFilter.addEventListener('change', changeHandler);
    
    // Make the container sortable
    initializeDragAndDrop(columnsFilter);
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
    const columnId = column.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Special handling for columns from URL
    const urlParams = new URLSearchParams(window.location.search);
    const columnsParam = urlParams.get('columns');
    if (columnsParam) {
        const selectedColumns = columnsParam.split(',');
        checked = selectedColumns.includes(column);
    }
    
    const columnChip = document.createElement('div');
    columnChip.className = `column-chip ${checked ? 'selected' : ''}`;
    columnChip.dataset.value = column;
    columnChip.dataset.id = `col_${columnId}`;
    columnChip.setAttribute('draggable', 'true');
    columnChip.setAttribute('title', 'Drag to reorder columns');
    columnChip.style.cursor = 'grab';
    columnChip.innerHTML = `
        ${column}
        <span class="checkmark" style="${checked ? '' : 'display: none;'}">✓</span>
        <input type="checkbox" id="col_${columnId}" value="${column}" ${checked ? 'checked' : ''} style="display: none;">
    `;
    
    // Add click event to toggle selection
    columnChip.addEventListener('click', function() {
        const checkbox = this.querySelector('input[type="checkbox"]');
        const checkmark = this.querySelector('.checkmark');
        
        // Toggle checkbox checked state
        checkbox.checked = !checkbox.checked;
        
        // Toggle chip selected state
        if (checkbox.checked) {
            this.classList.add('selected');
            checkmark.style.display = '';
        } else {
            this.classList.remove('selected');
            checkmark.style.display = 'none';
        }
        
        // Trigger change event on checkbox to apply filters
        const event = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(event);
    });
    
    container.appendChild(columnChip);
}

export function selectAllColumns() {
    document.querySelectorAll('#columnsFilter input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
        
        // Update chip UI
        const chip = cb.closest('.column-chip');
        const checkmark = chip.querySelector('.checkmark');
        
        if (chip) {
            chip.classList.add('selected');
            if (checkmark) checkmark.style.display = '';
        }
    });
    applyFilters();
}

// Create chart controls container
export function addChartControls() {
    // Check if controls already exist
    if (document.querySelector('.chart-controls')) {
        return;
    }
    
    const mainContent = document.getElementById('mainContent');
    const controlsDiv = document.querySelector('.controls');
    const statsContainer = document.getElementById('statsContainer');
    
    if (!controlsDiv || !statsContainer) return;
    
    // Create chart controls container
    const chartControlsDiv = document.createElement('div');
    chartControlsDiv.className = 'chart-controls';
    chartControlsDiv.style.marginTop = '20px';
    chartControlsDiv.innerHTML = `
        <div class="chart-type-switcher">
            <label for="chartTypeSelect" style="color: #bdc3c7; margin-right: 10px;">Chart Type:</label>
            <select id="chartTypeSelect" style="padding: 5px; background: #2c3e50; color: #ecf0f1; border: 1px solid #3498db; border-radius: 4px;">
                <option value="simple">Simple Chart</option>
                <option value="configurable" selected>Configurable Charts</option>
            </select>
        </div>
        <button class="btn btn-secondary" onclick="window.chartToggle.toggle()">📊 Show Chart</button>
    `;
    
    // Insert after stats container
    statsContainer.parentNode.insertBefore(chartControlsDiv, statsContainer.nextSibling);
    
    // Add chart type switcher event listener
    const chartTypeSelect = document.getElementById('chartTypeSelect');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', function() {
            if (window.chartToggle) {
                window.chartToggle.setChartType(this.value);
            }
        });
        
        // Set initial chart type
        if (window.chartToggle) {
            window.chartToggle.setChartType(chartTypeSelect.value);
        }
    }
    
    // Add styles
    addChartControlsStyles();
}

// Add styles for chart controls
function addChartControlsStyles() {
    // Check if styles already exist
    if (document.getElementById('chart-controls-styles')) {
        return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'chart-controls-styles';
    styleElement.textContent = `
        .chart-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 20px 0;
            background: #34495e;
            padding: 15px;
            border-radius: 8px;
        }
        
        .chart-type-switcher {
            display: flex;
            align-items: center;
            margin-right: 15px;
        }
        
        /* Responsive styles */
        @media (max-width: 768px) {
            .chart-controls {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .chart-type-switcher {
                margin-bottom: 10px;
                width: 100%;
            }
            
            .chart-type-switcher select {
                width: 100%;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

export function formatNumber(num) {
    // Check if the value should not be formatted (contains 'id')
    if (typeof num === 'string' && num.toLowerCase().includes('id')) {
        return num;
    }
    
    // Handle change row notation with + or - prefix
    if (typeof num === 'string') {
        // Check if it's a change value with +/- prefix
        if ((num.startsWith('+') || num.startsWith('-') || num.startsWith('−')) && !isNaN(parseFloat(num.substring(1)))) {
            const prefix = num.charAt(0);
            const value = parseFloat(num.substring(1).replace(/,/g, ''));
            // Format the numeric part but keep the prefix
            return prefix + value.toLocaleString('en-US', {
                maximumFractionDigits: 0,
                useGrouping: true
            });
        }
        
        // For regular string numbers, remove commas before parsing
        num = num.replace(/,/g, '');
    }
    
    // Parse to number
    const numValue = parseFloat(num);
    if (isNaN(numValue)) return num;
    
    // Format with commas, no decimal places
    return numValue.toLocaleString('en-US', {
        maximumFractionDigits: 0,
        useGrouping: true
    });
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
    // Get selected columns
    const selectedColumns = Array.from(document.querySelectorAll('#columnsFilter input:checked'))
        .map(cb => cb.value);
    
    // Get column order (all columns, including unselected ones)
    const allColumnsInOrder = Array.from(document.querySelectorAll('.column-chip'))
        .map(chip => chip.dataset.value);
    
    const filters = {
        kingdom: document.getElementById('kingdomFilter')?.value,
        search: document.getElementById('searchInput')?.value,
        columns: selectedColumns,
        column_order: allColumnsInOrder
    };
    
    // Update URL
    const params = new URLSearchParams();
    if (filters.kingdom && filters.kingdom !== 'all') params.set('kingdom', filters.kingdom);
    if (filters.search) params.set('search', filters.search);
    if (filters.columns.length > 0) params.set('columns', filters.columns.join(','));
    
    // Only add column_order if it's different from default
    if (filters.column_order.length > 0) {
        params.set('column_order', filters.column_order.join(','));
    }
    
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
        
        // Add column mapping if available
        if (appState.columnMapping && Object.keys(appState.columnMapping).length > 0) {
            // Serialize the mapping to URL
            const mappingStr = Object.entries(appState.columnMapping)
                .map(([key, value]) => `${encodeURIComponent(key)}:${encodeURIComponent(value)}`)
                .join(',');
            params.set('mapping', mappingStr);
        }
    }
    
    // Add map_columns flag to store visibility of columns between sheets
    params.set('map_columns', 'true');
    
    // Add show_column_mapping flag to store visibility state of column mapping details
    if (appState.showColumnMapping) {
        params.set('show_column_mapping', 'true');
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
    
    // Load column mapping from URL
    const mappingStr = params.get('mapping');
    if (mappingStr) {
        try {
            const mapping = {};
            mappingStr.split(',').forEach(pair => {
                const [key, value] = pair.split(':');
                if (key && value) {
                    mapping[decodeURIComponent(key)] = decodeURIComponent(value);
                }
            });
            
            // Update state with mapping
            if (Object.keys(mapping).length > 0) {
                console.log('Loaded column mapping from URL:', mapping);
                appState.columnMapping = mapping;
            }
        } catch (error) {
            console.error('Error parsing mapping from URL:', error);
        }
    }
    
    // Check if map_columns is enabled
    const mapColumns = params.get('map_columns');
    if (mapColumns === 'true') {
        appState.mapColumns = true;
        console.log('Column mapping between sheets is enabled');
    }
    
    // Check if column mapping details should be shown
    const showColumnMapping = params.get('show_column_mapping');
    if (showColumnMapping === 'true') {
        appState.showColumnMapping = true;
        console.log('Column mapping details should be shown');
    } else {
        appState.showColumnMapping = false;
    }
    
    // Save column order from URL
    const columnOrderStr = params.get('column_order');
    if (columnOrderStr) {
        try {
            const columnOrder = columnOrderStr.split(',');
            // Save to state for later use when initializing columns
            appState.columnOrder = columnOrder;
            console.log('Loaded column order from URL:', columnOrder);
        } catch (error) {
            console.error('Error parsing column order from URL:', error);
        }
    }
}

// Function removed as it's not being used

// Clear all column selections
export function clearAllColumns() {
    document.querySelectorAll('#columnsFilter input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        
        // Update chip UI
        const chip = cb.closest('.column-chip');
        const checkmark = chip.querySelector('.checkmark');
        
        if (chip) {
            chip.classList.remove('selected');
            if (checkmark) checkmark.style.display = 'none';
        }
    });
    applyFilters();
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
