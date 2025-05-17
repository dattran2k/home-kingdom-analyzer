// Sheet tabs and changes management module
import { appState } from '../state.js';
import { renderTable } from '../tableRenderer.js';
import { updateStats } from '../statistics.js';
import { applyFilters } from '../filtering.js';
import { updateURLWithConfig, initializeUIElements, formatNumber } from '../ui.js';
import { columnMapper } from '../mapping/columnMapper.js';

export class SheetManager {
    constructor() {
        this.sheets = [];
        this.selectedSheet = null;
        this.selectedChanges = new Set(); // For multiple change selections
        this.changesBetweenSheets = new Map(); // Map sheet1Id-sheet2Id -> changes
    }
    
    addSheet(sheetData) {
        // Check if sheet already exists
        const existingIndex = this.sheets.findIndex(s => s.url === sheetData.url && s.id === sheetData.id);
        
        if (existingIndex >= 0) {
            // Replace existing sheet
            this.sheets[existingIndex] = sheetData;
        } else {
            // Add new sheet
            this.sheets.push(sheetData);
        }
        
        // Update app state
        appState.sheets = this.sheets;
        
        this.updateUI();
        
        // Calculate changes between this sheet and all existing sheets
        this.calculateChanges();
    }
    
    clearSheets() {
        this.sheets = [];
        this.selectedSheet = null;
        this.selectedChanges.clear();
        this.changesBetweenSheets.clear();
        appState.sheets = [];
        this.updateUI();
    }
    
    selectSheet(sheetId) {
        console.log('Selecting sheet:', sheetId);
        this.selectedSheet = this.sheets.find(s => s.id === sheetId);
        this.selectedChanges.clear();
        
        if (!this.selectedSheet) {
            console.error('Sheet not found:', sheetId);
            return;
        }
        
        // Update app state
        appState.selectedSheet = sheetId;
        appState.selectedChanges = this.selectedChanges;
        
        // Clear column mapping since we're viewing a single sheet
        appState.columnMapping = null;
        
        // Hide the mapping UI if it exists
        const mappingContainer = document.getElementById('columnMappingContainer');
        if (mappingContainer) {
            mappingContainer.style.display = 'none';
        }
        
        this.updateDisplay();
        this.updateUI(); // Update UI to show active state
        updateURLWithConfig();
    }
    
    toggleChangeSelection(changeId) {
        console.log('Toggling change selection:', changeId);
        
        // Clear sheet selection when selecting changes
        this.selectedSheet = null;
        appState.selectedSheet = null;
        
        if (this.selectedChanges.has(changeId)) {
            this.selectedChanges.delete(changeId);
            // Hide the mapping UI if no changes are selected
            if (this.selectedChanges.size === 0) {
                columnMapper.hideMappingUI();
            }
        } else {
            // Clear other changes and select only this one
            this.selectedChanges.clear();
            this.selectedChanges.add(changeId);
            
            // Initialize column mapping UI for the selected change
            const [sheet1Id, sheet2Id] = changeId.split('-');
            const sheet1 = this.sheets.find(s => s.id === sheet1Id);
            const sheet2 = this.sheets.find(s => s.id === sheet2Id);
            
            if (sheet1 && sheet2) {
                // Check if sheets have identical column structures
                const identicalStructure = this.sheetsHaveIdenticalColumns(sheet1, sheet2);
                
                if (identicalStructure) {
                    console.log('Sheets have identical column structures. Mapping UI will be simplified.');
                    
                    // Show a message to the user
                    const statusDiv = document.getElementById('loadingStatus');
                    if (statusDiv) {
                        statusDiv.textContent = 'Sheets have identical column structures! Automatic comparison is ready.';
                        statusDiv.style.color = '#2ecc71';
                        
                        // Clear message after 3 seconds
                        setTimeout(() => {
                            statusDiv.textContent = '';
                        }, 3000);
                    }
                }
                
                // Initialize column mapping UI
                columnMapper.initializeMappingUI(sheet1, sheet2);
            }
        }
        
        appState.selectedChanges = this.selectedChanges;
        
        this.updateDisplay();
        this.updateUI(); // Update UI to show active state
        updateURLWithConfig();
    }
    
    // Helper to check if two sheets have identical column structures
    sheetsHaveIdenticalColumns(sheet1, sheet2) {
        // Check if headers match exactly
        if (sheet1.headers.length !== sheet2.headers.length) {
            return false;
        }
        
        // Check if all headers from sheet1 exist in sheet2
        for (const header of sheet1.headers) {
            if (!sheet2.headers.includes(header)) {
                return false;
            }
        }
        
        return true;
    }
    
