// Chart Toggle Component
export class ChartToggle {
    constructor() {
        this.chartShown = false;
    }
    
    toggle() {
        if (!window.chartManager) return;
        
        this.chartShown = !this.chartShown;
        window.chartManager.toggleChart();
        
        // Update button text
        const button = document.querySelector('.chart-controls button');
        if (button) {
            button.innerHTML = this.chartShown ? '📊 Hide Chart' : '📊 Show Chart';
        }
    }
}

// Create singleton instance and expose to window
export const chartToggle = new ChartToggle();
window.chartToggle = chartToggle;
