// Comparison functions
import { state } from './state.js';
import { calculateStats } from './statistics.js';
import { POWER_THRESHOLD, DEFAULT_TEAM1_KINGDOMS } from './constants.js';
import { applyFilters } from './filtering.js';

export function toggleCompareMode() {
    state.compareMode = !state.compareMode;
    const compareSection = document.getElementById('compareSection');
    compareSection.style.display = state.compareMode ? 'block' : 'none';
    
    if (state.compareMode) {
        initializeCompareSelects();
        // Set default compare on first open
        setDefaultCompare();
    }
    
    applyFilters();
}

function initializeCompareSelects() {
    const kingdoms = [...new Set(state.allData.map(d => d['Home Server']))].sort((a, b) => a - b);
    const team1Select = document.getElementById('team1Select');
    const team2Select = document.getElementById('team2Select');
    
    team1Select.innerHTML = '';
    team2Select.innerHTML = '';
    
    kingdoms.forEach(kingdom => {
        const option1 = document.createElement('option');
        option1.value = kingdom;
        option1.textContent = `Kingdom ${kingdom}`;
        team1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = kingdom;
        option2.textContent = `Kingdom ${kingdom}`;
        team2Select.appendChild(option2);
    });
}

function setDefaultCompare() {
    const team1Select = document.getElementById('team1Select');
    const team2Select = document.getElementById('team2Select');
    
    // Set Team 1 selections
    Array.from(team1Select.options).forEach(option => {
        option.selected = DEFAULT_TEAM1_KINGDOMS.includes(parseInt(option.value));
    });
    
    // Set Team 2 to all remaining kingdoms
    const allKingdoms = Array.from(team1Select.options).map(opt => parseInt(opt.value));
    const remainingKingdoms = allKingdoms.filter(k => !DEFAULT_TEAM1_KINGDOMS.includes(k));
    
    Array.from(team2Select.options).forEach(option => {
        option.selected = remainingKingdoms.includes(parseInt(option.value));
    });
    
    // Apply the comparison
    applyCompare();
}

export function applyCompare() {
    const team1Select = document.getElementById('team1Select');
    const team2Select = document.getElementById('team2Select');
    
    state.team1Kingdoms = Array.from(team1Select.selectedOptions).map(option => parseInt(option.value));
    state.team2Kingdoms = Array.from(team2Select.selectedOptions).map(option => parseInt(option.value));
    
    if (state.team1Kingdoms.length === 0 || state.team2Kingdoms.length === 0) {
        alert('Please select at least one kingdom for each team');
        return;
    }
    
    // Show comparison stats
    showCompareStats();
    
    // Apply filters to show only selected kingdoms
    applyFilters();
}

