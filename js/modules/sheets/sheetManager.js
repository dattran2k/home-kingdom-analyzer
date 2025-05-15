// Sheet tabs and changes management module
import { appState } from '../state.js';
import { renderTable } from '../tableRenderer.js';
import { updateStats } from '../statistics.js';
import { applyFilters } from '../filtering.js';
import { updateURLWithConfig, initializeUIElements, formatNumber } from '../ui.js';

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
        } else {
            // Clear other changes and select only this one
            this.selectedChanges.clear();
            this.selectedChanges.add(changeId);
        }
        
        appState.selectedChanges = this.selectedChanges;
        
        this.updateDisplay();
        this.updateUI(); // Update UI to show active state
        updateURLWithConfig();
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
    
    calculateChangesBetweenSheets(sheet1, sheet2) {
        const changes = new Map();
        
        // Create mapping by governor_id for quick lookup
        const sheet1Map = new Map();
        const sheet2Map = new Map();
        
        sheet1.data.forEach(row => {
            const id = this.getRowId(row);
            if (id) sheet1Map.set(id, row);
        });
        
        sheet2.data.forEach(row => {
            const id = this.getRowId(row);
            if (id) sheet2Map.set(id, row);
        });
        
        // Process all players from both sheets
        const allPlayerIds = new Set([...sheet1Map.keys(), ...sheet2Map.keys()]);
        
        for (const id of allPlayerIds) {
            const row1 = sheet1Map.get(id);
            const row2 = sheet2Map.get(id);
            
            // Get the most recent data for non-numeric fields
            const currentRow = row2 || row1;
            const changeRow = {};
            
            // Copy all non-numeric fields from current data
            const numericColumns = this.getNumericColumns(sheet1.headers);
            sheet1.headers.forEach(col => {
                if (!numericColumns.includes(col)) {
                    changeRow[col] = currentRow[col];
                }
            });
            
            // Calculate numeric changes
            numericColumns.forEach(col => {
                const val1 = row1 ? (parseFloat(row1[col]) || 0) : 0;
                const val2 = row2 ? (parseFloat(row2[col]) || 0) : 0;
                const diff = val2 - val1;
                
                // Debug log for checking values
                if (diff !== 0 && Math.abs(diff) > 0.001) {
                    console.log(`Column: ${col}, Val1: ${val1}, Val2: ${val2}, Diff: ${diff}`);
                }
                
                // Format with + or - sign
                if (diff > 0) {
                    changeRow[col] = '+' + formatNumber(diff);
                } else if (diff < 0) {
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
    
    getRowId(row) {
        // Try different possible ID columns
        const idColumns = ['governor_id', 'lord_id', 'player_id', 'id'];
        for (const col of idColumns) {
            if (row[col]) return row[col];
        }
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
        const aggregated = new Map();
        
        // In changes view, we want to show all changes directly
        // without aggregating multiple periods
        for (const changeId of this.selectedChanges) {
            const changes = this.changesBetweenSheets.get(changeId);
            if (!changes) continue;
            
            // Convert map to array directly
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
