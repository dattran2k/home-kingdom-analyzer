// Global state management
export const appState = {
    allData: [],
    data: [], // Current filtered data
    headers: [], // Current headers
    currentColumns: [],
    sortColumn: null,
    sortDirection: 'asc',
    multiSortOrder: [],
    multiSortMode: false,
    sheets: [], // For multiple sheets
    selectedSheet: null,
    selectedChanges: new Set(),
    columnMapping: null, // For storing the active column mapping
    mapColumns: false, // Flag to indicate if column mapping between sheets is enabled
    showColumnMapping: false // Flag to indicate if column mapping details should be visible
};

// Update state helper functions
export function updateState(updates) {
    Object.assign(appState, updates);
}

// Function to set an external updateState function
export function setUpdateStateFunction(fn) {
    if (typeof fn === 'function') {
        console.log('Setting external updateState function');
        window._updateStateFn = fn;
    }
}

// Add a reference for using the enhanced updateState from main.js if available
export function updateStateEnhanced(updates) {
    if (window._updateStateFn) {
        window._updateStateFn(updates);
    } else if (window.updateState) {
        window.updateState(updates);
    } else {
        updateState(updates);
    }
}

// Add to resetState() function to make sure columnOrder is preserved
export function resetState() {
    // Save column order, map columns flag, and showColumnMapping state before resetting
    const savedColumnOrder = appState.columnOrder || [];
    const savedMapColumns = appState.mapColumns || false;
    const savedShowColumnMapping = appState.showColumnMapping || false;
    
    appState.allData = [];
    appState.data = [];
    appState.headers = [];
    appState.currentColumns = [];
    appState.sortColumn = null;
    appState.sortDirection = 'asc';
    appState.multiSortOrder = [];
    // Don't reset sheets array - keep existing sheets
    appState.selectedSheet = null;
    appState.selectedChanges.clear();
    
    // Restore saved states
    appState.columnOrder = savedColumnOrder;
    appState.mapColumns = savedMapColumns;
    appState.showColumnMapping = savedShowColumnMapping;
}
