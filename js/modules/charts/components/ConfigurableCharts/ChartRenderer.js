
// Import formatNumber from UI
import { formatNumber } from '../../../ui.js';

export class ChartRenderer {
    /**
     * Create a new chart renderer
     * @param {string} containerId - Container element ID
     * @param {ChartConfig} config - Chart configuration
     */
    constructor(containerId, config) {
        this.containerId = containerId;
        this.config = config;
        this.colorScheme = {
            't5_kills': '#ff6b6b',
            't4_kills': '#4a69bd',
            't4_t5': '#6ab04c',
            'victories': '#f0932b',
            'defeats': '#e74c3c',
            'power': '#9b59b6',
            'highest_power': '#1abc9c',
            'default': '#3498db'
        };
    }

    /**
     * Render chart with provided data
     * @param {Array} data - Data array
     */
    render(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            this.renderEmptyState();
            return;
        }

        // Get container
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Clear container
        container.innerHTML = '';

        // Check if we have valid axes
        if (!this.config.xAxis || !this.config.yAxis) {
            this.renderConfigNeededState();
            return;
        }

        // Process data for chart - show ALL data, not limited by maxDataPoints
        const chartData = this.processDataForChart(data);
        if (chartData.length === 0) {
            this.renderNoDataState();
            return;
        }
        
        // Configuration
        const margin = { top: 20, right: 50, bottom: 60, left: 120 }; // Reduced left margin by 25%
        const barHeight = 20;
        const barPadding = 5;
        
        // Calculate dimensions
        const width = Math.max(container.clientWidth - margin.left - margin.right, 400);
        // Set a height for the scroll container
        const scrollContainerHeight = 270; // Reduced height to leave space for X axis footer
        const axisFooterHeight = 60; // Increased height for X axis footer
        
        // Calculate full height based on data
        const dataHeight = chartData.length * (barHeight + barPadding);
        
        // Create wrapper to hold both scroll container and axis
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        chartWrapper.style.position = 'relative';
        chartWrapper.style.width = '100%';
        chartWrapper.style.border = '1px solid #3498db';
        chartWrapper.style.borderRadius = '4px';
        chartWrapper.style.background = '#2c3e50';
        container.appendChild(chartWrapper);

        // Create scroll container for chart data
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'chart-scroll-container';
        scrollContainer.style.height = scrollContainerHeight + 'px';
        scrollContainer.style.width = '100%';
        scrollContainer.style.overflow = 'auto';
        scrollContainer.style.overflowX = 'hidden'; // Disable horizontal scroll
        scrollContainer.style.position = 'relative';
        scrollContainer.style.marginBottom = '2px';
        chartWrapper.appendChild(scrollContainer);
        
        // Create SVG element for data
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgElement.setAttribute('width', '100%');
        svgElement.setAttribute('height', dataHeight + margin.top);
        svgElement.setAttribute('viewBox', `0 0 ${width + margin.left + margin.right} ${dataHeight + margin.top}`);
        svgElement.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        svgElement.style.minWidth = `${width + margin.left + margin.right}px`;
        scrollContainer.appendChild(svgElement);

        // Create chart group with margin
        const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        svgElement.appendChild(chartGroup);

        // Get max value for scaling
        const maxValue = Math.max(...chartData.map(d => d.y), 0.1);
        
        // Calculate a nice rounded max value for the axis
        const roundedMaxValue = this.roundMaxValue(maxValue);