    calculateChanges() {
        // Clear existing changes
        this.changesBetweenSheets.clear();
        
        // Calculate changes between consecutive sheets
        for (let i = 0; i < this.sheets.length - 1; i++) {
            const sheet1 = this.sheets[i];
            const sheet2 = this.sheets[i + 1];
            const changeId = `${sheet1.id}-${sheet2.id}`;
            
            const changes = this.calculateChangesBetweenSheets(sheet1, sheet2);
            this.changesBetweenSheets.set(changeId, changes);
        }
    }
    
    // Method to recalculate changes after column mapping has been updated
    recalculateChangesWithMapping(changeId) {
        if (!this.changesBetweenSheets.has(changeId)) return;
        
        const [sheet1Id, sheet2Id] = changeId.split('-');
        const sheet1 = this.sheets.find(s => s.id === sheet1Id);
        const sheet2 = this.sheets.find(s => s.id === sheet2Id);
        
        if (sheet1 && sheet2) {
            const changes = this.calculateChangesBetweenSheets(sheet1, sheet2);
            this.changesBetweenSheets.set(changeId, changes);
            
            if (this.selectedChanges.has(changeId)) {
                // If this change is currently selected, update the display
                this.updateDisplay();
            }
        }
    }
    
    calculateChangesBetweenSheets(sheet1, sheet2) {
        const changes = new Map();
        const mappingId = `${sheet1.id}-${sheet2.id}`;
        
        // Check if column mapping exists for these sheets
        const hasMapping = columnMapper.hasMappingFor(sheet1.id, sheet2.id);
        console.log(`Using column mapping for ${mappingId}: ${hasMapping}`);
        
        // Create mapping by governor_id or equivalent for quick lookup
        const sheet1Map = new Map();
        const sheet2Map = new Map();
        
        // Use correct ID column for each sheet
        const sheet1IdColumn = this.getIdColumn(sheet1.headers);
        let sheet2IdColumn = this.getIdColumn(sheet2.headers);
        
        // If we have column mapping, check if ID columns are mapped
        if (hasMapping) {
            const mappedIdColumn = columnMapper.getMappedColumn(sheet1.id, sheet2.id, sheet1IdColumn);
            if (mappedIdColumn && mappedIdColumn !== sheet1IdColumn) {
                sheet2IdColumn = mappedIdColumn;
                console.log(`Using mapped ID column: ${sheet1IdColumn} -> ${sheet2IdColumn}`);
            }
        }
        
        console.log(`Sheet1 ID column: ${sheet1IdColumn}, Sheet2 ID column: ${sheet2IdColumn}`);
        
        // Create maps for quick lookups using the correct ID columns
        sheet1.data.forEach(row => {
            const id = row[sheet1IdColumn];
            if (id) sheet1Map.set(id.toString(), row);
        });
        
        sheet2.data.forEach(row => {
            const id = row[sheet2IdColumn];
            if (id) sheet2Map.set(id.toString(), row);
        });
        
        // Find common IDs between both sheets
        const sheet1Ids = new Set(sheet1Map.keys());
        const sheet2Ids = new Set(sheet2Map.keys());
        const commonIds = [...sheet1Ids].filter(id => sheet2Ids.has(id));
        
        console.log(`Total unique IDs in Sheet1: ${sheet1Ids.size}`);
        console.log(`Total unique IDs in Sheet2: ${sheet2Ids.size}`);
        console.log(`Common IDs in both sheets: ${commonIds.length}`);
        
        // Process only common IDs - players that exist in both sheets
        for (const id of commonIds) {
            const row1 = sheet1Map.get(id);
            const row2 = sheet2Map.get(id);
            
            // Skip if either row doesn't exist (shouldn't happen with common IDs)
            if (!row1 || !row2) continue;
            
            const changeRow = {};
            
            // Always include the ID column
            changeRow[sheet1IdColumn] = id;
            
            // Copy over name field if it exists
            const nameColumn = this.getNameColumn(sheet1.headers);
            if (nameColumn && row1[nameColumn]) {
                changeRow[nameColumn] = row1[nameColumn];
            }
            
            // Get the numeric columns
            const numericColumns = this.getNumericColumns(sheet1.headers);
            
            // Calculate numeric changes with mapping support
            numericColumns.forEach(col => {
                // Get the mapped column name for sheet2
                const sheet2Col = hasMapping 
                    ? columnMapper.getMappedColumn(sheet1.id, sheet2.id, col) 
                    : col;
                
                // Skip columns that don't have a mapping
                if (!sheet2Col || !(sheet2Col in row2)) {
                    return;
                }
                
                // Debug log to check the mapping
                if (hasMapping && sheet2Col !== col) {
                    console.log(`Mapped column: ${col} -> ${sheet2Col}`);
                }
                
                // Get values from both sheets using the correct column names
                let val1 = 0;
                let val2 = 0;
                
                // Ensure we have the rows and the columns exist
                if (col in row1) {
                    // Parse numeric value from sheet1, handle formatting with commas
                    const rawVal1 = row1[col];
                    if (typeof rawVal1 === 'string') {
                        // Remove commas and then parse
                        val1 = parseFloat(rawVal1.replace(/,/g, '')) || 0;
                    } else {
                        val1 = parseFloat(rawVal1) || 0;
                    }
                }
                
                if (sheet2Col in row2) {
                    // Parse numeric value from sheet2, handle formatting with commas
                    const rawVal2 = row2[sheet2Col];
                    if (typeof rawVal2 === 'string') {
                        // Remove commas and then parse
                        val2 = parseFloat(rawVal2.replace(/,/g, '')) || 0;
                    } else {
                        val2 = parseFloat(rawVal2) || 0;
                    }
                }
                
                // Log the values for debugging
                console.log(`ID: ${id}, Column: ${col} -> ${sheet2Col}, Val1: ${val1}, Val2: ${val2}`);
                
                // Calculate the actual difference
                const diff = val2 - val1;
                
                // Format with + or - sign
                if (diff > 0) {
                    changeRow[col] = '+' + formatNumber(diff);
                } else if (diff < 0) {
                    // Use formatted number which already has the minus sign
                    changeRow[col] = formatNumber(diff);
                } else {
                    changeRow[col] = '0';
                }
            });
            
            // Mark this as a change row
            changeRow.is_change_row = true;
            changes.set(id, changeRow);
        }
        
        return changes;
    }
    
