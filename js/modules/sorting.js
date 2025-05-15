// Sorting functions
import { appState } from './state.js';
import { renderTable } from './tableRenderer.js';
import { chartManager } from './charts/chartManager.js';

export function sortByColumn(column) {
    // Turn off multi-sort mode when clicking a column
    appState.multiSortMode = false;
    
    if (appState.sortColumn === column) {
        appState.sortDirection = appState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        appState.sortColumn = column;
        // Default to descending for numeric columns and change data
        const numericColumns = ['power', 'kill', 'dead', 'heal', 'victories', 'merits', 'defeat'];
        const isNumeric = numericColumns.some(nc => column.toLowerCase().includes(nc));
        // Check if we're viewing change data
        const isChangeData = appState.data.length > 0 && appState.data[0].is_change_row;
        appState.sortDirection = (isNumeric || isChangeData) ? 'desc' : 'asc';
    }
    
    sortData();
    renderTable();
    
    // Update chart if visible
    if (chartManager) {
        chartManager.onSortChange(column);
    }
}

export function sortData() {
    if (!appState.sortColumn) return;
    
    appState.data.sort((a, b) => {
        let aVal = a[appState.sortColumn];
        let bVal = b[appState.sortColumn];
        
        // Handle special rows
        if (a.is_total && !b.is_total) return -1;
        if (!a.is_total && b.is_total) return 1;
        if (a.is_change_detail && !b.is_change_detail) return 1;
        if (!a.is_change_detail && b.is_change_detail) return -1;
        
        // Handle N/A values
        if (aVal === 'N/A') aVal = -1;
        if (bVal === 'N/A') bVal = -1;
        
        // Handle empty or dash values
        if (aVal === '-' || aVal === '') aVal = 0;
        if (bVal === '-' || bVal === '') bVal = 0;
        
        // Handle change values with +/- signs
        if (typeof aVal === 'string' && (aVal.startsWith('+') || aVal.startsWith('-'))) {
            // Remove + sign and commas, parse as number
            aVal = parseFloat(aVal.replace(/[+,]/g, ''));
        }
        if (typeof bVal === 'string' && (bVal.startsWith('+') || bVal.startsWith('-'))) {
            // Remove + sign and commas, parse as number
            bVal = parseFloat(bVal.replace(/[+,]/g, ''));
        }
        
        // Convert to numbers if possible
        if (!isNaN(aVal) && !isNaN(bVal)) {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }
        
        if (appState.sortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
}

export function applyMultiSort() {
    appState.data.sort((a, b) => {
        // Find relevant columns
        const kingdomColumn = appState.headers.find(h => 
            h.toLowerCase().includes('kingdom') || 
            h.toLowerCase().includes('server')
        );
        const nameColumn = appState.headers.find(h => 
            h.toLowerCase().includes('name') && !h.toLowerCase().includes('alliance')
        );
        const idColumn = appState.headers.find(h => 
            h.toLowerCase().includes('id') && 
            (h.toLowerCase().includes('governor') || h.toLowerCase().includes('lord'))
        );
        
        // Sort by kingdom/server first
        if (kingdomColumn) {
            let kingdomA = a[kingdomColumn] || 0;
            let kingdomB = b[kingdomColumn] || 0;
            if (kingdomA !== kingdomB) {
                return kingdomA - kingdomB;
            }
        }
        
        // Then by name
        if (nameColumn) {
            let nameA = (a[nameColumn] || '').toLowerCase();
            let nameB = (b[nameColumn] || '').toLowerCase();
            if (nameA !== nameB) {
                return nameA.localeCompare(nameB);
            }
        }
        
        // Then by ID
        if (idColumn) {
            let idA = a[idColumn] || 0;
            let idB = b[idColumn] || 0;
            return idA - idB;
        }
        
        return 0;
    });
    renderTable();
}

export function resetSort() {
    appState.multiSortMode = true;
    appState.sortColumn = null;
    appState.sortDirection = 'asc';
    applyMultiSort();
}
