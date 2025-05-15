let allData = [];
        let filteredData = [];
        let currentColumns = [];
        let sortColumn = null;
        let sortDirection = 'asc';
        let multiSortOrder = [];

        // Important columns that should be checked by default - in priority order
        const importantColumns = [
            'Home Server', 'Name', 'Lord Id', 'Highest Power', 'Power',
            'Killcount T1', 'T4 +T5',
            'Units Dead', 'Units Healed', 'Victories', 'Defeats', 
            'Tank Ratio', 'Win Rate (%)', 'Player Type', 'Mana Spent'
        ];
        
        // Default sort order
        const defaultSortOrder = [
            {column: 'Home Server', direction: 'asc'},
            {column: 'Name', direction: 'asc'},
            {column: 'Lord Id', direction: 'asc'}
        ];
        
        // Multi-sort mode
        let multiSortMode = true;
        let compareMode = false;
        let team1Kingdoms = [];
        let team2Kingdoms = [];
        
        // Auto-load default file when page loads
        window.addEventListener('DOMContentLoaded', function() {
            // Automatically load default CSV when page loads
            loadRepoFile();
        });
        
        // Radio button event listeners
        document.getElementById('repoFile').addEventListener('change', function() {
            if (this.checked) {
                document.getElementById('repoFileDiv').style.display = 'block';
                document.getElementById('localFileDiv').style.display = 'none';
            }
        });
        
        document.getElementById('localFile').addEventListener('change', function() {
            if (this.checked) {
                document.getElementById('repoFileDiv').style.display = 'none';
                document.getElementById('localFileDiv').style.display = 'block';
            }
        });

        document.getElementById('fileInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('fileName').textContent = `File: ${file.name}`;
                const reader = new FileReader();
                reader.onload = function(event) {
                    parseCSV(event.target.result);
                };
                reader.readAsText(file);
            }
        });

        function parseCSV(csvText) {
            const lines = csvText.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            allData = [];
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = parseCSVLine(lines[i]);
                    const row = {};
                    headers.forEach((header, index) => {
                        let val = values[index] ? values[index].trim() : '';
                        // Remove quotes
                        if (val.startsWith('"') && val.endsWith('"')) {
                            val = val.slice(1, -1);
                        }
                        row[header] = val;
                    });
                    
                    // Parse numeric values
                    row['Killcount T1'] = parseInt(row['Killcount T1']) || 0;
                    row['Killcount T2'] = parseInt(row['Killcount T2']) || 0;
                    row['Killcount T3'] = parseInt(row['Killcount T3']) || 0;
                    row['Killcount T4'] = parseInt(row['Killcount T4']) || 0;
                    row['Killcount T5'] = parseInt(row['Killcount T5']) || 0;
                    row['T4 +T5'] = row['T4 +T5'] ? parseInt(row['T4 +T5']) : (row['Killcount T4'] + row['Killcount T5']);
                    row['Units Dead'] = row['Units Dead'] === '-' ? 0 : parseInt(row['Units Dead']) || 0;
                    row['Units Killed'] = row['Units Killed'] === '-' ? 0 : parseInt(row['Units Killed']) || 0;
                    row['Victories'] = parseFloat(row['Victories']) || 0;
                    row['Defeats'] = parseFloat(row['Defeats']) || 0;
                    row['Power'] = parseInt(row['Power']) || 0;
                    row['Highest Power'] = parseInt(row['Highest Power']) || row['Power'] || 0;
                    row['Home Server'] = parseInt(row['Home Server']) || 0;
                    row['Lord Id'] = parseInt(row['Lord Id']) || 0;
                    row['Units Healed'] = parseFloat(row['Units Healed']) || 0;
                    row['Mana Spent'] = parseInt(row['Mana Spent']) || 0;
                    
                    // Calculate win rate
                    const totalBattles = row['Victories'] + row['Defeats'];
                    row['Win Rate (%)'] = totalBattles > 0 ? 
                        (row['Victories'] / totalBattles * 100).toFixed(2) : 'N/A';
                    
                    // Calculate tank ratio (victories/defeats)
                    row['Tank Ratio'] = row['Defeats'] > 0 ? 
                        (row['Victories'] / row['Defeats']).toFixed(2) : 
                        (row['Victories'] > 0 ? 'Inf' : 'N/A');
                    
                    // Determine player type based on victories/defeats ratio
                    // Tank: victories/defeats < 1.3
                    // DPS: victories/defeats >= 1.3
                    if (row['Tank Ratio'] === 'N/A') {
                        row['Player Type'] = 'Unknown';
                    } else if (row['Tank Ratio'] === 'Inf' || parseFloat(row['Tank Ratio']) >= 1.3) {
                        row['Player Type'] = 'DPS';
                    } else {
                        row['Player Type'] = 'Tank';
                    }
                    
                    allData.push(row);
                }
            }
            
            // Initialize kingdom filter
            const kingdoms = [...new Set(allData.map(d => d['Home Server']))].sort((a, b) => a - b);
            const kingdomSelect = document.getElementById('kingdomFilter');
            kingdomSelect.innerHTML = '<option value="all">Tất cả Kingdom</option>';
            kingdoms.forEach(kingdom => {
                const option = document.createElement('option');
                option.value = kingdom;
                option.textContent = `Kingdom ${kingdom}`;
                kingdomSelect.appendChild(option);
            });
            
            // Initialize columns filter
            const allColumns = Object.keys(allData[0]);
            const columnsFilter = document.getElementById('columnsFilter');
            columnsFilter.innerHTML = '';
            
            // First add important columns in order
            importantColumns.forEach(column => {
                if (allColumns.includes(column)) {
                    const checkboxItem = document.createElement('div');
                    checkboxItem.className = 'checkbox-item';
                    const columnId = column.replace(/[^a-zA-Z0-9]/g, '_');
                    checkboxItem.innerHTML = `
                        <input type="checkbox" id="col_${columnId}" value="${column}" checked>
                        <label for="col_${columnId}">${column}</label>
                    `;
                    columnsFilter.appendChild(checkboxItem);
                }
            });
            
            // Then add remaining columns
            allColumns.forEach(column => {
                if (!importantColumns.includes(column)) {
                    const checkboxItem = document.createElement('div');
                    checkboxItem.className = 'checkbox-item';
                    const columnId = column.replace(/[^a-zA-Z0-9]/g, '_');
                    checkboxItem.innerHTML = `
                        <input type="checkbox" id="col_${columnId}" value="${column}">
                        <label for="col_${columnId}">${column}</label>
                    `;
                    columnsFilter.appendChild(checkboxItem);
                }
            });
            
            // Update current columns - use important columns in order
            currentColumns = importantColumns.filter(col => allColumns.includes(col));
            
            // Show main content
            document.getElementById('mainContent').style.display = 'block';
            
            // Initial display with default sort
            applyFilters();
            
            // Apply default sort order - Highest Power descending
            sortColumn = 'Highest Power';
            sortDirection = 'desc';
            multiSortMode = false;
            sortData();
            updateTable();
        }

        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current);
            return result;
        }

        function applyFilters() {
            const kingdom = document.getElementById('kingdomFilter').value;
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const playerType = document.getElementById('playerTypeFilter').value;
            
            // Get selected columns
            const selectedColumns = [];
            document.querySelectorAll('#columnsFilter input[type="checkbox"]:checked').forEach(cb => {
                selectedColumns.push(cb.value);
            });
            
            currentColumns = selectedColumns;
            
            // Filter data
            filteredData = allData.filter(row => {
                // Filter out players with power less than 30M
                if (row['Power'] < 30000000) return false;
                
                // If in compare mode, only show selected kingdoms
                if (compareMode && (team1Kingdoms.length > 0 || team2Kingdoms.length > 0)) {
                    const allCompareKingdoms = [...team1Kingdoms, ...team2Kingdoms];
                    if (!allCompareKingdoms.includes(row['Home Server'])) return false;
                } else {
                    // Normal kingdom filter
                    if (kingdom !== 'all' && row['Home Server'] != kingdom) return false;
                }
                
                // Name search
                if (searchTerm && !row['Name'].toLowerCase().includes(searchTerm)) return false;
                
                // Player type filter
                if (playerType !== 'all' && row['Player Type'].toLowerCase() !== playerType) return false;
                
                return true;
            });
            
            // Apply multi-level sorting by default
            if (multiSortMode) {
                applyMultiSort();
            } else if (sortColumn) {
                sortData();
            }
            
            // Update stats
            updateStats();
            
            // Update table
            updateTable();
        }

        function updateStats() {
            const stats = {
                total: filteredData.length,
                totalKillsT1: filteredData.reduce((sum, d) => sum + d['Killcount T1'], 0),
                totalKillsT4: filteredData.reduce((sum, d) => sum + d['Killcount T4'], 0),
                totalKillsT5: filteredData.reduce((sum, d) => sum + d['Killcount T5'], 0),
                totalT4T5: filteredData.reduce((sum, d) => sum + d['T4 +T5'], 0),
                totalDead: filteredData.reduce((sum, d) => sum + d['Units Dead'], 0),
                totalHealed: filteredData.reduce((sum, d) => sum + d['Units Healed'], 0),
                tanks: filteredData.filter(d => d['Player Type'] === 'Tank').length,
                dps: filteredData.filter(d => d['Player Type'] === 'DPS').length,
                avgWinRate: filteredData
                    .filter(d => d['Win Rate (%)'] !== 'N/A')
                    .reduce((sum, d, _, arr) => sum + parseFloat(d['Win Rate (%)']) / arr.length, 0)
                    .toFixed(2)
            };
            
            const statsContainer = document.getElementById('statsContainer');
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${stats.total.toLocaleString()}</div>
                    <div class="stat-label">Total Players</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalKillsT1.toLocaleString()}</div>
                    <div class="stat-label">Total Kills T1</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalKillsT4.toLocaleString()}</div>
                    <div class="stat-label">Total Kills T4</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalKillsT5.toLocaleString()}</div>
                    <div class="stat-label">Total Kills T5</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalT4T5.toLocaleString()}</div>
                    <div class="stat-label">Total T4+T5</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalDead.toLocaleString()}</div>
                    <div class="stat-label">Total Units Dead</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalHealed.toLocaleString()}</div>
                    <div class="stat-label">Total Units Healed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.tanks.toLocaleString()}</div>
                    <div class="stat-label">Tanks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.dps.toLocaleString()}</div>
                    <div class="stat-label">DPS</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.avgWinRate}%</div>
                    <div class="stat-label">Average Win Rate</div>
                </div>
            `;
        }

        function updateTable() {
            // Update headers
            const headerRow = document.getElementById('tableHeader');
            headerRow.innerHTML = currentColumns.map(col => `
                <th onclick="sortByColumn('${col}')">
                    ${col}
                    <span class="sort-indicator">
                        ${sortColumn === col ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </span>
                </th>
            `).join('');
            
            // Update body
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            
            filteredData.forEach(row => {
                const tr = document.createElement('tr');
                tr.className = row['Player Type'].toLowerCase();
                
                currentColumns.forEach(col => {
                    const td = document.createElement('td');
                    let value = row[col];
                    
                    // Format numeric values with thousands separator - more compact
                    if (typeof value === 'number' && col !== 'Home Server' && col !== 'Lord Id') {
                        if (col === 'Power' || col === 'Highest Power') {
                            // Format power values in millions
                            value = (value / 1000000).toFixed(1) + 'M';
                        } else if (value > 1000000) {
                            value = (value / 1000000).toFixed(2) + 'M';
                        } else if (value > 1000) {
                            value = (value / 1000).toFixed(0) + 'K';
                        } else {
                            value = value.toLocaleString();
                        }
                    }
                    
                    // Special formatting for win rate
                    if (col === 'Win Rate (%)' && value !== 'N/A') {
                        td.style.fontWeight = 'bold';
                        td.style.color = parseFloat(value) >= 50 ? '#2ecc71' : '#e74c3c';
                    }
                    
                    // Special formatting for tank ratio
                    if (col === 'Tank Ratio' && value !== 'N/A') {
                        td.style.fontWeight = 'bold';
                        if (value === 'Inf') {
                            td.style.color = '#27ae60';
                            td.textContent = '∞';
                        } else {
                            const ratio = parseFloat(value);
                            td.style.color = ratio < 1.3 ? '#e74c3c' : '#27ae60';
                        }
                    }
                    
                    // Special formatting for player type
                    if (col === 'Player Type') {
                        td.style.fontWeight = 'bold';
                        if (value === 'Tank') {
                            td.style.color = '#e74c3c';
                        } else if (value === 'DPS') {
                            td.style.color = '#2ecc71';
                        } else {
                            td.style.color = '#95a5a6';
                        }
                    }
                    
                    // Special formatting for kingdom - make it more compact
                    if (col === 'Home Server') {
                        td.style.fontWeight = 'bold';
                        td.style.color = '#3498db';
                        td.style.textAlign = 'center';
                    }
                    
                    // Special formatting for power columns
                    if (col === 'Power' || col === 'Highest Power') {
                        td.style.color = '#f39c12';
                    }
                    
                    if (!td.textContent) {
                        td.textContent = value || '-';
                    }
                    tr.appendChild(td);
                });
                
                tbody.appendChild(tr);
            });
        }

        function sortByColumn(column) {
            // Turn off multi-sort mode when clicking a column
            multiSortMode = false;
            
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                // Special formatting for power-related columns
                if (column.toLowerCase().includes('power') || 
                    column.toLowerCase().includes('kill') || 
                    column.toLowerCase().includes('dead') ||
                    column.toLowerCase().includes('heal') ||
                    column.toLowerCase().includes('victories') ||
                    column.toLowerCase().includes('mana')) {
                    sortDirection = 'desc';
                } else {
                    sortDirection = 'asc';
                }
            }
            sortData();
            updateTable();
        }

        function sortData() {
            filteredData.sort((a, b) => {
                let aVal = a[sortColumn];
                let bVal = b[sortColumn];
                
                // Handle N/A values
                if (aVal === 'N/A') aVal = -1;
                if (bVal === 'N/A') bVal = -1;
                
                // Handle empty or dash values
                if (aVal === '-' || aVal === '') aVal = 0;
                if (bVal === '-' || bVal === '') bVal = 0;
                
                // Convert to numbers if possible
                if (!isNaN(aVal) && !isNaN(bVal)) {
                    aVal = parseFloat(aVal);
                    bVal = parseFloat(bVal);
                }
                
                if (sortDirection === 'asc') {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                } else {
                    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                }
            });
        }
        
        function applyMultiSort() {
            filteredData.sort((a, b) => {
                // Sort by Home Server first
                let homeServerA = a['Home Server'] || 0;
                let homeServerB = b['Home Server'] || 0;
                if (homeServerA !== homeServerB) {
                    return homeServerA - homeServerB;
                }
                
                // Then by Name
                let nameA = a['Name'].toLowerCase();
                let nameB = b['Name'].toLowerCase();
                if (nameA !== nameB) {
                    return nameA.localeCompare(nameB);
                }
                
                // Then by Lord Id
                let idA = a['Lord Id'] || 0;
                let idB = b['Lord Id'] || 0;
                return idA - idB;
            });
            updateTable();
        }

        function selectAllColumns() {
            document.querySelectorAll('#columnsFilter input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
            });
        }

        function selectImportantColumns() {
            // First deselect all
            document.querySelectorAll('#columnsFilter input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            
            // Then select only important columns
            importantColumns.forEach(col => {
                const columnId = col.replace(/[^a-zA-Z0-9]/g, '_');
                const checkbox = document.querySelector(`#col_${columnId}`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
            
            // Update the display after changing selections
            applyFilters();
        }
        
        // View switching functions
        function showDataView() {
            currentView = 'data';
            document.getElementById('dataViewSection').style.display = 'block';
            document.getElementById('compareViewSection').style.display = 'none';
            document.getElementById('dataViewBtn').className = 'btn';
            document.getElementById('compareViewBtn').className = 'btn btn-secondary';
            compareMode = false;
            applyFilters();
        }
        
        function showCompareView() {
            currentView = 'compare';
            document.getElementById('dataViewSection').style.display = 'none';
            document.getElementById('compareViewSection').style.display = 'block';
            document.getElementById('dataViewBtn').className = 'btn btn-secondary';
            document.getElementById('compareViewBtn').className = 'btn';
            
            // Initialize compare view if not already done
            if (allData.length > 0 && document.getElementById('team1CompareSelect').options.length === 0) {
                initializeCompareView();
            }
        }
        
        function initializeCompareView() {
            const kingdoms = [...new Set(allData.map(d => d['Home Server']))].sort((a, b) => a - b);
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
            const defaultKingdoms = [176, 266, 363];
            
            Array.from(team1Select.options).forEach(option => {
                option.selected = defaultKingdoms.includes(parseInt(option.value));
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
        
        function executeCompare() {
            const team1Select = document.getElementById('team1CompareSelect');
            const team2Select = document.getElementById('team2CompareSelect');
            
            team1Kingdoms = Array.from(team1Select.selectedOptions).map(option => parseInt(option.value));
            team2Kingdoms = Array.from(team2Select.selectedOptions).map(option => parseInt(option.value));
            
            if (team1Kingdoms.length === 0 || team2Kingdoms.length === 0) {
                alert('Please select at least one kingdom for each team');
                return;
            }
            
            // Filter data for comparison
            const team1Data = allData.filter(row => row['Power'] >= 30000000 && team1Kingdoms.includes(row['Home Server']));
            const team2Data = allData.filter(row => row['Power'] >= 30000000 && team2Kingdoms.includes(row['Home Server']));
            
            showCompareResults(team1Data, team2Data);
        }
        
        function showCompareResults(team1Data, team2Data) {
            const calculateStats = (data) => {
                const totalPower = data.reduce((sum, d) => sum + d['Power'], 0);
                const avgPower = data.length > 0 ? totalPower / data.length : 0;
                const topPlayers = [...data].sort((a, b) => b['Power'] - a['Power']).slice(0, 10);
                
                return {
                    total: data.length,
                    totalPower: totalPower,
                    avgPower: avgPower,
                    totalKillsT1: data.reduce((sum, d) => sum + d['Killcount T1'], 0),
                    totalKillsT4: data.reduce((sum, d) => sum + d['Killcount T4'], 0),
                    totalKillsT5: data.reduce((sum, d) => sum + d['Killcount T5'], 0),
                    totalT4T5: data.reduce((sum, d) => sum + d['T4 +T5'], 0),
                    tanks: data.filter(d => d['Player Type'] === 'Tank').length,
                    dps: data.filter(d => d['Player Type'] === 'DPS').length,
                    avgWinRate: data
                        .filter(d => d['Win Rate (%)'] !== 'N/A')
                        .reduce((sum, d, _, arr) => sum + parseFloat(d['Win Rate (%)']) / arr.length, 0),
                    topPlayers: topPlayers
                };
            };
            
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
                            <p style="color: #95a5a6; text-align: center; margin-bottom: 20px;">Kingdoms: ${team1Kingdoms.join(', ')}</p>
                            
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
                            <p style="color: #95a5a6; text-align: center; margin-bottom: 20px;">Kingdoms: ${team2Kingdoms.join(', ')}</p>
                            
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
        
        function clearCompareSelection() {
            document.getElementById('team1CompareSelect').selectedIndex = -1;
            document.getElementById('team2CompareSelect').selectedIndex = -1;
            document.getElementById('compareResults').style.display = 'none';
        }

        // Add event listeners
        document.getElementById('searchInput').addEventListener('input', () => {
            clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(applyFilters, 300);
        });
        
        // Apply filters when dropdowns change
        document.getElementById('kingdomFilter').addEventListener('change', applyFilters);
        document.getElementById('playerTypeFilter').addEventListener('change', applyFilters);
        
        function resetSort() {
            multiSortMode = true;
            sortColumn = 'Home Server';
            sortDirection = 'asc';
            applyMultiSort();
        }
        
        // Add Compare mode functions
        function toggleCompareMode() {
            compareMode = !compareMode;
            const compareSection = document.getElementById('compareSection');
            compareSection.style.display = compareMode ? 'block' : 'none';
            
            if (compareMode) {
                initializeCompareSelects();
                // Set default compare on first open
                setDefaultCompare();
            }
            
            applyFilters();
        }
        
        function initializeCompareSelects() {
            const kingdoms = [...new Set(allData.map(d => d['Home Server']))].sort((a, b) => a - b);
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
            
            // Default Team 1: Kingdoms 176, 266, 363
            const defaultTeam1 = [176, 266, 363];
            
            // Set Team 1 selections
            Array.from(team1Select.options).forEach(option => {
                option.selected = defaultTeam1.includes(parseInt(option.value));
            });
            
            // Set Team 2 to all remaining kingdoms
            const allKingdoms = Array.from(team1Select.options).map(opt => parseInt(opt.value));
            const remainingKingdoms = allKingdoms.filter(k => !defaultTeam1.includes(k));
            
            Array.from(team2Select.options).forEach(option => {
                option.selected = remainingKingdoms.includes(parseInt(option.value));
            });
            
            // Apply the comparison
            applyCompare();
        }
        
        function applyCompare() {
            const team1Select = document.getElementById('team1Select');
            const team2Select = document.getElementById('team2Select');
            
            team1Kingdoms = Array.from(team1Select.selectedOptions).map(option => parseInt(option.value));
            team2Kingdoms = Array.from(team2Select.selectedOptions).map(option => parseInt(option.value));
            
            if (team1Kingdoms.length === 0 || team2Kingdoms.length === 0) {
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
            const team1Data = allData.filter(row => row['Power'] >= 30000000 && team1Kingdoms.includes(row['Home Server']));
            const team2Data = allData.filter(row => row['Power'] >= 30000000 && team2Kingdoms.includes(row['Home Server']));
            
            const calculateStats = (data) => {
                const totalPower = data.reduce((sum, d) => sum + d['Power'], 0);
                const avgPower = data.length > 0 ? totalPower / data.length : 0;
                
                return {
                    total: data.length,
                    totalPower: totalPower,
                    avgPower: avgPower,
                    totalKillsT1: data.reduce((sum, d) => sum + d['Killcount T1'], 0),
                    totalKillsT4: data.reduce((sum, d) => sum + d['Killcount T4'], 0),
                    totalKillsT5: data.reduce((sum, d) => sum + d['Killcount T5'], 0),
                    totalT4T5: data.reduce((sum, d) => sum + d['T4 +T5'], 0),
                    totalDead: data.reduce((sum, d) => sum + d['Units Dead'], 0),
                    totalHealed: data.reduce((sum, d) => sum + d['Units Healed'], 0),
                    totalManaSpent: data.reduce((sum, d) => sum + d['Mana Spent'], 0),
                    tanks: data.filter(d => d['Player Type'] === 'Tank').length,
                    dps: data.filter(d => d['Player Type'] === 'DPS').length,
                    avgWinRate: data
                        .filter(d => d['Win Rate (%)'] !== 'N/A')
                        .reduce((sum, d, _, arr) => sum + parseFloat(d['Win Rate (%)']) / arr.length, 0)
                };
            };
            
            const team1Stats = calculateStats(team1Data);
            const team2Stats = calculateStats(team2Data);
            
            const compareStatsDiv = document.getElementById('compareStats');
            compareStatsDiv.style.display = 'block';
            compareStatsDiv.innerHTML = `
                <div style="background: #2c3e50; padding: 20px; border-radius: 8px; margin-top: 20px;">
                    <h4 style="color: #ecf0f1; text-align: center; margin-bottom: 20px;">⚔️ Team Comparison Statistics</h4>
                    
                                        <div style="color: #3498db; text-align: center; font-size: 1.3em; margin-bottom: 15px;">
                                            <strong>Team 1</strong><br/>
                                            <span style="font-size: 0.8em; color: #95a5a6;">Kingdoms: ${team1Kingdoms.join(', ')}</span>
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
                                            <span style="font-size: 0.8em; color: #95a5a6;">Kingdoms: ${team2Kingdoms.join(', ')}</span>
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
                
        function loadRepoFile() {
            const fileName = document.getElementById('repoFileSelect').value;
            document.getElementById('fileName').textContent = `Loading file: ${fileName}...`;
            
            // Encode filename to handle spaces
            const encodedFileName = encodeURIComponent(fileName);
            
            // Try different approaches to load the file
            const loadFile = async () => {
                try {
                    // First try with encoded filename
                    let response = await fetch(encodedFileName);
                    if (!response.ok) {
                        // Try with original filename
                        response = await fetch(fileName);
                    }
                    if (!response.ok) {
                        // Try with ./ prefix
                        response = await fetch('./' + fileName);
                    }
                    if (!response.ok) {
                        // Try with ./ and encoded
                        response = await fetch('./' + encodedFileName);
                    }
                    
                    if (response.ok) {
                        const data = await response.text();
                        document.getElementById('fileName').textContent = `File loaded: ${fileName}`;
                        parseCSV(data);
                    } else {
                        throw new Error('Failed to load file from all attempted paths');
                    }
                } catch (error) {
                    console.error('Error loading file:', error);
                    document.getElementById('fileName').textContent = `Error: Cannot load file. Please choose file from computer instead.`;
                    
                    // Automatically switch to local file option
                    document.getElementById('localFile').checked = true;
                    document.getElementById('repoFileDiv').style.display = 'none';
                    document.getElementById('localFileDiv').style.display = 'block';
                }
            };  
            loadFile();
        }