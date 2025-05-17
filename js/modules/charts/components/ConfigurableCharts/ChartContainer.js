// Chart Container Component
import { ChartConfig } from './ChartConfig.js';
import { ChartRenderer } from './ChartRenderer.js';
import { appState } from '../../../state.js';

export class ChartContainer {
    constructor() {
        this.charts = [
            new ChartConfig(1, '', ''),  // Empty default values so they'll be set dynamically
            new ChartConfig(2, '', ''),
            new ChartConfig(3, '', ''),
            new ChartConfig(4, '', '')
        ];
        
        this.renderers = [];
        this.dataColumns = [];
        this.initialized = false;
    }
    
    /**
     * Initialize the chart container
     */
    initialize() {
        if (this.initialized) return;
        
        this.createChartContainerUI();
        this.initializeChartRenderers();
        this.initialized = true;
    }
    
    /**
     * Create the UI for the chart container
     */
    createChartContainerUI() {
        // Find the right position to insert the chart container
        const statsContainer = document.getElementById('statsContainer');
        if (!statsContainer) return;
        
        // Create chart container element
        const chartContainer = document.createElement('div');
        chartContainer.id = 'configChartContainer';
        chartContainer.className = 'config-chart-container';
        
        // Create header area
        const headerArea = document.createElement('div');
        headerArea.className = 'chart-header-area';
        headerArea.innerHTML = `
            <h3>📊 Data Visualization</h3>
            <p>Configure and view up to four different charts</p>
        `;
        
        // Create grid for charts
        const chartGrid = document.createElement('div');
        chartGrid.className = 'chart-grid';
        
        // Create four chart sections
        this.charts.forEach(chart => {
            const chartSection = document.createElement('div');
            chartSection.className = 'chart-section-config';
            chartSection.dataset.chartId = chart.id;
            
            const chartHeader = document.createElement('div');
            chartHeader.className = 'chart-section-header';
            
            // Create column selectors
            const columnSelectors = document.createElement('div');
            columnSelectors.className = 'chart-column-selectors';
            
            // X-axis selector
            const xAxisSelector = document.createElement('div');
            xAxisSelector.className = 'chart-axis-selector';
            xAxisSelector.innerHTML = `
                <label for="chart-${chart.id}-x-axis">X Axis:</label>
                <select id="chart-${chart.id}-x-axis" class="chart-axis-select" data-chart-id="${chart.id}" data-axis="x">
                    <option value="">Loading...</option>
                </select>
            `;
            
            // Y-axis selector
            const yAxisSelector = document.createElement('div');
            yAxisSelector.className = 'chart-axis-selector';
            yAxisSelector.innerHTML = `
                <label for="chart-${chart.id}-y-axis">Y Axis:</label>
                <select id="chart-${chart.id}-y-axis" class="chart-axis-select" data-chart-id="${chart.id}" data-axis="y">
                    <option value="">Loading...</option>
                </select>
            `;
            
            // Add selectors to header
            columnSelectors.appendChild(xAxisSelector);
            columnSelectors.appendChild(yAxisSelector);
            
            // Chart title
            const chartTitle = document.createElement('h4');
            chartTitle.className = 'chart-title';
            chartTitle.textContent = `Chart ${chart.id}`;
            
            // Add elements to header
            chartHeader.appendChild(chartTitle);
            chartHeader.appendChild(columnSelectors);
            
            // Create chart canvas container
            const chartCanvasContainer = document.createElement('div');
            chartCanvasContainer.className = 'chart-canvas-container';
            chartCanvasContainer.id = `chart-canvas-container-${chart.id}`;
            
            // Add header and canvas container to section
            chartSection.appendChild(chartHeader);
            chartSection.appendChild(chartCanvasContainer);
            
            // Add chart section to grid
            chartGrid.appendChild(chartSection);
        });
        
        // Add header and grid to container
        chartContainer.appendChild(headerArea);
        chartContainer.appendChild(chartGrid);
        
        // Insert container after stats
        statsContainer.parentNode.insertBefore(chartContainer, statsContainer.nextSibling);
        
        // Add event listeners for axis selectors
        document.querySelectorAll('.chart-axis-select').forEach(select => {
            select.addEventListener('change', this.handleAxisChange.bind(this));
        });
        
        // Add styles
        this.addChartStyles();
    }
    
