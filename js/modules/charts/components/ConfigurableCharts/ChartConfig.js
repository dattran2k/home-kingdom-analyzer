// Chart Configuration class
export class ChartConfig {
    /**
     * Create a new chart config
     * @param {number} id - Chart ID (1-4)
     * @param {string} yAxis - Default Y-axis column
     * @param {string} xAxis - Default X-axis column
     */
    constructor(id, yAxis = 'power', xAxis = 'name') {
        this.id = id;
        this.yAxis = yAxis;
        this.xAxis = xAxis;
        // No limit on data points - show all data with scrolling
        this.sortDirection = 'desc'; // 'asc' or 'desc'
    }
    
    /**
     * Toggle sort direction
     */
    toggleSortDirection() {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    }
    
    /**
     * Set maximum data points
     * @param {number} max - Maximum data points
     */
    setMaxDataPoints(max) {
        // This method is kept for backward compatibility
        // We no longer limit data points as we want to show all with scrolling
        console.log('setMaxDataPoints is deprecated - showing all data points with scrolling');
    }
    
    /**
     * Clone this configuration
     * @returns {ChartConfig} - Cloned configuration
     */
    clone() {
        const clone = new ChartConfig(this.id, this.yAxis, this.xAxis);
        clone.sortDirection = this.sortDirection;
        return clone;
    }
}