        // Draw bars and labels
        chartData.forEach((d, i) => {
            const yPos = i * (barHeight + barPadding);
            
            // Calculate bar width based on actual data value relative to rounded max value
            // This ensures the bar length matches exactly with the axis
            const barWidth = Math.max((d.y / roundedMaxValue) * width, 0);

            // Calculate color based on position (gradient from darkest to lightest)
            // First item (rank 1) has the darkest color, then gradually gets lighter
            const colorIntensity = 1 - (i / (chartData.length > 1 ? chartData.length - 1 : 1) * 0.7);
            const baseColor = this.getBaseColor(this.config.yAxis);
            const barColor = this.adjustColorIntensity(baseColor, colorIntensity);

            // Draw bar
            const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bar.setAttribute('x', 0);
            bar.setAttribute('y', yPos);
            bar.setAttribute('width', barWidth);
            bar.setAttribute('height', barHeight);
            bar.setAttribute('fill', barColor);
            bar.setAttribute('rx', 2); // Rounded corners

            // X-axis label (name)
            const nameLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            nameLabel.setAttribute('x', -8);
            nameLabel.setAttribute('y', yPos + barHeight / 2 + 4);
            nameLabel.setAttribute('text-anchor', 'end');
            nameLabel.setAttribute('fill', '#ecf0f1');
            nameLabel.setAttribute('font-size', '11px');
            nameLabel.textContent = this.truncateText(d.x, 15); // Reduced to 75% of 20 = 15

            // Value label
            const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            // Calculate where to position the text label
            let textX, textAnchor, labelColor;
            const minBarWidthForInnerLabel = 150; // Minimum width to show label inside
            
            if (barWidth > minBarWidthForInnerLabel) {
                // If bar is long enough, position text inside the bar
                textX = barWidth - 10;
                textAnchor = 'end';
                labelColor = '#ffffff'; // White text on colored bar
            } else {
                // If bar is too short, position text outside
                textX = barWidth + 10;
                textAnchor = 'start';
                labelColor = '#ecf0f1'; // Default light text
            }
            
            valueLabel.setAttribute('x', textX);
            valueLabel.setAttribute('y', yPos + barHeight / 2 + 4);
            valueLabel.setAttribute('text-anchor', textAnchor);
            valueLabel.setAttribute('fill', labelColor);
            valueLabel.setAttribute('font-size', '12px');
            
            // Format value the same way as the table
            let formattedValue;
            if (typeof d.data.original_value !== 'undefined') {
                // Use original value if available (preserves format)
                formattedValue = d.data.original_value;
            } else if (typeof d.y === 'number' || !isNaN(parseFloat(d.y))) {
                // Keep the +/- sign for changes if this is a change row
                const isChangeRow = d.data && d.data.is_change_row;
                const valueStr = String(d.y);
                
                if (isChangeRow && (valueStr.startsWith('+') || valueStr.startsWith('-') || valueStr.startsWith('−'))) {
                    formattedValue = valueStr;
                    // Apply colors based on positive/negative
                    if (valueStr.startsWith('+')) {
                        valueLabel.setAttribute('fill', barWidth > minBarWidthForInnerLabel ? '#ffffff' : '#2ecc71');
                    } else if (valueStr.startsWith('-') || valueStr.startsWith('−')) {
                        valueLabel.setAttribute('fill', barWidth > minBarWidthForInnerLabel ? '#ffffff' : '#e74c3c');
                    }
                } else {
                    // Format numeric value without scaling it down
                    formattedValue = formatNumber(d.y);
                }
            } else {
                formattedValue = d.y !== undefined && d.y !== null ? String(d.y) : '-';
            }
            
            valueLabel.textContent = formattedValue;

            // Add elements to group
            chartGroup.appendChild(bar);
            chartGroup.appendChild(nameLabel);
            chartGroup.appendChild(valueLabel);
        });

        // Add Y axis title
        this.addYAxisTitle(chartGroup, dataHeight);

        // Create fixed footer for X axis
        const axisFooter = document.createElement('div');
        axisFooter.className = 'chart-axis-footer';
        axisFooter.style.width = '100%';
        axisFooter.style.height = axisFooterHeight + 'px';
        axisFooter.style.position = 'relative';
        axisFooter.style.background = '#2c3e50';
        axisFooter.style.borderTop = '1px solid #3498db';
        chartWrapper.appendChild(axisFooter);
        
        // Create SVG for X axis
        const axisSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        axisSvg.setAttribute('width', '100%');
        axisSvg.setAttribute('height', axisFooterHeight + 'px');
        axisSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        axisFooter.appendChild(axisSvg);
        
        // Create a group for X axis
        const axisGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        axisGroup.setAttribute('transform', `translate(${margin.left},10)`);
        axisSvg.appendChild(axisGroup);
        
        // Draw X-axis using the rounded max value that exactly matches the bar lengths
        this.drawXAxis(axisGroup, width, roundedMaxValue);

