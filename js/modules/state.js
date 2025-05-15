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
    compareMode: false,
    team1Kingdoms: [],
    team2Kingdoms: [],
    sheets: [], // For multiple sheets
    selectedSheet: null,
    selectedChanges: new Set()
};

// Export old 'state' reference for backward compatibility
export const state = appState;

// Update state helper functions
export function updateState(updates) {
    Object.assign(appState, updates);
}

export function resetState() {
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
}
