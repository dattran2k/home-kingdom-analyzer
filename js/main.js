// Main application entry point
import { initializeFileHandlers, loadRepoFile } from './modules/fileHandler.js';
import { initializeFilterHandlers, applyFilters } from './modules/filtering.js';
import { resetSort } from './modules/sorting.js';
import { 
    selectAllColumns, 
    clearAllColumns,
    createSheetUI, 
    updateURLWithConfig,
    loadConfigFromURL
} from './modules/ui.js';
import { columnMapper } from './modules/mapping/columnMapper.js';
import { chartToggle } from './components/ChartToggle.js';
import { loadMultipleSheets as loadMultipleSheetsAsync } from './modules/sheets/googleSheetsLoader.js';
import { sheetManager } from './modules/sheets/sheetManager.js';
import { chartManager } from './modules/charts/chartManager.js';
import { chartContainer } from './modules/charts/components/ConfigurableCharts/index.js';
import { appState, resetState, updateState } from './modules/state.js';

// Add a new URL input row - define globally at the start
function addSheetUrlRow() {
    const container = document.getElementById('sheetUrlsContainer');
    if (!container) return;
    
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
}

// Make function available globally immediately
window.addSheetUrlRow = addSheetUrlRow;

// Load all sheets from the URL inputs
async function loadAllSheets(fromURL = false) {
    console.log('loadAllSheets called, fromURL:', fromURL);
    
    const urlInputs = document.querySelectorAll('.sheet-url-input');
    const urls = Array.from(urlInputs)
        .map(input => input.value.trim())
        .filter(url => url !== '');
    
    console.log('URLs to load:', urls);
    
    if (urls.length === 0) {
        if (!fromURL) {
            const statusDiv = document.getElementById('loadingStatus');
            if (statusDiv) {
                statusDiv.textContent = 'Please enter at least one Google Sheet URL';
                statusDiv.style.color = '#e74c3c';
            }
        }
        return;
    }
    
    const statusDiv = document.getElementById('loadingStatus');
    if (statusDiv) {
        statusDiv.textContent = 'Loading sheets...';
        statusDiv.style.color = '#3498db';
    }
    
    // Save current filter state
    const preserveFilters = appState.sheets.length > 0 && !fromURL;
    
    try {
        const result = await loadMultipleSheetsAsync(urls);
        
        // Clear existing sheets before adding new ones
        sheetManager.clearSheets();
        
        // Reset state but keep filters
        resetState();
        
        // Add all sheets to manager
        result.sheets.forEach(sheet => {
            sheetManager.addSheet(sheet);
        });
        
        // Apply selection based on URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const selectedSheet = urlParams.get('selected');
        const changes = urlParams.get('changes');
        
        // Delay selection to ensure sheets are ready
        setTimeout(() => {
            if (changes) {
                // Handle changes selection
                const changeIds = changes.split(',');
                console.log('Applying changes from URL:', changeIds);
                changeIds.forEach(id => {
                    sheetManager.toggleChangeSelection(id);
                });
                
                // If we have mapping in the URL and there's only one change id,
                // initialize column mapping UI
                if (urlParams.get('mapping') && changeIds.length === 1) {
                    const [sheet1Id, sheet2Id] = changeIds[0].split('-');
                    const sheet1 = sheetManager.sheets.find(s => s.id === sheet1Id);
                    const sheet2 = sheetManager.sheets.find(s => s.id === sheet2Id);
                    
                    if (sheet1 && sheet2) {
                        columnMapper.initializeMappingUI(sheet1, sheet2);
                    }
                }
            } else if (selectedSheet) {
                // Handle sheet selection
                console.log('Selecting sheet from URL:', selectedSheet);
                sheetManager.selectSheet(selectedSheet);
            } else if (result.sheets.length > 0) {
                // Default to first sheet
                sheetManager.selectSheet(result.sheets[0].id);
            }
        }, 200);
        
        if (result.errors.length > 0) {
            let errorMsg = `Loaded ${result.sheets.length} sheets successfully.`;
            if (result.errors.length > 0) {
                errorMsg += ` Failed to load ${result.errors.length} sheets.`;
            }
            if (statusDiv) {
                statusDiv.textContent = errorMsg;
                statusDiv.style.color = result.sheets.length > 0 ? '#f39c12' : '#e74c3c';
            }
        } else {
            if (statusDiv) {
                statusDiv.textContent = `Loaded ${result.sheets.length} sheets successfully`;
                statusDiv.style.color = '#2ecc71';
            }
        }
        
        // Show main content
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        // Initialize UI elements and apply filters with preserve flag
        initializeFilterHandlers(preserveFilters);
        
        // Apply configurations from URL
        if (fromURL) {
            // Apply column selection from URL
            const columns = urlParams.get('columns');
            if (columns) {
                const selectedColumns = columns.split(',');
                document.querySelectorAll('#columnsFilter input[type="checkbox"]').forEach(cb => {
                    const isSelected = selectedColumns.includes(cb.value);
                    cb.checked = isSelected;
                    
                    // Update chip UI
                    const chip = cb.closest('.column-chip');
                    const checkmark = chip?.querySelector('.checkmark');
                    
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
            }
            
            // Apply column order from URL
            const columnOrder = urlParams.get('column_order');
            if (columnOrder) {
                const orderedColumns = columnOrder.split(',');
                appState.columnOrder = orderedColumns;
                
                // Reorder the chips based on the column order
                const columnsFilter = document.getElementById('columnsFilter');
                if (columnsFilter) {
                    const chips = Array.from(columnsFilter.querySelectorAll('.column-chip'));
                    
                    // Sort chips based on the column order
                    chips.sort((a, b) => {
                        const aIndex = orderedColumns.indexOf(a.dataset.value);
                        const bIndex = orderedColumns.indexOf(b.dataset.value);
                        
                        // If both values are in the ordered columns, sort by their index
                        if (aIndex !== -1 && bIndex !== -1) {
                            return aIndex - bIndex;
                        }
                        
                        // If only one value is in the ordered columns, prioritize it
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        
                        // If neither is in the ordered columns, keep the original order
                        return 0;
                    });
                    
                    // Re-append chips in the correct order
                    chips.forEach(chip => columnsFilter.appendChild(chip));
                    
                    // Update appState.currentColumns to match the new order
                    appState.currentColumns = chips
                        .filter(chip => {
                            const checkbox = chip.querySelector('input[type="checkbox"]');
                            return checkbox && checkbox.checked;
                        })
                        .map(chip => chip.dataset.value);
                }
            }
            
            // Apply filters
            applyFilters();
        } else {
            applyFilters();
            updateURLWithConfig();
        }
    } catch (error) {
        console.error('Error loading sheets:', error);
        if (statusDiv) {
            statusDiv.textContent = error.message;
            statusDiv.style.color = '#e74c3c';
        }
    }
}

// Initialize data source handlers
function initializeDataSourceHandlers() {
    // Radio button event listeners
    const googleSheetsRadio = document.getElementById('googleSheets');
    const csvFileRadio = document.getElementById('csvFile');
    
    if (googleSheetsRadio) {
        googleSheetsRadio.addEventListener('change', function() {
            if (this.checked) {
                document.getElementById('googleSheetsDiv').style.display = 'block';
                document.getElementById('csvFileDiv').style.display = 'none';
                createSheetUI();
            }
        });
    }
    
    if (csvFileRadio) {
        csvFileRadio.addEventListener('change', function() {
            if (this.checked) {
                document.getElementById('googleSheetsDiv').style.display = 'none';
                document.getElementById('csvFileDiv').style.display = 'block';
                // Remove sheet UI when using CSV
                const sheetUIContainer = document.querySelector('.sheet-ui-container');
                if (sheetUIContainer) {
                    sheetUIContainer.style.display = 'none';
                }
            }
        });
    }
    
    // Set initial state
    if (googleSheetsRadio && googleSheetsRadio.checked) {
        createSheetUI();
    }
}

// Function to load sheets from URL on startup
async function autoLoadSheetsFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const sheets = urlParams.get('sheets');
    
    if (!sheets) {
        console.log('No sheets in URL');
        return;
    }
    
    console.log('Found sheets in URL:', sheets);
    
    // Ensure Google Sheets is selected
    const googleSheetsRadio = document.getElementById('googleSheets');
    if (googleSheetsRadio) {
        googleSheetsRadio.checked = true;
        const googlesheetsDiv = document.getElementById('googleSheetsDiv');
        const csvDiv = document.getElementById('csvFileDiv');
        if (googlesheetsDiv) googlesheetsDiv.style.display = 'block';
        if (csvDiv) csvDiv.style.display = 'none';
    }
    
    // Create sheet UI if not exists
    createSheetUI();
    
    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Load configuration from URL (this will populate the URL inputs)
    loadConfigFromURL();
    
    // Wait for inputs to be populated
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if inputs were populated correctly
    const inputs = document.querySelectorAll('.sheet-url-input');
    console.log('Number of URL inputs:', inputs.length);
    inputs.forEach((input, index) => {
        console.log(`Input ${index}: ${input.value}`);
    });
    
    // Now load the sheets
    console.log('Loading sheets from URL...');
    await loadAllSheets(true);
}

// Function to share link
function shareLink() {
    const currentURL = window.location.href;
    
    // Copy to clipboard
    navigator.clipboard.writeText(currentURL).then(() => {
        // Show success message
        const statusDiv = document.getElementById('loadingStatus');
        if (statusDiv) {
            statusDiv.textContent = 'Link copied to clipboard! Share this URL for others to view.';
            statusDiv.style.color = '#2ecc71';
            
            // Clear message after 3 seconds
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
        }
    }).catch(err => {
        // Fallback if clipboard API fails
        prompt('Copy this link to share:', currentURL);
    });
}

// Initialize the application
async function initializeApp() {
    console.log('Initializing app...');
    
    // Expose functions to window immediately for HTML event handlers
    window.applyFilters = applyFilters;
    window.selectAllColumns = selectAllColumns;
    window.clearAllColumns = clearAllColumns;
    window.resetSort = resetSort;
    window.loadRepoFile = loadRepoFile;
    window.loadAllSheets = loadAllSheets;
    window.shareLink = shareLink;
    window.columnMapper = columnMapper;
    
    // Initialize data source handlers
    initializeDataSourceHandlers();
    
    // Initialize file handlers
    initializeFileHandlers();
    
    // Initialize charts
    chartManager.initializeChart();
    chartContainer.initialize();
    window.chartContainer = chartContainer;
    
    // Add chart controls to UI
    const addChartControls = document.querySelector('.chart-controls');
    if (!addChartControls) {
        import('./modules/ui.js').then(ui => {
            ui.addChartControls();
        });
    }
    
    // Auto-load sheets from URL if present
    await autoLoadSheetsFromURL();
    
    // Watch for filter changes to update URL
    document.addEventListener('change', (e) => {
        if (e.target.closest('#columnsFilter') || 
            e.target.id === 'kingdomFilter') {
            updateURLWithConfig();
        }
    });
    
// Update all chart components when data changes
    const originalUpdateState = updateState;
    window.updateState = function(updates) {
        // Call original to update the appState
        originalUpdateState(updates);
        
        // Update charts with new data if data field is updated
        if (updates.data) {
            // Update original chart manager
            if (window.chartManager) {
                chartManager.updateChart();
            }
            
            // Update configurable charts
            if (window.chartContainer) {
                chartContainer.setData(updates.data);
            }
        }
    };
    
    // Update other modules to use the window version of updateState
    import('./modules/state.js').then(stateModule => {
        stateModule.setUpdateStateFunction(window.updateState);
    });
    
    document.getElementById('searchInput')?.addEventListener('input', updateURLWithConfig);
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', initializeApp);