        // Add styles for scrolling
        this.addScrollStyles();
    }

    /**
     * Process data for chart
     * @param {Array} data - Raw data array
     * @returns {Array} - Processed data for chart
     */
    processDataForChart(data) {
        // Filter out invalid entries
        const validData = data.filter(item =>
            item &&
            item[this.config.xAxis] !== undefined &&
            item[this.config.yAxis] !== undefined &&
            !isNaN(parseFloat(String(item[this.config.yAxis]).replace(/[^0-9.-]/g, '')))
        );

        // Map data to chart format
        const chartData = validData.map(item => {
            // Get the original Y value before parsing
            const originalValue = item[this.config.yAxis];
            
            // Clean and parse the value for sorting and display purposes
            let parsedValue;
            if (typeof originalValue === 'string') {
                // Handle change values with +/- prefix
                if (originalValue.startsWith('+') || originalValue.startsWith('-') || originalValue.startsWith('−')) {
                    // For values like +123,456 or -123,456, remove commas for parsing
                    parsedValue = parseFloat(originalValue.replace(/,/g, ''));
                } else {
                    // For regular values, remove commas and other non-numeric characters
                    parsedValue = parseFloat(originalValue.replace(/[^0-9.-]/g, ''));
                }
            } else {
                parsedValue = parseFloat(originalValue);
            }
            
            return {
                x: String(item[this.config.xAxis]) || '',
                y: parsedValue || 0,
                data: {
                    ...item,
                    original_value: originalValue // Store original value for display
                }
            };
        });

        // Sort data by Y value
        const sortedData = [...chartData].sort((a, b) => {
            if (this.config.sortDirection === 'asc') {
                return a.y - b.y;
            } else {
                return b.y - a.y;
            }
        });

        // Return all data without limiting to maxDataPoints
        return sortedData;
    }

    /**
     * Draw X axis for the fixed footer
     * @param {SVGElement} group - SVG group element
     * @param {number} width - Chart width
     * @param {number} maxValue - Maximum data value
     */
    drawXAxis(group, width, maxValue) {
        // Draw axis line
        const axisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        axisLine.setAttribute('x1', 0);
        axisLine.setAttribute('y1', 0);
        axisLine.setAttribute('x2', width);
        axisLine.setAttribute('y2', 0);
        axisLine.setAttribute('stroke', '#95a5a6');
        axisLine.setAttribute('stroke-width', '1');
        group.appendChild(axisLine);
        
        // Calculate optimal number of ticks based on width
        // For wider charts, show more ticks
        let numTicks = Math.min(Math.max(Math.floor(width / 120), 4), 10);
        
        // Calculate nice rounded values for ticks
        const roundedMax = this.roundMaxValue(maxValue);
        
        // Calculate tick step based on rounded max and desired number of ticks
        const tickStep = roundedMax / numTicks;
        
        // Draw ticks
        for (let i = 0; i <= numTicks; i++) {
            const xPos = (i / numTicks) * width;
            const value = i * tickStep;

            // Tick line
            const tickLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            tickLine.setAttribute('x1', xPos);
            tickLine.setAttribute('y1', 0);
            tickLine.setAttribute('x2', xPos);
            tickLine.setAttribute('y2', 10); // Taller tick line
            tickLine.setAttribute('stroke', '#95a5a6');
            tickLine.setAttribute('stroke-width', '1');

            // Tick label
            const tickLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            tickLabel.setAttribute('x', xPos);
            tickLabel.setAttribute('y', 25); // Position further down
            tickLabel.setAttribute('text-anchor', 'middle');
            tickLabel.setAttribute('fill', '#ecf0f1');
            tickLabel.setAttribute('font-size', '12px');
            tickLabel.textContent = this.formatAxisValue(value);

            // Add to group
            group.appendChild(tickLine);
            group.appendChild(tickLabel);
        }

        // Add axis title
        const axisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
        axisTitle.setAttribute('x', width / 2);
        axisTitle.setAttribute('y', 45); // Position further down
        axisTitle.setAttribute('text-anchor', 'middle');
        axisTitle.setAttribute('fill', '#ecf0f1');
        axisTitle.setAttribute('font-size', '14px');
        axisTitle.setAttribute('font-weight', 'bold');
        axisTitle.textContent = this.config.yAxis;

        group.appendChild(axisTitle);
    }

    /**
     * Add Y axis title
     * @param {SVGElement} group - SVG group element
     * @param {number} height - Chart height
     */
    addYAxisTitle(group, height) {
        const axisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
        axisTitle.setAttribute('transform', `translate(-90, ${height / 2}) rotate(-90)`);
        axisTitle.setAttribute('text-anchor', 'middle');
        axisTitle.setAttribute('fill', '#ecf0f1');
        axisTitle.setAttribute('font-size', '12px');
        axisTitle.textContent = this.config.xAxis;

        group.appendChild(axisTitle);
    }

    /**
     * Render empty state when no data is available
     */
    renderEmptyState() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="chart-empty-state">
                <div class="empty-message">No data available</div>
            </div>
        `;

        this.addEmptyStateStyles();
    }

    /**
     * Render configuration needed state
     */
    renderConfigNeededState() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="chart-empty-state">
                <div class="empty-message">Select X and Y axes to display chart</div>
            </div>
        `;

        this.addEmptyStateStyles();
    }

    /**
     * Render no data state when filtered data is empty
     */
    renderNoDataState() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="chart-empty-state">
                <div class="empty-message">No data matches the current configuration</div>
            </div>
        `;

        this.addEmptyStateStyles();
    }

    /**
     * Add styles for empty state
     */
    addEmptyStateStyles() {
        // Check if styles already exist
        if (document.getElementById('chart-empty-state-styles')) return;

        const style = document.createElement('style');
        style.id = 'chart-empty-state-styles';
        style.textContent = `
            .chart-empty-state {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 4px;
            }

            .empty-message {
                color: #95a5a6;
                font-size: 14px;
                text-align: center;
                padding: 20px;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Add styles for scrolling
     */
    addScrollStyles() {
        // Check if styles already exist
        if (document.getElementById('chart-scroll-styles')) return;

        const style = document.createElement('style');
        style.id = 'chart-scroll-styles';
        style.textContent = `
            .chart-wrapper {
                display: flex;
                flex-direction: column;
                height: auto;
                overflow: hidden;
                margin-bottom: 15px; /* Add space at the bottom */
            }
            
            .chart-scroll-container {
                overflow-y: auto;
                overflow-x: hidden;
                width: 100%;
                position: relative;
                border: none;
            }

            .chart-scroll-container::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .chart-scroll-container::-webkit-scrollbar-track {
                background: #2c3e50;
                border-radius: 4px;
            }

            .chart-scroll-container::-webkit-scrollbar-thumb {
                background: #3498db;
                border-radius: 4px;
            }

            .chart-scroll-container::-webkit-scrollbar-thumb:hover {
                background: #2980b9;
            }
            
            .chart-axis-footer {
                border-bottom-left-radius: 4px;
                border-bottom-right-radius: 4px;
                padding-top: 2px;
                overflow: hidden;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Get the base color for a metric
     * @param {string} metric - Metric name
     * @returns {string} - Base color in hex format
     */
    getBaseColor(metric) {
        // Check for specific metrics
        for (const key in this.colorScheme) {
            if (metric.toLowerCase().includes(key.toLowerCase())) {
                return this.colorScheme[key];
            }
        }
        return this.colorScheme.default;
    }
    
    /**
     * Adjust color intensity to create a gradient effect
     * @param {string} hexColor - Base color in hex format (e.g. '#3498db')
     * @param {number} intensity - Intensity factor between 0 and 1
     * @returns {string} - Adjusted color in hex format
     */
    adjustColorIntensity(hexColor, intensity) {
        // Default to original color if intensity is invalid
        if (typeof intensity !== 'number' || intensity < 0 || intensity > 1) {
            return hexColor;
        }
        
        // Parse the hex color to RGB
        let r = parseInt(hexColor.substring(1, 3), 16);
        let g = parseInt(hexColor.substring(3, 5), 16);
        let b = parseInt(hexColor.substring(5, 7), 16);
        
        // Calculate new values by mixing with white (255,255,255) based on intensity
        r = Math.round(r * intensity + 255 * (1 - intensity));
        g = Math.round(g * intensity + 255 * (1 - intensity));
        b = Math.round(b * intensity + 255 * (1 - intensity));
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Truncate text if too long
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} - Truncated text
     */
    truncateText(text, maxLength) {
        if (!text) return '';

        if (text.length <= maxLength) {
            return text;
        }

        return text.substring(0, maxLength - 2) + '...';
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
}
