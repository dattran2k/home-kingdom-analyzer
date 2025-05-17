// Column mapping module to map columns with different names between sheets
import { appState } from '../state.js';
import { applyFilters } from '../filtering.js';
import { updateURLWithConfig } from '../ui.js';

// Load column mapping styles
function loadStyles() {
    // Create a style element and append it to head
    const styleElement = document.createElement('style');
    styleElement.id = 'column-mapping-styles';
    
    // CSS for column mapping
    styleElement.textContent = `
    .column-mapping-container {
        background: #2c3e50;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .mapping-header {
        margin-bottom: 15px;
    }
    
    .mapping-header h3 {
        margin: 0 0 5px 0;
        color: #ecf0f1;
        font-size: 1.4em;
    }
    
    .mapping-header p {
        margin: 0;
        color: #95a5a6;
        font-size: 0.9em;
    }
    
    .mapping-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
    }
    
    .mapping-pairs {
        background: #34495e;
        border-radius: 6px;
        padding: 20px;
        margin-top: 15px;
    }
    
    .sheets-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
    }
    
    .sheet-info {
        flex: 1;
        padding: 10px;
        background: #2c3e50;
        border-radius: 4px;
        color: #3498db;
        font-weight: bold;
        text-align: center;
        margin: 0 10px;
    }
    
    .mapping-section {
        margin-bottom: 25px;
        border-bottom: 1px solid #2c3e50;
        padding-bottom: 15px;
    }
    
    .mapping-section h4 {
        color: #ecf0f1;
        margin: 0 0 5px 0;
    }
    
    .mapping-description {
        color: #95a5a6;
        font-size: 0.9em;
        margin: 0 0 15px 0;
    }
    
    .mapping-row {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
        transition: all 0.3s ease;
    }
    
    .key-mapping-row {
        background: rgba(52, 152, 219, 0.1);
        padding: 10px;
        border-radius: 6px;
    }
    
    .col-select {
        flex: 1;
    }
    
    .map-arrow {
        margin: 0 15px;
        color: #7f8c8d;
        font-size: 1.5em;
    }
    
    .mapping-select {
        width: 100%;
        padding: 8px;
        background: #2c3e50;
        color: #ecf0f1;
        border: 1px solid #3498db;
        border-radius: 4px;
    }
    
    .id-column-option {
        color: #f39c12; /* Highlight ID columns */
    }
    
    .mapping-row-action {
        margin-left: 10px;
    }
    
    .mapping-row-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
    }
    
    .mapping-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 20px;
    }
    
    .remove-mapping-btn {
        background: none;
        border: none;
        color: #e74c3c;
        font-size: 1.2em;
        cursor: pointer;
        padding: 5px;
    }
    
    .remove-mapping-btn:hover {
        color: #c0392b;
    }
    
    /* Additional responsive styles */
    @media (max-width: 768px) {
        .sheets-info,
        .mapping-row {
            flex-direction: column;
            gap: 10px;
        }
        
        .sheet-info {
            margin: 5px 0;
        }
        
        .map-arrow {
            transform: rotate(90deg);
        }
    }
    `;
    
    // Check if the styles are already added
    if (!document.getElementById('column-mapping-styles')) {
        document.head.appendChild(styleElement);
    }
}

// Load styles when the module is imported
loadStyles();

export class ColumnMapper {
    constructor() {
        this.mappings = new Map(); // Format: sheetPairId -> { columnA1: columnB1, columnA2: columnB2, ... }
        this.activeMappingId = null;
    }
    
    // Load mapping from the appState if it was set from URL params
    loadMappingFromState(sheetPairId) {
        if (appState.columnMapping && Object.keys(appState.columnMapping).length > 0) {
            // Save the mapping from URL to the internal map
            this.mappings.set(sheetPairId, { ...appState.columnMapping });
            this.activeMappingId = sheetPairId;
            
            console.log(`Loaded column mapping for ${sheetPairId} from URL:`, appState.columnMapping);
            return true;
        }
        return false;
    }
    
