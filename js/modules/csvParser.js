// CSV parsing functions
import { POWER_THRESHOLD } from './constants.js';
import { initializeUIElements } from './ui.js';
import { appState } from './state.js';
import { applyFilters } from './filtering.js';
import { parseCSVText } from './sheets/googleSheetsLoader.js';

export function parseCSV(csvText, fileName = 'Uploaded File') {
    // Use the same CSV parser from sheets module
    const data = parseCSVText(csvText);
    
    if (data.length === 0) {
        console.error('No data parsed from CSV');
        return;
    }
    
    // Get headers from the first row
    const headers = Object.keys(data[0]);
    
    // Set up app state
    appState.allData = processData(data);
    appState.data = appState.allData;
    appState.headers = headers;
    
    // Initialize UI elements
    initializeUIElements(appState.allData);
    
    // Update current columns - start with all columns
    appState.currentColumns = headers;
    
    // Show main content
    document.getElementById('mainContent').style.display = 'block';
    
    // Initial display
    applyFilters();
    
    // Apply default sort if numeric columns exist
    const numericColumns = headers.filter(h => {
        const lower = h.toLowerCase();
        return (lower.includes('power') || lower.includes('merit') || lower.includes('kill')) &&
               !lower.includes('id');
    });
    
    if (numericColumns.length > 0) {
        appState.sortColumn = numericColumns[0];
        appState.sortDirection = 'desc';
        
        // Use dynamic imports to avoid circular dependency
        import('./sorting.js').then(sortingModule => {
            sortingModule.sortData();
        });
    }
}

function processData(data) {
    return data.map(row => {
        const processedRow = {};
        
        // Copy all fields exactly as they are
        for (const [key, value] of Object.entries(row)) {
            processedRow[key] = value;
            
            // Try to parse numeric values but keep original if not numeric
            if (typeof value === 'string' && value.trim() !== '') {
                const numValue = parseFloat(value.replace(/,/g, ''));
                if (!isNaN(numValue) && !key.toLowerCase().includes('id')) {
                    processedRow[key] = numValue;
                }
            }
        }
        
        // Add calculated fields if relevant columns exist
        addCalculatedFields(processedRow);
        
        return processedRow;
    });
}

function addCalculatedFields(row) {
    // Find victories and defeats columns dynamically
    const headers = Object.keys(row);
    const vicColumn = headers.find(h => 
        h.toLowerCase().includes('victor') || h.toLowerCase() === 'victories'
    );
    const defColumn = headers.find(h => 
        h.toLowerCase().includes('defeat') || h.toLowerCase() === 'defeats'
    );
    
    if (vicColumn && defColumn) {
        const victories = parseFloat(row[vicColumn]) || 0;
        const defeats = parseFloat(row[defColumn]) || 0;
        const totalBattles = victories + defeats;
        
        // Calculate win rate
        row['Win Rate (%)'] = totalBattles > 0 ? 
            (victories / totalBattles * 100).toFixed(2) : 'N/A';
        
        // Calculate tank ratio
        row['Tank Ratio'] = defeats > 0 ? 
            (victories / defeats).toFixed(2) : 
            (victories > 0 ? 'Inf' : 'N/A');
        
        // Determine player type
        if (row['Tank Ratio'] === 'N/A') {
            row['Player Type'] = 'Unknown';
        } else if (row['Tank Ratio'] === 'Inf' || parseFloat(row['Tank Ratio']) >= 1.3) {
            row['Player Type'] = 'DPS';
        } else {
            row['Player Type'] = 'Tank';
        }
    }
    
    // Add T4+T5 if columns exist
    const t4Column = headers.find(h => h.toLowerCase().includes('t4') || h.toLowerCase().includes('tier_4'));
    const t5Column = headers.find(h => h.toLowerCase().includes('t5') || h.toLowerCase().includes('tier_5'));
    
    if (t4Column && t5Column) {
        const t4Kills = parseFloat(row[t4Column]) || 0;
        const t5Kills = parseFloat(row[t5Column]) || 0;
        row['T4+T5'] = t4Kills + t5Kills;
    }
}