    // Determine the ID column in a list of headers
    getIdColumn(headers) {
        // Priority order for ID columns
        const idColumns = ['governor_id', 'lord_id', 'player_id', 'id', 'Lord Id'];
        
        // Find the first matching column (case sensitive check)
        for (const col of idColumns) {
            if (headers.includes(col)) {
                return col;
            }
        }
        
        // If not found, try case-insensitive check
        for (const col of idColumns) {
            for (const header of headers) {
                if (header.toLowerCase() === col.toLowerCase() || 
                    header.toLowerCase().replace(/[_\s]/g, '') === col.toLowerCase().replace(/[_\s]/g, '')) {
                    return header;
                }
            }
        }
        
        // If no standard ID column found, try to find any column containing 'id'
        for (const header of headers) {
            if (header.toLowerCase().includes('id')) {
                return header;
            }
        }
        
        // Fallback to first column if no ID column found
        return headers[0];
    }
    
    // Find the name column in a list of headers
    getNameColumn(headers) {
        // Priority order for name columns
        const nameColumns = ['governor_name', 'lord_name', 'player_name', 'name', 'Lord Name'];
        
        // Find the first matching column (case sensitive check)
        for (const col of nameColumns) {
            if (headers.includes(col)) {
                return col;
            }
        }
        
        // If not found, try case-insensitive check
        for (const col of nameColumns) {
            for (const header of headers) {
                if (header.toLowerCase() === col.toLowerCase() || 
                    header.toLowerCase().replace(/[_\s]/g, '') === col.toLowerCase().replace(/[_\s]/g, '')) {
                    return header;
                }
            }
        }
        
        // If no standard name column found, try to find any column containing 'name'
        // but not containing 'alliance' or 'guild'
        for (const header of headers) {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('name') && 
                !lowerHeader.includes('alliance') && 
                !lowerHeader.includes('guild')) {
                return header;
            }
        }
        