    /**
     * Add styles for the chart container
     */
    addChartStyles() {
        // Check if styles already exist
        if (document.getElementById('chart-container-styles')) return;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'chart-container-styles';
        styleElement.textContent = `
            .config-chart-container {
                background: #2c3e50;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 30px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            
            .chart-header-area {
                margin-bottom: 20px;
            }
            
            .chart-header-area h3 {
                color: #ecf0f1;
                margin-bottom: 5px;
            }
            
            .chart-header-area p {
                color: #95a5a6;
                font-size: 0.9em;
                margin: 0;
            }
            
            .chart-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(2, 480px); /* Match the max-height of section-config */
                gap: 20px;
            }
            
            .chart-section-config {
                background: #34495e;
                border-radius: 8px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                height: auto;
                min-height: 450px;
                max-height: 480px; /* Taller to fit chart and axis */
                overflow: hidden; /* Prevent content from overflowing */
            }
            
            .chart-section-header {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .chart-title {
                color: #ecf0f1;
                margin: 0;
                font-size: 1.1em;
            }
            
            .chart-column-selectors {
                display: flex;
                gap: 15px;
                justify-content: space-between;
            }
            
            .chart-axis-selector {
                display: flex;
                flex-direction: column;
                gap: 5px;
                flex: 1;
            }
            
            .chart-axis-selector label {
                color: #bdc3c7;
                font-size: 0.9em;
                font-weight: bold;
            }
            
            .chart-axis-select {
                padding: 6px 10px;
                background: #2c3e50;
                color: #ecf0f1;
                border: 1px solid #3498db;
                border-radius: 4px;
                font-size: 0.9em;
                width: 100%;
            }
            
            .chart-canvas-container {
                flex: 1;
                overflow: hidden;
                position: relative;
                border-radius: 4px;
                background: #2c3e50;
                margin-top: 5px;
                min-height: 350px; /* Ensure minimum height for better visualization */
                max-height: 400px; /* Limit maximum height to prevent overflow */
            }
            
            .chart-scroll-container {
                overflow: auto;
                height: 100%;
                width: 100%;
                position: relative;
                max-height: 380px; /* Limit maximum height to prevent overflow */
            }
            
            @media (max-width: 768px) {
                .chart-grid {
                    grid-template-columns: 1fr;
                    grid-template-rows: repeat(4, 300px);
                }
            }
        `;
        
        document.head.appendChild(styleElement);
    }
    
    /**
     * Initialize chart renderers
     */
    initializeChartRenderers() {
        this.charts.forEach(config => {
            const containerId = `chart-canvas-container-${config.id}`;
            const renderer = new ChartRenderer(containerId, config);
            this.renderers.push(renderer);
        });
    }
    
    /**
     * Handle axis change event
     * @param {Event} event - Change event
     */
    handleAxisChange(event) {
        const select = event.target;
        const chartId = parseInt(select.dataset.chartId);
        const axis = select.dataset.axis;
        const value = select.value;
        
        const chart = this.charts.find(c => c.id === chartId);
        if (!chart) return;
        
        if (axis === 'x') {
            chart.xAxis = value;
        } else if (axis === 'y') {
            chart.yAxis = value;
        }
        
        this.updateChart(chartId);
    }
    
    /**
     * Update chart with new configuration
     * @param {number} chartId - Chart ID
     */
    updateChart(chartId) {
        const renderer = this.renderers.find(r => r.config.id === chartId);
        if (renderer) {
            renderer.render(this.getData());
        }
    }
    
    /**
     * Set data for all charts
     * @param {Array} data - Chart data
     */
    setData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return;
        
        // Get selected columns from UI to use as Y-axis defaults
        this.autoSelectYAxes();
        
        this.updateAxisOptions(data);
        