    // Initialize the mapping UI for two specific sheets
    initializeMappingUI(sheet1, sheet2) {
        const mappingId = `${sheet1.id}-${sheet2.id}`;
        this.activeMappingId = mappingId;
        
        // Check if we have mapping in the URL/state first
        const loadedFromState = this.loadMappingFromState(mappingId);
        
        // Get or create mapping for these sheets if not loaded from state
        if (!loadedFromState && !this.mappings.has(mappingId)) {
            this.createDefaultMapping(sheet1, sheet2);
        }
        
        // Check if all columns have identical names between sheets
        const mapping = this.mappings.get(mappingId) || {};
        const allColumnsIdentical = 
            Object.keys(mapping).length === sheet1.headers.length && 
            Object.keys(mapping).length === sheet2.headers.length && 
            Object.entries(mapping).every(([key, value]) => key === value);
        
        // Apply the mapping immediately if loaded from state or all columns are identical
        if (loadedFromState || allColumnsIdentical) {
            this.applyMapping();
        }
        
        // Render the mapping UI
        this.renderMappingUI(sheet1, sheet2, allColumnsIdentical);
        
        // Show the mapping UI based on state from URL if available
        if (appState.showColumnMapping && !allColumnsIdentical) {
            this.showMappingPairs();
        } else {
            this.hideMappingPairs();
        }
        
        // Show mapping container only if columns are not all identical
        if (allColumnsIdentical) {
            this.hideMappingUI();
        } else {
            this.showMappingUI();
        }
    }
    
    // Create default mapping by matching identical column names
    createDefaultMapping(sheet1, sheet2) {
        const mappingId = `${sheet1.id}-${sheet2.id}`;
        const mapping = {};
        
        // Auto-map columns with identical names (exact match)
        let identicalColumnsCount = 0;
        for (const col1 of sheet1.headers) {
            if (sheet2.headers.includes(col1)) {
                mapping[col1] = col1; // Map to same name
                identicalColumnsCount++;
            }
        }
        
        // Check if all columns have identical names
        const allColumnsIdentical = identicalColumnsCount === sheet1.headers.length && 
                                    identicalColumnsCount === sheet2.headers.length;
        
        // If all columns have identical names, update UI to show this
        if (allColumnsIdentical) {
            console.log('All columns are identical between sheets. Auto-mapping applied.');
            
            // Show success message to the user
            const statusDiv = document.getElementById('loadingStatus');
            if (statusDiv) {
                statusDiv.textContent = 'Auto-mapping applied. All columns have identical names!';
                statusDiv.style.color = '#2ecc71';
                
                // Clear message after 3 seconds
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 3000);
            }
        } else {
            // Try case-insensitive matching for unmapped columns
            for (const col1 of sheet1.headers) {
                if (mapping[col1]) continue; // Skip if already mapped
                
                for (const col2 of sheet2.headers) {
                    if (col1.toLowerCase() === col2.toLowerCase()) {
                        mapping[col1] = col2;
                        break;
                    }
                }
            }
            
            // Try normalized matching (remove spaces/underscores)
            for (const col1 of sheet1.headers) {
                if (mapping[col1]) continue; // Skip if already mapped
                
                const normalized1 = col1.toLowerCase().replace(/[_\s]/g, '');
                
                for (const col2 of sheet2.headers) {
                    const normalized2 = col2.toLowerCase().replace(/[_\s]/g, '');
                    
                    if (normalized1 === normalized2) {
                        mapping[col1] = col2;
                        break;
                    }
                }
            }
            
            // Try to find ID column mappings
            this.tryMapColumnType(sheet1, sheet2, mapping, 'id', ['governor_id', 'lord_id', 'player_id', 'id', 'Lord Id']);
            
            // Try to find name column mappings
            this.tryMapColumnType(sheet1, sheet2, mapping, 'name', ['governor_name', 'lord_name', 'player_name', 'name', 'Lord Name']);
            
            // Try to find kill/dead/healed column mappings
            this.tryMapColumnType(sheet1, sheet2, mapping, 'kill', ['units_killed', 'kills', 'killed', 'Units Killed', 'units killed']);
            this.tryMapSpecialCase(sheet1, sheet2, mapping, ['units_dead', 'dead', 'Units Dead', 'units dead'], ['Units Healed', 'healed', 'heal']);
            this.tryMapSpecialCase(sheet1, sheet2, mapping, ['units_healed', 'healed', 'Units Healed', 'units healed'], ['Units Dead', 'dead', 'death']);
        }
        