        // Return null if no name column found
        return null;
    }
    
    getNumericColumns(headers) {
        const nonNumericPatterns = ['id', 'name', 'tag', 'kingdom', 'server'];
        return headers.filter(header => {
            const lowerHeader = header.toLowerCase();
            const isIdColumn = lowerHeader.includes('id');
            const isNonNumeric = nonNumericPatterns.some(pattern => lowerHeader.includes(pattern));
            return !isIdColumn && !isNonNumeric;
        });
    }
    
    updateUI() {
        const container = document.getElementById('sheetTabsContainer');
        if (!container) {
            this.createTabsContainer();
            return;
        }
        
        let html = '<div class="sheet-tabs">';
        
        // Render sheet tabs with changes in between
        for (let i = 0; i < this.sheets.length; i++) {
            const sheet = this.sheets[i];
            const isSelected = this.selectedSheet && this.selectedSheet.id === sheet.id;
            
            // Add sheet tab
            html += `
                <div class="sheet-tab ${isSelected ? 'active' : ''}" 
                     data-sheet-id="${sheet.id}"
                     onclick="window.sheetManager.selectSheet('${sheet.id}')">
                    ${sheet.displayName || sheet.name}
                </div>
            `;
            
            // Add change tab if not the last sheet
            if (i < this.sheets.length - 1) {
                const nextSheet = this.sheets[i + 1];
                const changeId = `${sheet.id}-${nextSheet.id}`;
                const isChangeSelected = this.selectedChanges.has(changeId);
                
                html += `
                    <div class="change-tab ${isChangeSelected ? 'active' : ''}" 
                         data-change-id="${changeId}"
                         onclick="window.sheetManager.toggleChangeSelection('${changeId}')">
                        <span class="change-icon">↔️</span>
                        Changes
                    </div>
                `;
            }
        }
        
        html += '</div>';
        
        // Add info about multiple selections if any
        if (this.selectedChanges.size > 0) {
            const changeIds = Array.from(this.selectedChanges);
            html += `
                <div class="changes-info">
                    Viewing changes: ${changeIds.join(', ')}
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    createTabsContainer() {
        const mainContent = document.getElementById('mainContent');
        const controlsDiv = document.querySelector('.controls');
        
        if (!controlsDiv) return;
        
        const container = document.createElement('div');
        container.id = 'sheetTabsContainer';
        container.className = 'sheet-tabs-container';
        
        mainContent.insertBefore(container, controlsDiv);
        this.updateUI();
    }
    
    updateDisplay() {
        console.log('Updating display');
        
        // First ensure all elements are visible
        const dataTable = document.querySelector('.data-table');
        const statsContainer = document.getElementById('statsContainer');
        const colorLegendEl = document.querySelector('.color-legend');
        
        if (dataTable) dataTable.style.display = 'block';
        if (statsContainer) statsContainer.style.display = 'grid';
        if (colorLegendEl) colorLegendEl.style.display = 'flex';
        
        // Swap legends based on view type
        const colorLegend = document.getElementById('colorLegend');
        const changeLegend = document.getElementById('changeLegend');
        
        if (this.selectedSheet) {
            // Show normal legend for sheet view
            if (colorLegend) colorLegend.style.display = 'flex';
            if (changeLegend) changeLegend.style.display = 'none';
            
            console.log('Selected sheet data:', this.selectedSheet.data.length, 'rows');
            console.log('Selected sheet headers:', this.selectedSheet.headers);
            
            appState.allData = this.selectedSheet.data;
            appState.data = this.selectedSheet.data;
            appState.headers = this.selectedSheet.headers;
            
            // Initialize UI elements with the new data
            initializeUIElements(appState.allData, true);
            
            // Apply column selection from URL if available
            const urlParams = new URLSearchParams(window.location.search);
            const columns = urlParams.get('columns');
            if (columns) {
                const selectedColumns = columns.split(',');
                appState.currentColumns = selectedColumns.filter(col => appState.headers.includes(col));
                console.log('Setting columns from URL:', appState.currentColumns);
            } else {
                // Set current columns to all headers by default
                appState.currentColumns = appState.headers;
            }
            
            // Hide no changes message if it exists
            const noChangesMsg = document.getElementById('noChangesMessage');
            if (noChangesMsg) {
                noChangesMsg.style.display = 'none';
            }
            
        } else if (this.selectedChanges.size > 0) {
            // Show change legend for changes view
            if (colorLegend) colorLegend.style.display = 'none';
            if (changeLegend) changeLegend.style.display = 'flex';
            
            // Aggregate changes from all selected change periods
            const aggregatedData = this.aggregateChanges();
            
            if (aggregatedData.length === 0) {
                // No changes found
                console.log('No changes found between selected sheets');
                this.showNoChangesMessage();
                appState.allData = [];
                appState.data = [];
                appState.headers = [];
                appState.currentColumns = [];
                return;
            }
            
            appState.allData = aggregatedData;
            appState.data = aggregatedData;
            appState.headers = this.getChangeHeaders();
            
            // Initialize UI elements with the change data
            initializeUIElements(appState.allData, true);
            
            // Set current columns to all headers if not already set
            if (appState.currentColumns.length === 0) {
                appState.currentColumns = appState.headers;
            }
            
            // Hide no changes message if it exists
            const noChangesMsg = document.getElementById('noChangesMessage');
            if (noChangesMsg) {
                noChangesMsg.style.display = 'none';
            }
        }
        
        console.log('Final current columns:', appState.currentColumns);
        
        // Apply filters to show data immediately without resetting filters
        applyFilters();
    }
    
    aggregateChanges() {
        // In changes view, we want to show all changes directly
        // without aggregating multiple periods
        for (const changeId of this.selectedChanges) {
            const changes = this.changesBetweenSheets.get(changeId);
            if (!changes) continue;
            
            // Check if we have column mapping
            if (appState.columnMapping && Object.keys(appState.columnMapping).length > 0) {
                console.log('Using column mapping for aggregated changes');
                
                // Filter which columns to return based on mapping
                const mappedColumns = Object.keys(appState.columnMapping);
                console.log('Mapped columns:', mappedColumns);
                
                // Get the ID column 
                const idColumn = this.getIdColumn(mappedColumns);
                const nameColumn = this.getNameColumn(mappedColumns);
                
                // Convert map to array with mapped columns
                const result = Array.from(changes.values()).map(row => {
                    // Create new row with only mapped columns
                    const mappedRow = {};
                    
                    // Copy ID and special flags
                    mappedRow.is_change_row = row.is_change_row;
                    
                    // Always include the ID column if it exists
                    if (idColumn && row[idColumn]) {
                        mappedRow[idColumn] = row[idColumn];
                    }
                    
                    // Always include name column if available
                    if (nameColumn && row[nameColumn]) {
                        mappedRow[nameColumn] = row[nameColumn];
                    }
                    
                    // Copy mapped columns
                    for (const col of mappedColumns) {
                        // Skip ID and name columns (already handled)
                        if (col === idColumn || col === nameColumn) continue;
                        
                        if (row[col] !== undefined) {
                            mappedRow[col] = row[col];
                        }
                    }
                    
                    return mappedRow;
                });
                
                // Filter out any rows that don't have the ID column
                return result.filter(row => {
                    if (!idColumn) return true;
                    return row[idColumn] !== undefined;
                });
            }
            
            // If no mapping, just return all changes
            return Array.from(changes.values());
        }
        
        return [];
    }
    
    showNoChangesMessage() {
        // Hide table and stats
        const dataTable = document.querySelector('.data-table');
        const statsContainer = document.getElementById('statsContainer');
        const colorLegend = document.getElementById('colorLegend');
        const changeLegend = document.getElementById('changeLegend');
        
        if (dataTable) dataTable.style.display = 'none';
        if (statsContainer) statsContainer.style.display = 'none';
        if (colorLegend) colorLegend.style.display = 'none';
        if (changeLegend) changeLegend.style.display = 'none';
        
        // Show or create no changes message
        let noChangesMsg = document.getElementById('noChangesMessage');
        if (!noChangesMsg) {
            noChangesMsg = document.createElement('div');
            noChangesMsg.id = 'noChangesMessage';
            noChangesMsg.className = 'no-changes-message';
            
            const mainContent = document.getElementById('mainContent');
            const tableContainer = document.querySelector('.data-table');
            if (mainContent && tableContainer) {
                mainContent.insertBefore(noChangesMsg, tableContainer);
            }
        }
        
        const changeIds = Array.from(this.selectedChanges)[0];
        const [sheet1Id, sheet2Id] = changeIds.split('-');
        const sheet1 = this.sheets.find(s => s.id === sheet1Id);
        const sheet2 = this.sheets.find(s => s.id === sheet2Id);
        
        noChangesMsg.innerHTML = `
            <div>🔍 No changes detected between:</div>
            <div style="margin-top: 10px;">
                <strong>${sheet1?.displayName || sheet1?.name || sheet1Id}</strong>
                <span style="margin: 0 10px;">→</span>
                <strong>${sheet2?.displayName || sheet2?.name || sheet2Id}</strong>
            </div>
            <div style="margin-top: 10px; font-size: 0.9em; color: #95a5a6;">
                The data in these two sheets appears to be identical.
            </div>
        `;
        noChangesMsg.style.display = 'block';
    }

    getChangeHeaders() {
        // Get headers from the first change data
        if (this.changesBetweenSheets.size === 0) return [];
        
        const firstChange = Array.from(this.changesBetweenSheets.values())[0];
        if (firstChange.size === 0) return [];
        
        const firstPlayer = Array.from(firstChange.values())[0];
        return Object.keys(firstPlayer);
    }
}

// Create global instance
export const sheetManager = new SheetManager();

// Expose to window for event handlers
window.sheetManager = sheetManager;