        // Render all charts
        this.renderers.forEach(renderer => {
            renderer.render(data);
        });
    }
    
    /**
     * Auto select Y axes based on the selected columns in UI
     */
    autoSelectYAxes() {
        // Get current selected columns from appState
        const selectedColumns = appState.currentColumns;
        if (!selectedColumns || selectedColumns.length === 0) return;
        
        // Find ID column as default X-axis (or first string column as fallback)
        let defaultXAxis = '';
        const stringColumns = selectedColumns.filter(col => {
            const lcCol = col.toLowerCase();
            return lcCol.includes('name') || 
                   lcCol.includes('id') || 
                   lcCol.includes('alliance') ||
                   lcCol.includes('server') ||
                   lcCol.includes('kingdom');
        });
        
        if (stringColumns.length > 0) {
            // Prioritize governor_id if available
            const idCol = stringColumns.find(col => col.toLowerCase().includes('governor') && col.toLowerCase().includes('id'));
            defaultXAxis = idCol || stringColumns[0];
        }
        
        // Filter out string columns for Y axes
        const numberColumns = selectedColumns.filter(col => {
            const lcCol = col.toLowerCase();
            return !lcCol.includes('name') && 
                   !lcCol.includes('id') && 
                   !lcCol.includes('alliance') &&
                   !lcCol.includes('server') &&
                   !lcCol.includes('kingdom');
        });
        
        if (numberColumns.length === 0) return;
        
        // Assign columns to charts
        const numCharts = Math.min(this.charts.length, numberColumns.length);
        for (let i = 0; i < numCharts; i++) {
            // Set X axis if not already set
            if (!this.charts[i].xAxis && defaultXAxis) {
                this.charts[i].xAxis = defaultXAxis;
            }
            
            // Set Y axis if not already set
            if (!this.charts[i].yAxis) {
                this.charts[i].yAxis = numberColumns[i];
            }
        }
        
        console.log('Auto-selected X axis:', defaultXAxis);
        console.log('Auto-selected Y axes:', this.charts.map(c => c.yAxis));
    }
    
    /**
     * Update axis options based on data
     * @param {Array} data - Chart data
     */
    updateAxisOptions(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return;
        
        // Get all possible columns from data
        const firstRow = data[0];
        const stringColumns = [];
        const numericColumns = [];
        
        // Categorize columns
        for (const key in firstRow) {
            if (this.isStringColumn(data, key)) {
                stringColumns.push({
                    value: key,
                    label: key
                });
            } else if (this.isNumericColumn(data, key)) {
                numericColumns.push({
                    value: key,
                    label: key
                });
            }
        }
        
        // Update select options
        this.charts.forEach(chart => {
            const xSelect = document.getElementById(`chart-${chart.id}-x-axis`);
            const ySelect = document.getElementById(`chart-${chart.id}-y-axis`);
            
            if (xSelect) {
                // Update X-axis options (string columns)
                this.updateSelectOptions(xSelect, stringColumns, chart.xAxis);
            }
            
            if (ySelect) {
                // Update Y-axis options (numeric columns)
                this.updateSelectOptions(ySelect, numericColumns, chart.yAxis);
            }
        });
    }
    
    /**
     * Update select options
     * @param {HTMLSelectElement} select - Select element
     * @param {Array} options - Options array
     * @param {string} currentValue - Current selected value
     */
    updateSelectOptions(select, options, currentValue) {
        // Clear existing options
        select.innerHTML = '';
        
        // Add new options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            
            // Set selected if matches current value
            if (option.value === currentValue) {
                optionElement.selected = true;
            }
            
            select.appendChild(optionElement);
        });
        
        // If current value not in options, select first option
        if (currentValue && !options.some(opt => opt.value === currentValue) && select.options.length > 0) {
            select.selectedIndex = 0;
            
            // Update config with new value
            const chartId = parseInt(select.dataset.chartId);
            const axis = select.dataset.axis;
            const chart = this.charts.find(c => c.id === chartId);
            
            if (chart) {
                if (axis === 'x') {
                    chart.xAxis = select.value;
                } else if (axis === 'y') {
                    chart.yAxis = select.value;
                }
            }
        }
    }
    
    /**
     * Check if column contains string values
     * @param {Array} data - Data array
     * @param {string} key - Column key
     * @returns {boolean} - True if column contains strings
     */
    isStringColumn(data, key) {
        // Sample first few rows
        const sampleSize = Math.min(10, data.length);
        let stringCount = 0;
        
        for (let i = 0; i < sampleSize; i++) {
            const value = data[i][key];
            if (typeof value === 'string' && isNaN(parseFloat(value))) {
                stringCount++;
            }
        }
        
        // Consider it a string column if majority of samples are strings
        return stringCount >= sampleSize / 2;
    }
    
    /**
     * Check if column contains numeric values
     * @param {Array} data - Data array
     * @param {string} key - Column key
     * @returns {boolean} - True if column contains numbers
     */
    isNumericColumn(data, key) {
        // Sample first few rows
        const sampleSize = Math.min(10, data.length);
        let numericCount = 0;
        
        for (let i = 0; i < sampleSize; i++) {
            const value = data[i][key];
            if (value !== null && value !== undefined && !isNaN(parseFloat(value))) {
                numericCount++;
            }
        }
        
        // Consider it a numeric column if majority of samples are numbers
        return numericCount >= sampleSize / 2;
    }
    
    /**
     * Get data for charts
     * @returns {Array} - Filtered data for charts
     */
    getData() {
        return appState.data;
    }
    
    /**
     * Highlight a player in all charts
     * @param {string} playerId - Player ID to highlight
     */
    highlightPlayer(playerId) {
        // Not implemented yet, but will be in future updates
        console.log('Highlight player in configurable charts:', playerId);
    }
    
    /**
     * Show chart container
     */
    show() {
        const container = document.getElementById('configChartContainer');
        if (container) {
            container.style.display = 'block';
        }
        
        // Initialize if not already
        if (!this.initialized) {
            this.initialize();
        }
        
        // Render charts with current data
        this.setData(this.getData());
    }
    
    /**
     * Hide chart container
     */
    hide() {
        const container = document.getElementById('configChartContainer');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    /**
     * Toggle chart container visibility
     */
    toggle() {
        const container = document.getElementById('configChartContainer');
        if (container) {
            if (container.style.display === 'none') {
                this.show();
            } else {
                this.hide();
            }
        } else {
            this.show();
        }
    }
}

// Create singleton instance
export const chartContainer = new ChartContainer();