        this.mappings.set(mappingId, mapping);
        console.log(`Created default mapping for ${mappingId}:`, mapping);
    }
    
    // Helper to find columns of a specific type
    tryMapColumnType(sheet1, sheet2, mapping, keyword, patterns) {
        for (const col1 of sheet1.headers) {
            // Skip if already mapped
            if (mapping[col1]) continue;
            
            // Check if this column matches the pattern
            const lowerCol1 = col1.toLowerCase();
            if (!lowerCol1.includes(keyword)) continue;
            
            // Find a match in sheet2
            for (const col2 of sheet2.headers) {
                const lowerCol2 = col2.toLowerCase();
                
                // Check if sheet2 column matches any pattern
                if (lowerCol2.includes(keyword)) {
                    mapping[col1] = col2;
                    console.log(`Mapped by type (${keyword}): ${col1} -> ${col2}`);
                    break;
                }
            }
        }
    }
    
    // Helper for special cases like units_dead -> Units Healed
    tryMapSpecialCase(sheet1, sheet2, mapping, sheet1Patterns, sheet2Patterns) {
        // Find columns in sheet1 that match sheet1Patterns
        for (const col1 of sheet1.headers) {
            // Skip if already mapped
            if (mapping[col1]) continue;
            
            const lowerCol1 = col1.toLowerCase();
            const matchesSheet1Pattern = sheet1Patterns.some(pattern => 
                lowerCol1.includes(pattern.toLowerCase())
            );
            
            if (matchesSheet1Pattern) {
                // Find corresponding column in sheet2 that matches sheet2Patterns
                for (const col2 of sheet2.headers) {
                    const lowerCol2 = col2.toLowerCase();
                    const matchesSheet2Pattern = sheet2Patterns.some(pattern => 
                        lowerCol2.includes(pattern.toLowerCase())
                    );
                    
                    if (matchesSheet2Pattern) {
                        mapping[col1] = col2;
                        console.log(`Mapped special case: ${col1} -> ${col2}`);
                        break;
                    }
                }
            }
        }
    }
    
    // Render the column mapping UI
    renderMappingUI(sheet1, sheet2, allColumnsIdentical = false) {
        const mappingId = `${sheet1.id}-${sheet2.id}`;
        const mapping = this.mappings.get(mappingId) || {};
        
        // Get container or create if it doesn't exist
        let mappingContainer = document.getElementById('columnMappingContainer');
        if (!mappingContainer) {
            mappingContainer = document.createElement('div');
            mappingContainer.id = 'columnMappingContainer';
            mappingContainer.className = 'column-mapping-container';
            
            // Insert before the filter-section
            const filterSection = document.querySelector('.filter-section');
            if (filterSection) {
                filterSection.parentNode.insertBefore(mappingContainer, filterSection);
            }
        }
        
        // If all columns are identical, show simplified interface
        if (allColumnsIdentical) {
            mappingContainer.innerHTML = `
                <div class="mapping-header">
                    <h3>Columns automatically mapped</h3>
                    <p style="color: #2ecc71;">All columns in both sheets have identical names. Comparison is ready!</p>
                </div>
            `;
            return;
        }
        
        // Get the ID columns for both sheets
        const sheet1IdColumn = findIdColumn(sheet1.headers);
        const sheet2IdColumn = findIdColumn(sheet2.headers);
        
        // Generate the mapping UI HTML
        let html = `
            <div class="mapping-header">
                <h3>Map columns between sheets</h3>
                <p>Select columns to compare between sheets with different column names.</p>
            </div>
            <div class="mapping-controls">
                <button id="showMappingBtn" class="btn" style="background-color: #f39c12; color: white; font-weight: bold;">Show/Hide Column Mapping</button>
                <button id="resetMappingBtn" class="btn">Reset to Default</button>
            </div>
            <div id="mappingPairsContainer" class="mapping-pairs" style="display: none;">
                <div class="sheets-info">
                    <div class="sheet-info">${sheet1.displayName || sheet1.name}</div>
                    <div class="sheet-info">${sheet2.displayName || sheet2.name}</div>
                </div>
                
                <!-- ID Column Mapping (Required) -->
                <div class="mapping-section">
                    <h4>ID Column (Required)</h4>
                    <p class="mapping-description">Select the ID columns to match rows between sheets</p>
                    
                    <div class="mapping-row key-mapping-row">
                        <div class="col-select col-select-sheet1">
                            <select id="sheet1KeyColumn" class="mapping-select">
                                <option value="">-- Select ID Column --</option>
        `;
        
        // Add sheet1 ID column options
        sheet1.headers.forEach(col => {
            const isIdCol = col.toLowerCase().includes('id');
            const selected = col === sheet1IdColumn ? 'selected' : '';
            const extraClass = isIdCol ? 'id-column-option' : '';
            html += `<option value="${col}" ${selected} class="${extraClass}">${col}</option>`;
        });
        
        html += `
                            </select>
                        </div>
                        <div class="map-arrow">↔️</div>
                        <div class="col-select col-select-sheet2">
                            <select id="sheet2KeyColumn" class="mapping-select">
                                <option value="">-- Select ID Column --</option>
        `;
        
        // Add sheet2 ID column options
        sheet2.headers.forEach(col => {
            const isIdCol = col.toLowerCase().includes('id');
            const selected = col === sheet2IdColumn ? 'selected' : '';
            const extraClass = isIdCol ? 'id-column-option' : '';
            html += `<option value="${col}" ${selected} class="${extraClass}">${col}</option>`;
        });
        
        html += `
                            </select>
                        </div>
                    </div>
                </div>
                
                <!-- Data Column Mappings -->
                <div class="mapping-section">
                    <h4>Data Columns</h4>
                    <p class="mapping-description">Add columns you want to compare</p>
                    
                    <div id="dataMappingRows" class="data-mapping-rows">
        `;
        
        // Add existing mappings (excluding ID column mapping)
        const idMapping = {};
        if (sheet1IdColumn && sheet2IdColumn) {
            idMapping[sheet1IdColumn] = sheet2IdColumn;
        }
        
        let hasDataMappings = false;
        for (const [col1, col2] of Object.entries(mapping)) {
            // Skip ID column mapping (handled separately)
            if (col1 === sheet1IdColumn && col2 === sheet2IdColumn) continue;
            
            hasDataMappings = true;
            html += `<div class="mapping-row data-mapping-row">`;
            html += createDataMappingRow(sheet1.headers, sheet2.headers, col1, col2);
            html += `</div>`;
        }
        
        // If no data mappings exist, add an empty one
        if (!hasDataMappings) {
            html += `<div class="mapping-row data-mapping-row">`;
            html += createDataMappingRow(sheet1.headers, sheet2.headers);
            html += `</div>`;
        }
        
        html += `
                    </div>
                    
                    <div class="mapping-row-actions">
                        <button id="addMappingRowBtn" class="btn">
                            <span style="font-size: 16px; margin-right: 5px;">+</span> Add Column Mapping
                        </button>
                    </div>
                </div>
                
                <div class="mapping-actions">
                    <button id="applyMappingBtn" class="btn">Apply Mapping</button>
                </div>
            </div>
        `;
        
        mappingContainer.innerHTML = html;
        
        // Add event listeners
        const showMappingBtn = document.getElementById('showMappingBtn');
        const resetMappingBtn = document.getElementById('resetMappingBtn');
        const applyMappingBtn = document.getElementById('applyMappingBtn');
        const addMappingRowBtn = document.getElementById('addMappingRowBtn');
        const mappingPairsContainer = document.getElementById('mappingPairsContainer');
        
        if (showMappingBtn) {
            showMappingBtn.addEventListener('click', () => {
                if (mappingPairsContainer) {
                    const currentDisplay = mappingPairsContainer.style.display;
                    const newDisplay = currentDisplay === 'none' ? 'block' : 'none';
                    
                    // Update visibility state
                    mappingPairsContainer.style.display = newDisplay;
                    
                    // Save state to appState
                    appState.showColumnMapping = newDisplay === 'block';
                    
                    // Update URL to persist this setting
                    updateURLWithConfig();
                }
            });
        }
        
        if (resetMappingBtn) {
            resetMappingBtn.addEventListener('click', () => {
                this.createDefaultMapping(sheet1, sheet2);
                this.renderMappingUI(sheet1, sheet2);
            });
        }
        
        if (addMappingRowBtn) {
            addMappingRowBtn.addEventListener('click', () => {
                const dataMappingRows = document.getElementById('dataMappingRows');
                if (dataMappingRows) {
                    // Create a container div first with proper styling
                    const newRow = document.createElement('div');
                    newRow.className = 'mapping-row data-mapping-row';
                    
                    // Insert HTML content - WITHOUT the outer div since we just created it
                    newRow.innerHTML = createDataMappingRow(sheet1.headers, sheet2.headers);
                    
                    // Apply animation effect for better UX
                    newRow.style.opacity = '0';
                    newRow.style.transform = 'translateY(10px)';
                    dataMappingRows.appendChild(newRow);
                    
                    // Trigger animation after DOM insertion
                    setTimeout(() => {
                        newRow.style.transition = 'all 0.3s ease';
                        newRow.style.opacity = '1';
                        newRow.style.transform = 'translateY(0)';
                    }, 10);
                    
                    // Add event listener to the remove button
                    const removeBtn = newRow.querySelector('.remove-mapping-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function() {
                            // Animate removal
                            const row = this.closest('.data-mapping-row');
                            row.style.transition = 'all 0.3s ease';
                            row.style.opacity = '0';
                            row.style.transform = 'translateY(-10px)';
                            setTimeout(() => {
                                row.remove();
                            }, 300);
                        });
                    }
                }
            });
        }
        
        if (applyMappingBtn) {
            applyMappingBtn.addEventListener('click', () => {
                this.saveCurrentMapping();
                this.applyMapping();
                
                // Hide the mapping UI after applying
                if (mappingPairsContainer) {
                    mappingPairsContainer.style.display = 'none';
                }
                
                // Update UI and URL
                applyFilters();
                updateURLWithConfig();
            });
        }
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-mapping-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('.data-mapping-row');
                if (row) {
                    // Animate removal - same animation as for newly added rows
                    row.style.transition = 'all 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        row.remove();
                    }, 300);
                }
            });
        });
        
        // Helper function to find ID column
        function findIdColumn(headers) {
            const idCols = ['governor_id', 'lord_id', 'player_id', 'id', 'Lord Id'];
            
            for (const col of idCols) {
                if (headers.includes(col)) {
                    return col;
                }
            }
            
            // Try case-insensitive comparison
            for (const header of headers) {
                if (header.toLowerCase().includes('id')) {
                    return header;
                }
            }
            
            return headers[0];
        }
        
        // Helper function to create data mapping row HTML
        function createDataMappingRow(sheet1Headers, sheet2Headers, selectedCol1 = '', selectedCol2 = '') {
            let html = `
                <div class="col-select col-select-sheet1">
                    <select class="mapping-select data-col1-select">
                        <option value="">-- Select Column --</option>
            `;
            
            // Add sheet1 column options
            sheet1Headers.forEach(col => {
                // Skip ID columns as they are handled separately
                if (col.toLowerCase().includes('id')) return;
                
                const selected = col === selectedCol1 ? 'selected' : '';
                html += `<option value="${col}" ${selected}>${col}</option>`;
            });
            
            html += `
                    </select>
                </div>
                <div class="map-arrow">↔️</div>
                <div class="col-select col-select-sheet2">
                    <select class="mapping-select data-col2-select">
                        <option value="">-- Select Column --</option>
            `;
            
            // Add sheet2 column options
            sheet2Headers.forEach(col => {
                // Skip ID columns as they are handled separately
                if (col.toLowerCase().includes('id')) return;
                
                const selected = col === selectedCol2 ? 'selected' : '';
                html += `<option value="${col}" ${selected}>${col}</option>`;
            });
            
            html += `
                    </select>
                </div>
                <div class="mapping-row-action">
                    <button class="remove-mapping-btn">✖</button>
                </div>
            `;
            
            return html;
        }
    }
    
    // Save the current mapping from the UI
    saveCurrentMapping() {
        if (!this.activeMappingId) return;
        
        const mapping = {};
        
        // Save ID column mapping
        const sheet1KeyColumn = document.getElementById('sheet1KeyColumn');
        const sheet2KeyColumn = document.getElementById('sheet2KeyColumn');
        
        if (sheet1KeyColumn && sheet2KeyColumn && 
            sheet1KeyColumn.value && sheet2KeyColumn.value) {
            mapping[sheet1KeyColumn.value] = sheet2KeyColumn.value;
            console.log(`Mapped key columns: ${sheet1KeyColumn.value} -> ${sheet2KeyColumn.value}`);
        } else {
            console.error('ID column mapping is required');
            // Show error message
            const statusDiv = document.getElementById('loadingStatus');
            if (statusDiv) {
                statusDiv.textContent = 'Error: ID column mapping is required';
                statusDiv.style.color = '#e74c3c';
                
                // Clear message after 3 seconds
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 3000);
            }
            return;
        }
        
        // Save data column mappings
        const dataMappingRows = document.querySelectorAll('.data-mapping-row');
        dataMappingRows.forEach(row => {
            const col1Select = row.querySelector('.data-col1-select');
            const col2Select = row.querySelector('.data-col2-select');
            
            if (col1Select && col2Select && 
                col1Select.value && col2Select.value) {
                mapping[col1Select.value] = col2Select.value;
                console.log(`Mapped data columns: ${col1Select.value} -> ${col2Select.value}`);
            }
        });
        
        // Save mapping
        if (Object.keys(mapping).length > 0) {
            this.mappings.set(this.activeMappingId, mapping);
            console.log(`Saved mapping for ${this.activeMappingId}:`, mapping);
        }
    }
    
    applyMapping() {
        if (!this.activeMappingId) return;
        
        const mapping = this.mappings.get(this.activeMappingId);
        if (!mapping) return;
        
        console.log('Applying mapping:', mapping);
        
        // Show status message
        const statusDiv = document.getElementById('loadingStatus');
        if (statusDiv) {
            statusDiv.textContent = 'Applying column mapping...';
            statusDiv.style.color = '#3498db';
        }
        
        // Update the appState with the mapping information
        appState.columnMapping = mapping;
        
        // Update visible columns based on the mapping
        this.updateVisibleColumns(mapping);
        
        // Recalculate changes with the new mapping
        if (this.activeMappingId) {
            const sheetManager = window.sheetManager;
            if (sheetManager) {
                sheetManager.recalculateChangesWithMapping(this.activeMappingId);
            }
        }
        
        // Update status message
        setTimeout(() => {
            if (statusDiv) {
                statusDiv.textContent = 'Column mapping applied successfully!';
                statusDiv.style.color = '#2ecc71';
                
                // Clear message after 3 seconds
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 3000);
            }
        }, 500);
    }
    
    // Update the visible columns in the UI based on the mapping
    updateVisibleColumns(mapping) {
        // Get the columns that have been mapped
        const mappedColumns = Object.keys(mapping);
        
        // Update the current columns in appState to only show mapped columns
        if (mappedColumns.length > 0) {
            appState.currentColumns = mappedColumns;
        }
        
        // Update the column filter UI
        this.updateColumnFilterUI(mappedColumns);
        
        // Since we've applied mapping, automatically update 'Select columns to display'
        // to only show the mapped columns
        this.autoSelectMappedColumns(mappedColumns);
    }
    
    // Update the column filter UI to reflect mapped columns
    updateColumnFilterUI(mappedColumns) {
        const columnFilter = document.getElementById('columnsFilter');
        if (!columnFilter) return;
        
        // Check/uncheck columns based on mapping
        const checkboxes = columnFilter.querySelectorAll('input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            const columnName = checkbox.value;
            const chip = checkbox.closest('.column-chip');
            const checkmark = chip?.querySelector('.checkmark');
            
            const isSelected = mappedColumns.includes(columnName);
            checkbox.checked = isSelected;
            
            // Update chip UI
            if (chip) {
                if (isSelected) {
                    chip.classList.add('selected');
                    if (checkmark) checkmark.style.display = '';
                } else {
                    chip.classList.remove('selected');
                    if (checkmark) checkmark.style.display = 'none';
                }
            }
        });
        
        // Apply column ordering if needed
        if (appState.currentColumns && appState.currentColumns.length > 0) {
            // Re-order the chips to match the order in appState.currentColumns
            const orderedColumns = [...appState.currentColumns];
            const chips = Array.from(columnFilter.querySelectorAll('.column-chip'));
            
            // Sort chips based on the order in orderedColumns
            chips.sort((a, b) => {
                const aIndex = orderedColumns.indexOf(a.dataset.value);
                const bIndex = orderedColumns.indexOf(b.dataset.value);
                return aIndex - bIndex;
            });
            
            // Re-append chips in the correct order
            chips.forEach(chip => columnFilter.appendChild(chip));
        }
    }
    
    // Automatically select mapped columns in "Select columns to display"
    autoSelectMappedColumns(mappedColumns) {
        const columnFilter = document.getElementById('columnsFilter');
        if (!columnFilter) return;
        
        // First, uncheck all columns and update chip UI
        columnFilter.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            
            // Update chip UI
            const chip = cb.closest('.column-chip');
            const checkmark = chip?.querySelector('.checkmark');
            
            if (chip) {
                chip.classList.remove('selected');
                if (checkmark) checkmark.style.display = 'none';
            }
        });
        
        // Then, check only mapped columns and update chip UI
        for (const col of mappedColumns) {
            const checkbox = columnFilter.querySelector(`input[value="${col}"]`);
            if (checkbox) {
                checkbox.checked = true;
                
                // Update chip UI
                const chip = checkbox.closest('.column-chip');
                const checkmark = chip?.querySelector('.checkmark');
                
                if (chip) {
                    chip.classList.add('selected');
                    if (checkmark) checkmark.style.display = '';
                }
            }
        }
        
        // Show a message to inform user about automatic column selection
        const statusDiv = document.getElementById('loadingStatus');
        if (statusDiv) {
            statusDiv.textContent = 'Mapped columns have been automatically selected for display';
            statusDiv.style.color = '#2ecc71';
            
            // Clear message after 3 seconds
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
        }
    }
    
    // Get the mapped column name for comparison
    getMappedColumn(sheet1Id, sheet2Id, columnName) {
        const mappingId = `${sheet1Id}-${sheet2Id}`;
        const mapping = this.mappings.get(mappingId);
        
        if (mapping && mapping[columnName]) {
            return mapping[columnName];
        }
        
        return columnName; // Return original if no mapping exists
    }
    
    // Check if mapping exists for two sheets
    hasMappingFor(sheet1Id, sheet2Id) {
        const mappingId = `${sheet1Id}-${sheet2Id}`;
        return this.mappings.has(mappingId);
    }
    
    // Hide the mapping UI container
    hideMappingUI() {
        const container = document.getElementById('columnMappingContainer');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    // Show the mapping UI container
    showMappingUI() {
        const container = document.getElementById('columnMappingContainer');
        if (container) {
            container.style.display = 'block';
        }
    }
    
    // Hide just the mapping pairs (detail section)
    hideMappingPairs() {
        const mappingPairs = document.getElementById('mappingPairsContainer');
        if (mappingPairs) {
            mappingPairs.style.display = 'none';
        }
    }
    
    // Show just the mapping pairs (detail section)
    showMappingPairs() {
        const mappingPairs = document.getElementById('mappingPairsContainer');
        if (mappingPairs) {
            mappingPairs.style.display = 'block';
        }
    }
}

// Create global instance
export const columnMapper = new ColumnMapper();

// Expose to window for event handlers
window.columnMapper = columnMapper;
