// Filtering functions
import { appState } from './state.js';
import { chartContainer } from './charts/components/ConfigurableCharts/index.js';
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
        // Check all checkboxes
        document.querySelectorAll('#columnsFilter input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
            
            // Update chips UI
            const chip = cb.closest('.column-chip');
            if (chip) {
                chip.classList.add('selected');
                const checkmark = chip.querySelector('.checkmark');
                if (checkmark) checkmark.style.display = '';
            }
            
            selectedColumns.push(cb.value);
        });
    }
    
    // Preserve the order of columns if we have a custom order defined
    if (appState.columnOrder && appState.columnOrder.length > 0) {
        // Filter selected columns to only include those in columnOrder
        const orderedSelectedColumns = [];
        
        // First add columns in the order they appear in columnOrder
        appState.columnOrder.forEach(col => {
            if (selectedColumns.includes(col)) {
                orderedSelectedColumns.push(col);
            }
        });
        
        // Then add any remaining selected columns not in columnOrder
        selectedColumns.forEach(col => {
            if (!orderedSelectedColumns.includes(col)) {
                orderedSelectedColumns.push(col);
            }
        });
        
        appState.currentColumns = orderedSelectedColumns;
    } else {
        appState.currentColumns = selectedColumns;
    }
    
    console.log('Current columns after selection:', appState.currentColumns);
    
    // Find relevant columns dynamically - only needed for kingdom filter
    const kingdomColumn = appState.headers.find(h => 
        h.toLowerCase().includes('kingdom') || 
        h.toLowerCase().includes('server')
    );
    
    // Check if we're in comparison mode - just keep for your information
    const isComparisonMode = appState.columnMapping && Object.keys(appState.columnMapping).length > 0;
    
    // Filter data
    appState.data = appState.allData.filter(row => {
        // Filter by kingdom if selected
        if (kingdom !== 'all' && kingdomColumn && row[kingdomColumn] != kingdom) {
            return false;
        }
        
        // Search by name or ID
        if (searchTerm) {
            // Simple search through all text columns for both comparison and normal mode
            let matchFound = false;
            
            // Search through all columns to find text matches
            for (const colName of appState.headers) {
                // Skip null/undefined values
                if (row[colName] === undefined || row[colName] === null) continue;
                
                // Convert to string
                const valueStr = String(row[colName]);
                
                // Check if text contains search term
                if (valueStr.toLowerCase().includes(searchTerm)) {
                    matchFound = true;
                    // Uncomment for debugging if needed
                    // console.log(`Match found in column: ${colName} = ${valueStr}`);
                    break; // Found a match, stop searching
                }
            }
            
            // If no match found in any column, filter out this row
            if (!matchFound) {
                return false;
            }
            
            // Highlight search section when search is active
            const searchSection = document.querySelector('.search-section');
            if (searchSection) {
                searchSection.classList.add('active-search');
                
                // Add animated background for extra emphasis
                searchSection.style.backgroundImage = 'linear-gradient(135deg, #3a526d 0%, #2c3e50 50%, #3a526d 100%)';
                searchSection.style.backgroundSize = '200% 100%';
                searchSection.style.animation = 'gradientMove 2s ease infinite';
            }
        } else {
            // Remove highlight when search is empty
            const searchSection = document.querySelector('.search-section');
            if (searchSection) {
                searchSection.classList.remove('active-search');
                searchSection.style.backgroundImage = 'none';
                searchSection.style.animation = 'none';
            }
        }
        
        return true;
    });
    
    // Update the search results count
    const searchResultsCount = document.getElementById('searchResultsCount');
    if (searchResultsCount) {
        if (searchTerm) {
            searchResultsCount.textContent = `${appState.data.length} results`;
        } else {
            searchResultsCount.textContent = '';
        }
    }
    
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
    
    // Update configurable charts if available
    if (window.chartContainer) {
        chartContainer.setData(appState.data);
    }
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
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (searchInput) {
        // Only add listener if not already added
        if (!searchInput.dataset.listenerAdded) {
            searchInput.addEventListener('input', () => {
                clearTimeout(window.searchTimeout);
                window.searchTimeout = setTimeout(applyFilters, 300);
                
                // Show/hide clear button based on input value
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = searchInput.value ? 'flex' : 'none';
                }
            });
            searchInput.dataset.listenerAdded = 'true';
        }
        
        // Check initial state
        if (searchInput.value && clearSearchBtn) {
            clearSearchBtn.style.display = 'flex';
            
            // Also add the active class to search section
            const searchSection = document.querySelector('.search-section');
            if (searchSection) {
                searchSection.classList.add('active-search');
                searchSection.style.backgroundImage = 'linear-gradient(135deg, #3a526d 0%, #2c3e50 50%, #3a526d 100%)';
                searchSection.style.backgroundSize = '200% 100%';
                searchSection.style.animation = 'gradientMove 2s ease infinite';
            }
        }
    }
    
    // Clear search button handler
    if (clearSearchBtn && !clearSearchBtn.dataset.listenerAdded) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                clearSearchBtn.style.display = 'none';
                
                // Remove active class from search section
                const searchSection = document.querySelector('.search-section');
                if (searchSection) {
                    searchSection.classList.remove('active-search');
                    searchSection.style.backgroundImage = 'none';
                    searchSection.style.animation = 'none';
                }
                
                // Clear search results count
                const searchResultsCount = document.getElementById('searchResultsCount');
                if (searchResultsCount) {
                    searchResultsCount.textContent = '';
                }
                
                // Apply filters to update the table
                applyFilters();
                
                // Focus back on the search input for better UX
                searchInput.focus();
            }
        });
        clearSearchBtn.dataset.listenerAdded = 'true';
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
