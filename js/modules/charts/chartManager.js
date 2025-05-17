// Chart visualization module
import { appState } from '../state.js';
import { formatNumber } from '../ui.js';
import { chartContainer } from './components/ConfigurableCharts/index.js';

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
        const configChartContainer = document.getElementById('configChartContainer');
        
        // Hide configurable charts if they're visible
        if (configChartContainer && configChartContainer.style.display === 'block') {
            chartContainer.hide();
        }
        
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
        
        // Draw x-axis with ticks
        this.drawXAxis(ctx, leftMargin, chartHeight - 30, chartWidth, maxValue);
        
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
        
        // Draw y axis
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftMargin, 0);
        ctx.lineTo(leftMargin, chartHeight - 30);
        ctx.stroke();
        
        // Add title
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.selectedMetric, canvas.width/2, chartHeight - 10);
    }
    
    /**
     * Draw X axis with ticks based on maximum value
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X coordinate to start
     * @param {number} y - Y coordinate
     * @param {number} width - Width of axis
     * @param {number} maxValue - Maximum value
     */
    drawXAxis(ctx, x, y, width, maxValue) {
        // Draw axis line
        ctx.strokeStyle = '#95a5a6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();
        
        // Calculate nice rounded max value and ticks
        const roundedMax = this.roundMaxValue(maxValue);
        
        // Calculate optimal number of ticks based on chart width
        // For wider charts, show more ticks
        const numTicks = Math.min(Math.max(Math.floor(width / 120), 4), 8);
        const tickStep = roundedMax / numTicks;
        
        // Draw ticks
        ctx.textAlign = 'center';
        ctx.fillStyle = '#95a5a6';
        ctx.font = '11px Arial';
        
        for (let i = 0; i <= numTicks; i++) {
            const value = i * tickStep;
            const xPos = x + (value / roundedMax) * width;
            
            // Draw tick line
            ctx.beginPath();
            ctx.moveTo(xPos, y);
            ctx.lineTo(xPos, y + 5);
            ctx.stroke();
            
            // Draw tick label
            ctx.fillText(this.formatAxisValue(value), xPos, y + 18);
        }
    }
    
    /**
     * Round max value to a nice number for axis display
     * @param {number} value - Maximum value to round
     * @returns {number} - Rounded max value
     */
    roundMaxValue(value) {
        // Return 0 for invalid values
        if (!value || value <= 0) return 0;
        
        // Calculate the magnitude (power of 10) of the value
        const magnitude = Math.floor(Math.log10(value));
        
        // Calculate a nice base increment based on the magnitude
        let baseIncrement;
        
        // Use different nice numbers based on the magnitude
        if (magnitude <= 1) { // Values < 100
            baseIncrement = Math.pow(10, magnitude) / 2;
        } else if (magnitude <= 2) { // Values < 1,000
            baseIncrement = Math.pow(10, magnitude) / 4;
        } else if (magnitude <= 4) { // Values < 100,000
            baseIncrement = Math.pow(10, magnitude - 1) * 2;
        } else if (magnitude <= 6) { // Values < 10,000,000
            baseIncrement = Math.pow(10, magnitude - 1) * 2;
        } else if (magnitude <= 8) { // Values < 1,000,000,000
            baseIncrement = Math.pow(10, magnitude - 1) * 2;
        } else { // Values >= 1,000,000,000
            baseIncrement = Math.pow(10, magnitude - 1) * 2;
        }
        
        // Round up to the next nice number that's > value
        return Math.ceil(value / baseIncrement) * baseIncrement;
    }
    
    /**
     * Format a value for axis display with appropriate units (K, M, B)
     * @param {number} value - Value to format
     * @returns {string} - Formatted value with unit
     */
    formatAxisValue(value) {
        if (value === 0) return '0';
        
        // Get the magnitude (power of 10) to determine appropriate format
        const magnitude = Math.abs(value) >= 1 ? Math.floor(Math.log10(Math.abs(value))) : 0;
        
        // For values less than 1000, show with appropriate precision
        if (Math.abs(value) < 1000) {
            // For small values (less than 10), show one decimal place
            if (Math.abs(value) < 10) {
                return value.toFixed(1);
            }
            return Math.round(value).toString();
        }
        
        // For thousands (1K to 999K)
        if (magnitude >= 3 && magnitude < 6) {
            const rounded = Math.abs(value) / 1000;
            // Format with decimal if needed for precision
            return (value < 0 ? '-' : '') + 
                (rounded < 10 ? rounded.toFixed(1) : Math.round(rounded)) + 'K';
        }
        
        // For millions (1M to 999M)
        if (magnitude >= 6 && magnitude < 9) {
            const rounded = Math.abs(value) / 1000000;
            return (value < 0 ? '-' : '') + 
                (rounded < 10 ? rounded.toFixed(1) : Math.round(rounded)) + 'M';
        }
        
        // For billions (1B+)
        if (magnitude >= 9) {
            const rounded = Math.abs(value) / 1000000000;
            return (value < 0 ? '-' : '') + 
                (rounded < 10 ? rounded.toFixed(1) : Math.round(rounded)) + 'B';
        }
        
        // Fallback for any other cases
        return value.toString();
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
