// Chart visualization module
import { appState } from '../state.js';
import { formatNumber } from '../ui.js';

export class ChartManager {
    constructor() {
        this.chart = null;
        this.selectedMetric = 'power';
        this.highlightedPlayer = null;
        this.initializeChart();
    }
    
    initializeChart() {
        // Create chart container in the UI
        const mainContent = document.getElementById('mainContent');
        const controlsDiv = document.querySelector('.controls');
        
        const chartSection = document.createElement('div');
        chartSection.id = 'chartSection';
        chartSection.className = 'chart-section';
        chartSection.style.display = 'none';
        
        chartSection.innerHTML = `
            <h3>📊 Data Visualization</h3>
            <div class="chart-controls">
                <label for="metricSelect">Y-Axis Metric:</label>
                <select id="metricSelect" onchange="window.chartManager.updateMetric(this.value)">
                    <!-- Options will be dynamically populated -->
                </select>
                <button class="btn btn-secondary" onclick="window.chartManager.toggleChart()">Hide Chart</button>
            </div>
            <div id="chartContainer" style="height: 600px; overflow-y: auto;">
                <canvas id="dataChart"></canvas>
            </div>
        `;
        
        mainContent.insertBefore(chartSection, controlsDiv.nextSibling);
    }
    
    toggleChart() {
        const chartSection = document.getElementById('chartSection');
        if (chartSection.style.display === 'none') {
            chartSection.style.display = 'block';
            this.updateMetricOptions();
            this.updateChart();
        } else {
            chartSection.style.display = 'none';
        }
    }
    
    updateMetricOptions() {
        const select = document.getElementById('metricSelect');
        select.innerHTML = '';
        
        // Get all numeric columns from the data
        if (appState.headers) {
            appState.headers.forEach(header => {
                // Skip ID columns and non-numeric columns
                const lowerHeader = header.toLowerCase();
                if (!lowerHeader.includes('name') && !lowerHeader.includes('tag')) {
                    // Check if column has numeric data
                    const hasNumericData = appState.data.some(row => {
                        const value = row[header];
                        return !isNaN(parseFloat(value));
                    });
                    
                    if (hasNumericData) {
                        const option = document.createElement('option');
                        option.value = header;
                        option.textContent = header;
                        if (header === this.selectedMetric || 
                            (lowerHeader.includes(this.selectedMetric.toLowerCase()))) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    }
                }
            });
        }
        
        this.selectedMetric = select.value;
    }
    
    updateMetric(metric) {
        this.selectedMetric = metric;
        this.updateChart();
    }
    
    updateChart() {
        const canvas = document.getElementById('dataChart');
        const ctx = canvas.getContext('2d');
        
        // Get data
        const data = appState.data.filter(row => !row.is_change_detail);
        
        // Sort by selected metric
        data.sort((a, b) => {
            const valA = parseFloat(a[this.selectedMetric]) || 0;
            const valB = parseFloat(b[this.selectedMetric]) || 0;
            return valB - valA;
        });
        
        // Prepare chart data
        const labels = data.map(row => {
            const nameCol = appState.headers.find(h => 
                h.toLowerCase().includes('name') && !h.toLowerCase().includes('alliance')
            );
            return row[nameCol] || 'Unknown';
        });
        const values = data.map(row => parseFloat(row[this.selectedMetric]) || 0);
        
        // Set canvas size for vertical chart
        const barHeight = 25;
        const spacing = 5;
        const chartHeight = (barHeight + spacing) * data.length + 50;
        canvas.height = chartHeight;
        canvas.width = 800;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw chart (horizontal bars, vertical layout)
        const maxValue = Math.max(...values) || 1;
        const chartWidth = 600;
        const leftMargin = 150;
        const rightMargin = 50;
        
        data.forEach((row, index) => {
            const y = index * (barHeight + spacing) + spacing;
            const value = values[index];
            const barWidth = (value / maxValue) * chartWidth;
            
            // Get kingdom for color
            const kingdomCol = appState.headers.find(h => 
                h.toLowerCase().includes('kingdom') || 
                h.toLowerCase().includes('server')
            );
            const kingdom = row[kingdomCol];
            const color = this.getKingdomColor(kingdom);
            
            // Draw bar
            ctx.fillStyle = color;
            ctx.fillRect(leftMargin, y, barWidth, barHeight);
            
            // Highlight selected player
            if (this.highlightedPlayer === row.governor_id) {
                ctx.strokeStyle = '#e74c3c';
                ctx.lineWidth = 3;
                ctx.strokeRect(leftMargin - 2, y - 2, barWidth + 4, barHeight + 4);
            }
            
            // Draw name on left
            ctx.fillStyle = '#ecf0f1';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(labels[index], leftMargin - 10, y + barHeight/2 + 4);
            
            // Draw value on right
            ctx.fillStyle = '#ecf0f1';
            ctx.textAlign = 'left';
            ctx.fillText(formatNumber(value), leftMargin + barWidth + 5, y + barHeight/2 + 4);
        });
        
        // Draw axis
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftMargin, 0);
        ctx.lineTo(leftMargin, chartHeight);
        ctx.stroke();
        
        // Add title
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.selectedMetric, canvas.width/2, chartHeight - 10);
    }
    
    getKingdomColor(kingdom) {
        const colors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
            '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
            '#95a5a6', '#d35400'
        ];
        const kingdomNum = parseInt(kingdom) || 0;
        return colors[kingdomNum % colors.length];
    }
    
    highlightPlayer(playerId) {
        // Find the player ID column
        const idCol = appState.headers.find(h => {
            const lower = h.toLowerCase();
            return (lower.includes('governor') && lower.includes('id')) ||
                   (lower.includes('lord') && lower.includes('id')) ||
                   lower === 'id';
        });
        
        if (idCol) {
            this.highlightedPlayer = playerId;
            if (document.getElementById('chartSection').style.display !== 'none') {
                this.updateChart();
                this.scrollToPlayer(playerId);
            }
        }
    }
    
    scrollToPlayer(playerId) {
        const data = appState.data.filter(row => !row.is_change_detail);
        
        // Find the player ID column
        const idCol = appState.headers.find(h => {
            const lower = h.toLowerCase();
            return (lower.includes('governor') && lower.includes('id')) ||
                   (lower.includes('lord') && lower.includes('id')) ||
                   lower === 'id';
        });
        
        if (!idCol) return;
        
        const playerIndex = data.findIndex(row => row[idCol] === playerId);
        
        if (playerIndex !== -1) {
            const container = document.getElementById('chartContainer');
            const barHeight = 25;
            const spacing = 5;
            const playerY = playerIndex * (barHeight + spacing);
            
            // Scroll to center the player
            container.scrollTop = playerY - container.clientHeight / 2 + barHeight / 2;
        }
    }
    
    onSortChange(sortField) {
        // Update metric to match sort field if it exists in options
        if (appState.headers && appState.headers.includes(sortField)) {
            const select = document.getElementById('metricSelect');
            if (select) {
                const option = Array.from(select.options).find(opt => opt.value === sortField);
                if (option) {
                    this.selectedMetric = sortField;
                    select.value = sortField;
                    this.updateChart();
                }
            }
        }
    }
}

// Create global instance
export const chartManager = new ChartManager();

// Expose to window for event handlers
window.chartManager = chartManager;
