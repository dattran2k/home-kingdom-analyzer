// Chart Toggle Component
export class ChartToggle {
    constructor() {
        this.chartShown = false;
        this.chartType = 'configurable'; // 'simple' or 'configurable'
    }
    
    toggle() {
        this.chartShown = !this.chartShown;
        
        if (this.chartType === 'simple') {
            // Use the original chart manager
            if (window.chartManager) {
                window.chartManager.toggleChart();
            }
        } else {
            // Use the new configurable chart container
            if (window.chartContainer) {
                window.chartContainer.toggle();
            }
        }
        
        // Update button text
        const button = document.querySelector('.chart-controls button');
        if (button) {
            button.textContent = this.chartShown ? '📊 Hide Chart' : '📊 Show Chart';
        }
    }
    
    /**
     * Set chart type to use
     * @param {string} type - Chart type ('simple' or 'configurable')
     */
    setChartType(type) {
        this.chartType = type === 'simple' ? 'simple' : 'configurable';
        
        // Hide both charts initially
        if (window.chartManager) {
            const chartSection = document.getElementById('chartSection');
            if (chartSection) {
                chartSection.style.display = 'none';
            }
        }
        
        if (window.chartContainer) {
            window.chartContainer.hide();
        }
        
        // Reset chart shown state
        this.chartShown = false;
        
        // Update button text
        const button = document.querySelector('.chart-controls button');
        if (button) {
            button.textContent = '📊 Show Chart';
        }
        
        console.log('Chart type set to:', this.chartType);
    }
}

// Create singleton instance and expose to window
export const chartToggle = new ChartToggle();
window.chartToggle = chartToggle;
