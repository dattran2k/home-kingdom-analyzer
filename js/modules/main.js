// Main application entry point
import { initializeFileHandlers, loadRepoFile } from './modules/fileHandler.js';
import { initializeFilterHandlers, applyFilters } from './modules/filtering.js';
import { resetSort } from './modules/sorting.js';
import { 
    selectAllColumns, 
    selectImportantColumns, 
    createSheetUI, 
    addChartToggle,
    updateURLWithConfig,
    loadConfigFromURL
} from './modules/ui.js';
import { loadGoogleSheetAsCSV, loadMultipleSheets } from './modules/sheets/googleSheetsLoader.js';
import { sheetManager } from './modules/sheets/sheetManager.js';
import { chartManager } from './modules/charts/chartManager.js';
import { appState, resetState } from './modules/state.js';

// Load Google Sheet function
async function loadGoogleSheet() {
    const urlInput = document.getElementById('sheetUrl');
    const statusDiv = document.getElementById('loadingStatus');
    
    if (!urlInput.value) {
        statusDiv.textContent = 'Please enter a Google Sheet URL';
        statusDiv.style.color = '#e74c3c';
        return;
    }
    
    statusDiv.textContent = 'Loading sheet...';
    statusDiv.style.color = '#3498db';
    
    try {
        const result = await loadGoogleSheetAsCSV(urlInput.value);
        const sheetData = result[0];
        
        // Reset state for new data
        resetState();
        
        // Add sheet to manager
        sheetManager.addSheet(sheetData);
        sheetManager.selectSheet(sheetData.id);
        
        statusDiv.textContent = `Loaded: ${sheetData.name}`;
        statusDiv.style.color = '#2ecc71';
        
        // Show main content
        document.getElementById('mainContent').style.display = 'block';
        
        // Initialize UI elements
        initializeFilterHandlers();
        updateURLWithConfig();
    } catch (error) {
        statusDiv.textContent = error.message;
        statusDiv.style.color = '#e74c3c';
    }
}

// Load multiple sheets
async function loadMultipleSheets() {
    const urls = prompt('Enter Google Sheet URLs (one per line):');
    if (!urls) return;
    
    const urlList = urls.split('\n').filter(url => url.trim());
    const statusDiv = document.getElementById('loadingStatus');
    
    statusDiv.textContent = 'Loading sheets...';
    statusDiv.style.color = '#3498db';
    
    try {
        const result = await loadMultipleSheets(urlList);
        
        // Reset state
        resetState();
        
        // Add all sheets to manager
        result.sheets.forEach(sheet => {
            sheetManager.addSheet(sheet);
        });
        
        // Select first sheet
        if (result.sheets.length > 0) {
            sheetManager.selectSheet(result.sheets[0].id);
        }
        
        if (result.errors.length > 0) {
            statusDiv.textContent = `Loaded ${result.sheets.length} sheets, ${result.errors.length} errors`;
            statusDiv.style.color = '#f39c12';
        } else {
            statusDiv.textContent = `Loaded ${result.sheets.length} sheets successfully`;
            statusDiv.style.color = '#2ecc71';
        }
        
        // Show main content
        document.getElementById('mainContent').style.display = 'block';
        
        // Initialize UI elements
        initializeFilterHandlers();
        updateURLWithConfig();
    } catch (error) {
        statusDiv.textContent = error.message;
        statusDiv.style.color = '#e74c3c';
    }
}

// Initialize the application
function initializeApp() {
    // Create sheet UI
    createSheetUI();
    
    // Initialize file handlers
    initializeFileHandlers();
    
    // Initialize filter handlers
    initializeFilterHandlers();
    
    // Add chart toggle button
    addChartToggle();
    
    // Initialize chart
    chartManager.initializeChart();
    
    // Load configuration from URL
    loadConfigFromURL();
    
    // Auto-load default file if no sheet URL is provided
    const urlParams = new URLSearchParams(window.location.search);
    const sheetUrl = urlParams.get('sheet');
    
    if (sheetUrl) {
        document.getElementById('sheetUrl').value = sheetUrl;
        loadGoogleSheet();
    }
    
    // Expose functions to window for HTML event handlers
    window.applyFilters = applyFilters;
    window.selectAllColumns = selectAllColumns;
    window.selectImportantColumns = selectImportantColumns;
    window.resetSort = resetSort;
    window.loadRepoFile = loadRepoFile;
    window.loadGoogleSheet = loadGoogleSheet;
    window.loadMultipleSheets = loadMultipleSheets;
    
    // Remove comparison functions as requested
    window.toggleCompareMode = () => console.log('Compare mode removed');
    window.applyCompare = () => console.log('Compare mode removed');
    window.clearCompare = () => console.log('Compare mode removed');
    window.setDefaultCompare = () => console.log('Compare mode removed');
    
    // Watch for filter changes to update URL
    document.addEventListener('change', (e) => {
        if (e.target.closest('#columnsFilter') || 
            e.target.id === 'kingdomFilter' ||
            e.target.id === 'playerTypeFilter') {
            updateURLWithConfig();
        }
    });
    
    document.getElementById('searchInput')?.addEventListener('input', updateURLWithConfig);
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', initializeApp);