function showCompareStats() {
    // Filter data for both teams
    const team1Data = state.allData.filter(row => row['Power'] >= POWER_THRESHOLD && state.team1Kingdoms.includes(row['Home Server']));
    const team2Data = state.allData.filter(row => row['Power'] >= POWER_THRESHOLD && state.team2Kingdoms.includes(row['Home Server']));
    
    const team1Stats = calculateStats(team1Data);
    const team2Stats = calculateStats(team2Data);
    
    const compareStatsDiv = document.getElementById('compareStats');
    compareStatsDiv.style.display = 'block';
    compareStatsDiv.innerHTML = `
        <div style="background: #2c3e50; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h4 style="color: #ecf0f1; text-align: center; margin-bottom: 20px;">⚔️ Team Comparison Statistics</h4>
            
            <div style="display: grid; grid-template-columns: 1fr 150px 1fr; gap: 30px; align-items: center;">
                <div>
                    <div style="color: #3498db; text-align: center; font-size: 1.3em; margin-bottom: 15px;">
                        <strong>Team 1</strong><br/>
                        <span style="font-size: 0.8em; color: #95a5a6;">Kingdoms: ${state.team1Kingdoms.join(', ')}</span>
                    </div>
                    <div style="display: grid; gap: 10px;">
                        <div>
                            <span style="color: #95a5a6;">Players:</span>
                            <strong style="color: #ecf0f1;">${team1Stats.total}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Total Power:</span>
                            <strong style="color: #f39c12;">${(team1Stats.totalPower / 1000000000).toFixed(2)}B</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">T5 Kills:</span>
                            <strong style="color: #e74c3c;">${team1Stats.totalKillsT5.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Units Dead:</span>
                            <strong style="color: #e74c3c;">${team1Stats.totalDead.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Units Healed:</span>
                            <strong style="color: #2ecc71;">${team1Stats.totalHealed.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Tanks/DPS:</span>
                            <strong style="color: #ecf0f1;">${team1Stats.tanks}/${team1Stats.dps}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Mana Spent:</span>
                            <strong style="color: #9b59b6;">${(team1Stats.totalManaSpent / 1000000).toFixed(1)}M</strong>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <div style="font-size: 2em; color: #ecf0f1; margin: 20px 0;">VS</div>
                    <div style="color: ${team1Stats.totalPower > team2Stats.totalPower ? '#3498db' : '#e74c3c'};">
                        ${team1Stats.totalPower > team2Stats.totalPower ? '⬅ Team 1' : 'Team 2 ➡'}
                    </div>
                </div>
                
                <div>
                    <div style="color: #e74c3c; text-align: center; font-size: 1.3em; margin-bottom: 15px;">
                        <strong>Team 2</strong><br/>
                        <span style="font-size: 0.8em; color: #95a5a6;">Kingdoms: ${state.team2Kingdoms.join(', ')}</span>
                    </div>
                    <div style="display: grid; gap: 10px;">
                        <div>
                            <span style="color: #95a5a6;">Players:</span>
                            <strong style="color: #ecf0f1;">${team2Stats.total}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Total Power:</span>
                            <strong style="color: #f39c12;">${(team2Stats.totalPower / 1000000000).toFixed(2)}B</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">T5 Kills:</span>
                            <strong style="color: #e74c3c;">${team2Stats.totalKillsT5.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Units Dead:</span>
                            <strong style="color: #e74c3c;">${team2Stats.totalDead.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Units Healed:</span>
                            <strong style="color: #2ecc71;">${team2Stats.totalHealed.toLocaleString()}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Tanks/DPS:</span>
                            <strong style="color: #ecf0f1;">${team2Stats.tanks}/${team2Stats.dps}</strong>
                        </div>
                        <div>
                            <span style="color: #95a5a6;">Mana Spent:</span>
                            <strong style="color: #9b59b6;">${(team2Stats.totalManaSpent / 1000000).toFixed(1)}M</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Extended Compare View functions
export function showDataView() {
    document.getElementById('dataViewSection').style.display = 'block';
    document.getElementById('compareViewSection').style.display = 'none';
    document.getElementById('dataViewBtn').className = 'btn';
    document.getElementById('compareViewBtn').className = 'btn btn-secondary';
    state.compareMode = false;
    applyFilters();
}

export function showCompareView() {
    document.getElementById('dataViewSection').style.display = 'none';
    document.getElementById('compareViewSection').style.display = 'block';
    document.getElementById('dataViewBtn').className = 'btn btn-secondary';
    document.getElementById('compareViewBtn').className = 'btn';
    
    // Initialize compare view if not already done
    if (state.allData.length > 0 && document.getElementById('team1CompareSelect').options.length === 0) {
        initializeCompareView();
    }
}

function initializeCompareView() {
    const kingdoms = [...new Set(state.allData.map(d => d['Home Server']))].sort((a, b) => a - b);
    const team1Select = document.getElementById('team1CompareSelect');
    const team2Select = document.getElementById('team2CompareSelect');
    
    team1Select.innerHTML = '';
    team2Select.innerHTML = '';
    
    kingdoms.forEach(kingdom => {
        const option1 = document.createElement('option');
        option1.value = kingdom;
        option1.textContent = `Kingdom ${kingdom}`;
        team1Select.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = kingdom;
        option2.textContent = `Kingdom ${kingdom}`;
        team2Select.appendChild(option2);
    });
    
    // Set default selection
    selectDefaultTeam1();
    selectRemainingTeam2();
}

function selectDefaultTeam1() {
    const team1Select = document.getElementById('team1CompareSelect');
    
    Array.from(team1Select.options).forEach(option => {
        option.selected = DEFAULT_TEAM1_KINGDOMS.includes(parseInt(option.value));
    });
}

function selectRemainingTeam2() {
    const team1Select = document.getElementById('team1CompareSelect');
    const team2Select = document.getElementById('team2CompareSelect');
    
    const selectedTeam1 = Array.from(team1Select.selectedOptions).map(opt => parseInt(opt.value));
    
    Array.from(team2Select.options).forEach(option => {
        option.selected = !selectedTeam1.includes(parseInt(option.value));
    });
}

export function executeCompare() {
    const team1Select = document.getElementById('team1CompareSelect');
    const team2Select = document.getElementById('team2CompareSelect');
    
    state.team1Kingdoms = Array.from(team1Select.selectedOptions).map(option => parseInt(option.value));
    state.team2Kingdoms = Array.from(team2Select.selectedOptions).map(option => parseInt(option.value));
    
    if (state.team1Kingdoms.length === 0 || state.team2Kingdoms.length === 0) {
        alert('Please select at least one kingdom for each team');
        return;
    }
    
    // Filter data for comparison
    const team1Data = state.allData.filter(row => row['Power'] >= POWER_THRESHOLD && state.team1Kingdoms.includes(row['Home Server']));
    const team2Data = state.allData.filter(row => row['Power'] >= POWER_THRESHOLD && state.team2Kingdoms.includes(row['Home Server']));
    
    showCompareResults(team1Data, team2Data);
}

function showCompareResults(team1Data, team2Data) {
    const team1Stats = calculateStats(team1Data);
    const team2Stats = calculateStats(team2Data);
    
    const compareResultsDiv = document.getElementById('compareResults');
    compareResultsDiv.style.display = 'block';
    compareResultsDiv.innerHTML = `
        <div style="background: #2c3e50; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <h3 style="color: #ecf0f1; text-align: center; margin-bottom: 30px; font-size: 1.8em;">Alliance Comparison Results</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 200px 1fr; gap: 40px; align-items: start;">
                <!-- Team 1 Stats -->
                <div>
                    <h4 style="color: #3498db; text-align: center; margin-bottom: 20px; font-size: 1.5em;">Team 1 Alliance</h4>
                    <p style="color: #95a5a6; text-align: center; margin-bottom: 20px;">Kingdoms: ${state.team1Kingdoms.join(', ')}</p>
                    
                    <div style="background: #34495e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <span style="color: #95a5a6;">Total Players:</span>
                                <div style="color: #ecf0f1; font-size: 1.3em; font-weight: bold;">${team1Stats.total}</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">Total Power:</span>
                                <div style="color: #f39c12; font-size: 1.3em; font-weight: bold;">${(team1Stats.totalPower / 1000000000).toFixed(2)}B</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">Average Power:</span>
                                <div style="color: #ecf0f1; font-size: 1.3em; font-weight: bold;">${(team1Stats.avgPower / 1000000).toFixed(1)}M</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">T4+T5 Kills:</span>
                                <div style="color: #e74c3c; font-size: 1.3em; font-weight: bold;">${team1Stats.totalT4T5.toLocaleString()}</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">Tanks/DPS:</span>
                                <div style="color: #ecf0f1; font-size: 1.3em; font-weight: bold;">${team1Stats.tanks}/${team1Stats.dps}</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">Avg Win Rate:</span>
                                <div style="color: #2ecc71; font-size: 1.3em; font-weight: bold;">${team1Stats.avgWinRate.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                    
                    <h5 style="color: #ecf0f1; margin-bottom: 10px;">Top 10 Players:</h5>
                    <div style="background: #34495e; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
                        ${team1Stats.topPlayers.map((p, i) => `
                            <div style="display: flex; justify-content: space-between; padding: 5px 0; ${i < 9 ? 'border-bottom: 1px solid #2c3e50;' : ''}">
                                <span style="color: ${i < 3 ? '#f39c12' : '#ecf0f1'};">${i + 1}. ${p.Name}</span>
                                <span style="color: #95a5a6;">${(p.Power / 1000000).toFixed(1)}M</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- VS Section -->
                <div style="text-align: center; padding-top: 100px;">
                    <div style="font-size: 3em; color: #ecf0f1; margin-bottom: 20px;">VS</div>
                    <div style="font-size: 2em; color: ${team1Stats.totalPower > team2Stats.totalPower ? '#3498db' : '#e74c3c'};">
                        ${team1Stats.totalPower > team2Stats.totalPower ? '← Team 1' : 'Team 2 →'}
                    </div>
                    <div style="margin-top: 20px; color: #95a5a6;">
                        Power Difference:
                        <div style="color: #ecf0f1; font-size: 1.5em; font-weight: bold;">
                            ${Math.abs((team1Stats.totalPower - team2Stats.totalPower) / 1000000000).toFixed(2)}B
                        </div>
                    </div>
                </div>
                
                <!-- Team 2 Stats -->
                <div>
                    <h4 style="color: #e74c3c; text-align: center; margin-bottom: 20px; font-size: 1.5em;">Team 2 Opposition</h4>
                    <p style="color: #95a5a6; text-align: center; margin-bottom: 20px;">Kingdoms: ${state.team2Kingdoms.join(', ')}</p>
                    
                    <div style="background: #34495e; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <span style="color: #95a5a6;">Total Players:</span>
                                <div style="color: #ecf0f1; font-size: 1.3em; font-weight: bold;">${team2Stats.total}</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">Total Power:</span>
                                <div style="color: #f39c12; font-size: 1.3em; font-weight: bold;">${(team2Stats.totalPower / 1000000000).toFixed(2)}B</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">Average Power:</span>
                                <div style="color: #ecf0f1; font-size: 1.3em; font-weight: bold;">${(team2Stats.avgPower / 1000000).toFixed(1)}M</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">T4+T5 Kills:</span>
                                <div style="color: #e74c3c; font-size: 1.3em; font-weight: bold;">${team2Stats.totalT4T5.toLocaleString()}</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">Tanks/DPS:</span>
                                <div style="color: #ecf0f1; font-size: 1.3em; font-weight: bold;">${team2Stats.tanks}/${team2Stats.dps}</div>
                            </div>
                            <div>
                                <span style="color: #95a5a6;">Avg Win Rate:</span>
                                <div style="color: #2ecc71; font-size: 1.3em; font-weight: bold;">${team2Stats.avgWinRate.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                    
                    <h5 style="color: #ecf0f1; margin-bottom: 10px;">Top 10 Players:</h5>
                    <div style="background: #34495e; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
                        ${team2Stats.topPlayers.map((p, i) => `
                            <div style="display: flex; justify-content: space-between; padding: 5px 0; ${i < 9 ? 'border-bottom: 1px solid #2c3e50;' : ''}">
                                <span style="color: ${i < 3 ? '#f39c12' : '#ecf0f1'};">${i + 1}. ${p.Name}</span>
                                <span style="color: #95a5a6;">${(p.Power / 1000000).toFixed(1)}M</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function clearCompareSelection() {
    document.getElementById('team1CompareSelect').selectedIndex = -1;
    document.getElementById('team2CompareSelect').selectedIndex = -1;
    document.getElementById('compareResults').style.display = 'none';
}
