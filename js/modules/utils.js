// Utility functions for the application
import { COLUMN_PATTERNS, KINGDOM_COLORS } from './constants.js';

/**
 * Formats a number with commas for display
 * @param {number|string} num - Number to format
 * @returns {string} Formatted number with commas
 */
export function formatNumber(num) {
    // Don't format ID values
    if (typeof num === 'string' && num.toLowerCase().includes('id')) {
        return num;
    }
    
    const number = parseFloat(num);
    if (isNaN(number)) return num;
    
    // Format with commas, preserve negative sign
    const isNegative = number < 0;
    const formattedNumber = Math.abs(number).toLocaleString('en-US');
    
    // Add negative sign or unicode minus for display
    return isNegative ? '−' + formattedNumber : formattedNumber;
}

/**
 * Determines a color for a value based on its relation to the average
 * @param {number} value - The value to color
 * @param {number} average - Average value for comparison
 * @param {boolean} isAboveGood - Whether higher values are better
 * @returns {string} CSS color code
 */
export function getColorForValue(value, average, isAboveGood = true) {
    const ratio = value / average;
    
    if (isAboveGood) {
        // Values above average are good (darker green)
        if (ratio > 1.2) return '#27ae60'; // Darker green
        return '#c0392b'; // Darker red
    } else {
        // Values below average are good (e.g., units dead)
        if (ratio < 0.8) return '#27ae60'; // Darker green
        return '#c0392b'; // Darker red
    }
}

/**
 * Gets a color for a kingdom
 * @param {number|string} kingdom - Kingdom number
 * @returns {string} Color code
 */
export function getKingdomColor(kingdom) {
    const kingdomNum = parseInt(kingdom) || 0;
    return KINGDOM_COLORS[kingdomNum % KINGDOM_COLORS.length];
}

/**
 * Identifies ID column from a list of headers
 * @param {string[]} headers - Column headers
 * @returns {string|null} ID column name or null if not found
 */
export function getIdColumn(headers) {
    // Look for exact matches in ID pattern
    for (const col of COLUMN_PATTERNS.ID) {
        if (headers.includes(col)) {
            return col;
        }
    }
    
    // Case-insensitive match
    for (const header of headers) {
        const headerLower = header.toLowerCase();
        for (const pattern of COLUMN_PATTERNS.ID) {
            if (headerLower === pattern || 
                headerLower.includes(pattern) || 
                headerLower.replace(/[_\s]/g, '') === pattern.replace(/[_\s]/g, '')) {
                return header;
            }
        }
    }
    
    // Look for any column with 'id' in it
    for (const header of headers) {
        if (header.toLowerCase().includes('id')) {
            return header;
        }
    }
    
    // Fallback to first column
    return headers.length > 0 ? headers[0] : null;
}

/**
 * Identifies name column from a list of headers
 * @param {string[]} headers - Column headers
 * @returns {string|null} Name column or null if not found
 */
export function getNameColumn(headers) {
    // Look for exact matches
    for (const col of COLUMN_PATTERNS.NAME) {
        if (headers.includes(col)) {
            return col;
        }
    }
    
    // Case-insensitive match
    for (const header of headers) {
        const headerLower = header.toLowerCase();
        for (const pattern of COLUMN_PATTERNS.NAME) {
            if (headerLower === pattern || 
                headerLower.includes(pattern) || 
                headerLower.replace(/[_\s]/g, '') === pattern.replace(/[_\s]/g, '')) {
                return header;
            }
        }
    }
    
    // Look for any column with 'name' excluding alliance/guild
    for (const header of headers) {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('name') && 
            !lowerHeader.includes('alliance') && 
            !lowerHeader.includes('guild')) {
            return header;
        }
    }
    
    return null;
}

/**
 * Identifies kingdom/server column from a list of headers
 * @param {string[]} headers - Column headers
 * @returns {string|null} Kingdom column or null if not found
 */
export function getKingdomColumn(headers) {
    for (const header of headers) {
        const lowerHeader = header.toLowerCase();
        for (const pattern of COLUMN_PATTERNS.KINGDOM) {
            if (lowerHeader.includes(pattern)) {
                return header;
            }
        }
    }
    return null;
}

/**
 * Identifies numeric columns from a list of headers
 * @param {string[]} headers - Column headers
 * @returns {string[]} Array of numeric column names
 */
export function getNumericColumns(headers) {
    const nonNumericPatterns = ['id', 'name', 'tag', 'kingdom', 'server', 'alliance'];
    return headers.filter(header => {
        const lowerHeader = header.toLowerCase();
        const isNonNumeric = nonNumericPatterns.some(pattern => lowerHeader.includes(pattern));
        return !isNonNumeric;
    });
}

/**
 * Identifies important columns from a list of headers
 * @param {string[]} headers - Column headers
 * @returns {string[]} Array of important column names
 */
export function getImportantColumns(headers) {
    return headers.filter(header => {
        const lowerHeader = header.toLowerCase();
        
        // Check if the header matches any important pattern
        return (
            lowerHeader.includes('id') ||
            lowerHeader.includes('name') ||
            lowerHeader.includes('kingdom') ||
            lowerHeader.includes('server') ||
            lowerHeader.includes('power') ||
            lowerHeader.includes('kill') ||
            lowerHeader.includes('alliance') ||
            lowerHeader.includes('merit') ||
            lowerHeader.includes('victory') ||
            lowerHeader.includes('defeat')
        );
    });
}

/**
 * Updates URL with the current application state
 * @param {Object} params - URL parameters to include
 */
export function updateURL(params = {}) {
    const urlParams = new URLSearchParams();
    
    // Add all parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            if (Array.isArray(value)) {
                urlParams.set(key, value.join(','));
            } else {
                urlParams.set(key, value.toString());
            }
        }
    });
    
    const newURL = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, '', newURL);
}

/**
 * Parses parameters from the URL
 * @returns {Object} Parsed parameters
 */
export function parseURLParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    
    // Parse common parameters
    if (params.has('kingdom')) result.kingdom = params.get('kingdom');
    if (params.has('search')) result.search = params.get('search');
    
    // Parse array parameters
    if (params.has('sheets')) result.sheets = params.get('sheets').split(',');
    if (params.has('columns')) result.columns = params.get('columns').split(',');
    if (params.has('column_order')) result.columnOrder = params.get('column_order').split(',');
    
    // Parse selection parameters
    if (params.has('selected')) result.selected = params.get('selected');
    if (params.has('changes')) result.changes = params.get('changes').split(',');
    
    // Parse mapping
    if (params.has('mapping')) {
        try {
            const mapping = {};
            params.get('mapping').split(',').forEach(pair => {
                const [key, value] = pair.split(':');
                if (key && value) {
                    mapping[decodeURIComponent(key)] = decodeURIComponent(value);
                }
            });
            result.mapping = mapping;
        } catch (error) {
            console.error('Error parsing mapping from URL:', error);
        }
    }
    
    return result;
}

/**
 * Creates a DOM element with specified attributes
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|Node|Array} children - Child elements or text
 * @returns {HTMLElement} Created DOM element
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'style' && typeof value === 'object') {
            Object.entries(value).forEach(([styleKey, styleValue]) => {
                element.style[styleKey] = styleValue;
            });
        } else if (key === 'dataset' && typeof value === 'object') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key === 'className') {
            element.className = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
            element.addEventListener(key.substring(2).toLowerCase(), value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Add children
    if (children) {
        if (!Array.isArray(children)) {
            children = [children];
        }
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
    }
    
    return element;
}
