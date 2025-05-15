// Filtering functions
import { appState } from './state.js';
import { applyMultiSort, sortData } from './sorting.js';
import { updateStats } from './statistics.js';
import { renderTable } from './tableRenderer.js';
import { initializeUIElements } from './ui.js';

export function applyFilters(preserveUI = false) {
    if (!appState.allData || appState.allData.length === 0) return;
    
    console.log('Applying filters, current columns:', appState.currentColumns);
    console.log('Available headers:', appState.headers);
    
    const kingdom = document.getElementById('kingdomFilter')?.value || 'all';
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // Get selected columns from UI
    const selectedColumns = [];
    document.querySelectorAll('#columnsFilter input[type="checkbox"]:checked').forEach(cb => {
        selectedColumns.push(cb.value);
    });
    
    // If no columns selected, select all available columns
    if (selectedColumns.length === 0 && appState.headers.length > 0) {
        appState.currentColumns = [...appState.headers];
        // Check all checkboxes
        document.querySelectorAll('#columnsFilter input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });
    } else {
        appState.currentColumns = selectedColumns;
    }
    
    console.log('Current columns after selection:', appState.currentColumns);
    
    // Find relevant columns dynamically
    const nameColumn = appState.headers.find(h => 
        h.toLowerCase().includes('name') && !h.toLowerCase().includes('alliance')
    );
    const kingdomColumn = appState.headers.find(h => 
        h.toLowerCase().includes('kingdom') || 
        h.toLowerCase().includes('server')
    );
    const powerColumn = appState.headers.find(h => 
        h.toLowerCase().includes('power') && !h.toLowerCase().includes('highest')
    );
    
    // Filter data
    appState.data = appState.allData.filter(row => {
        // Filter by kingdom if selected
        if (kingdom !== 'all' && kingdomColumn && row[kingdomColumn] != kingdom) {
            return false;
        }
        
        // Name search
        if (searchTerm && nameColumn && !row[nameColumn].toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        return true;
    });
    
    // Apply sorting
    if (appState.multiSortMode) {
        applyMultiSort();
    } else if (appState.sortColumn) {
        sortData();
    }
    
    // Update stats
    updateStats();
    
    // Update table
    renderTable();
}

function calculatePlayerType(row) {
    // Find victories and defeats columns
    const vicColumn = appState.headers.find(h => 
        h.toLowerCase().includes('victor') || h.toLowerCase() === 'victories'
    );
    const defColumn = appState.headers.find(h => 
        h.toLowerCase().includes('defeat') || h.toLowerCase() === 'defeats'
    );
    
    if (!vicColumn || !defColumn) return 'Unknown';
    
    const victories = parseFloat(row[vicColumn]) || 0;
    const defeats = parseFloat(row[defColumn]) || 0;
    
    if (defeats === 0) return victories > 0 ? 'DPS' : 'Unknown';
    
    const ratio = victories / defeats;
    return ratio < 1.3 ? 'Tank' : 'DPS';
}

export function initializeFilterHandlers(preserveFilters = true) {
    console.log('Initializing filter handlers, allData length:', appState.allData.length);
    
    // Initialize UI elements with preserve flag
    if (appState.allData.length > 0) {
        initializeUIElements(appState.allData, preserveFilters);
    }
    
    // Search input handler
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Only add listener if not already added
        if (!searchInput.dataset.listenerAdded) {
            searchInput.addEventListener('input', () => {
                clearTimeout(window.searchTimeout);
                window.searchTimeout = setTimeout(applyFilters, 300);
            });
            searchInput.dataset.listenerAdded = 'true';
        }
    }
    
    // Apply filters when dropdowns change (immediate)
    const filters = ['kingdomFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element && !element.dataset.listenerAdded) {
            element.addEventListener('change', () => applyFilters());
            element.dataset.listenerAdded = 'true';
        }
    });
}
