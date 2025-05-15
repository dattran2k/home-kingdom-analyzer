// Statistics functions
import { appState } from './state.js';
import { formatNumber } from './ui.js';

// Format number in short form (K, M, B)
function formatNumberShort(num) {
    // Handle negative numbers
    const isNegative = num < 0;
    const absNum = Math.abs(num);
    let formatted = '';
    
    if (absNum >= 1e9) {
        formatted = (absNum / 1e9).toFixed(1) + 'B';
    } else if (absNum >= 1e6) {
        formatted = (absNum / 1e6).toFixed(1) + 'M';
    } else if (absNum >= 1e3) {
        formatted = (absNum / 1e3).toFixed(1) + 'K';
    } else {
        formatted = absNum.toFixed(0);
    }
    
    return isNegative ? '-' + formatted : formatted;
}

export function updateStats() {
    if (!appState.data || appState.data.length === 0) return;
    
    const stats = calculateDynamicStats(appState.data);
    const averages = calculateAverages(appState.data);
    
    const statsContainer = document.getElementById('statsContainer');
    statsContainer.innerHTML = generateStatsHTML(stats, averages);
}

export function calculateDynamicStats(data) {
    const stats = {
        total: data.filter(d => !d.is_change_detail).length,
        byKingdom: {},
        totals: {}
    };
    
    // Find numeric columns for summation
    const headers = appState.headers || [];
    const numericColumns = headers.filter(h => {
        const lower = h.toLowerCase();
        return !lower.includes('id') && 
               !lower.includes('name') && 
               !lower.includes('tag') &&
               !lower.includes('kingdom') &&
               !lower.includes('server');
    });
    
    // Calculate totals for each numeric column
    numericColumns.forEach(col => {
        stats.totals[col] = data
            .filter(d => !d.is_change_detail)
            .reduce((sum, d) => {
                let value = d[col];
                
                // Handle change values with +/- signs and commas
                if (typeof value === 'string') {
                    // Remove + sign and commas, keep negative sign
                    value = value.replace(/[+,]/g, '');
                }
                
                return sum + (parseFloat(value) || 0);
            }, 0);
    });
    
    // Group by kingdom
    const kingdomColumn = headers.find(h => 
        h.toLowerCase().includes('kingdom') || 
        h.toLowerCase().includes('server')
    );
    
    if (kingdomColumn) {
        data.filter(d => !d.is_change_detail).forEach(d => {
            const kingdom = d[kingdomColumn];
            if (!stats.byKingdom[kingdom]) {
                stats.byKingdom[kingdom] = {
                    count: 0,
                    totals: {}
                };
            }
            
            stats.byKingdom[kingdom].count++;
            
            numericColumns.forEach(col => {
                if (!stats.byKingdom[kingdom].totals[col]) {
                    stats.byKingdom[kingdom].totals[col] = 0;
                }
                
                let value = d[col];
                // Handle change values with +/- signs and commas
                if (typeof value === 'string') {
                    value = value.replace(/[+,]/g, '');
                }
                
                stats.byKingdom[kingdom].totals[col] += parseFloat(value) || 0;
            });
        });
    }
    
    return stats;
}

export function generateStatsHTML(stats, averages) {
    let html = '';
    
    // Add total players count
    html += `
        <div class="stat-card">
            <div class="stat-value">${stats.total.toLocaleString()}</div>
            <div class="stat-label">Total Players</div>
        </div>
    `;
    
    // Add important stats based on available columns with specific order
    const priorityStats = [
        { pattern: 'power', label: 'Power', exact: false },
        { pattern: 'merits', label: 'Merits', exact: false },
        { pattern: 'units.*killed', label: 'Units Killed', exact: false },
        { pattern: 'units.*dead', label: 'Units Dead', exact: false },
        { pattern: 'units.*healed', label: 'Units Healed', exact: false },
        { pattern: 'gold.*spent', label: 'Gold Spent', exact: false },
        { pattern: 'wood.*spent', label: 'Wood Spent', exact: false },
        { pattern: 'stone.*spent|ore.*spent', label: 'Stone Spent', exact: false },
        { pattern: 'mana.*spent', label: 'Mana Spent', exact: false },
        { pattern: 't5.*kill|tier_5_kills', label: 'T5 Kills', exact: false },
        { pattern: 't4.*kill|tier_4_kills', label: 'T4 Kills', exact: false },
        { pattern: 'victories', label: 'Victories', exact: false },
        { pattern: 'defeat', label: 'Defeats', exact: false }
    ];
    
    // Show stats that have data
    let statCount = 1; // Start with 1 for Total Players
    const MAX_VISIBLE_STATS = 10;
    let additionalStats = [];
    
    priorityStats.forEach(stat => {
        const column = Object.keys(stats.totals).find(col => 
            new RegExp(stat.pattern, 'i').test(col)
        );
        
        if (column && (stats.totals[column] || averages[column])) {
            const total = stats.totals[column];
            const average = averages[column] || 0;
            
            const statHtml = `
                <div class="stat-card">
                    <div class="stat-value">${formatNumberShort(total)}</div>
                    <div class="stat-label">Total ${stat.label}</div>
                    <div class="stat-avg">
                        <span class="avg-label">Avg:</span>
                        <span class="avg-value">${formatNumberShort(average)}</span>
                    </div>
                </div>
            `;
            
            if (statCount < MAX_VISIBLE_STATS) {
                html += statHtml;
                statCount++;
            } else {
                additionalStats.push(statHtml);
            }
        }
    });
    
    // Add expand/collapse button if there are more stats
    if (additionalStats.length > 0) {
        html += `
            <div class="stat-card expand-stats" onclick="toggleAdditionalStats()">
                <div class="stat-value">+${additionalStats.length}</div>
                <div class="stat-label">More Stats</div>
            </div>
            <div id="additionalStats" style="display: none; grid-column: 1 / -1;">
                <div class="stats-grid">${additionalStats.join('')}</div>
            </div>
        `;
    }
    
    return html;
}

export function calculateAverages(data) {
    const averages = {};
    const headers = appState.headers || [];
    const numericColumns = headers.filter(h => {
        const lower = h.toLowerCase();
        return !lower.includes('id') && 
               !lower.includes('name') && 
               !lower.includes('tag') &&
               !lower.includes('kingdom') &&
               !lower.includes('server');
    });
    
    numericColumns.forEach(col => {
        const values = data
            .filter(row => !row.is_change_detail)
            .map(row => {
                let value = row[col];
                
                // Handle change values with +/- signs and commas
                if (typeof value === 'string') {
                    value = value.replace(/[+,]/g, '');
                }
                
                return parseFloat(value);
            })
            .filter(val => !isNaN(val));
        
        if (values.length > 0) {
            averages[col] = values.reduce((a, b) => a + b, 0) / values.length;
        }
    });
    
    return averages;
}

// Toggle additional stats visibility
window.toggleAdditionalStats = function() {
    const additionalStats = document.getElementById('additionalStats');
    const expandCard = document.querySelector('.expand-stats');
    
    if (additionalStats.style.display === 'none') {
        additionalStats.style.display = 'block';
        expandCard.querySelector('.stat-value').textContent = '−';
        expandCard.querySelector('.stat-label').textContent = 'Hide Stats';
    } else {
        additionalStats.style.display = 'none';
        const count = additionalStats.querySelectorAll('.stat-card').length;
        expandCard.querySelector('.stat-value').textContent = `+${count}`;
        expandCard.querySelector('.stat-label').textContent = 'More Stats';
    }
};

export function calculateStats(data) {
    return calculateDynamicStats(data);
}
