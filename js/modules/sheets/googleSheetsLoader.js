// Google Sheets loader module
export async function loadGoogleSheetAsCSV(url) {
    const sheetInfo = parseSheetUrl(url);
    
    if (!sheetInfo.spreadsheetId) {
        throw new Error('Invalid Google Sheets URL');
    }
    
    // Google Sheets CSV export URL pattern
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetInfo.spreadsheetId}/export?format=csv&gid=${sheetInfo.gid}`;
    
    console.log('Attempting to load sheet as CSV from:', csvUrl);
    
    try {
        const response = await fetch(csvUrl, {
            mode: 'cors',
            credentials: 'same-origin',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const data = parseCSVText(csvText);
        
        return [{
            id: sheetInfo.gid.toString(),
            name: sheetInfo.sheetName || `Sheet (GID: ${sheetInfo.gid})`,
            displayName: sheetInfo.sheetName || `Sheet (GID: ${sheetInfo.gid})`,
            date: new Date().toISOString(),
            data: data,
            headers: Object.keys(data[0] || {}),
            url: url,
            spreadsheetId: sheetInfo.spreadsheetId,
            gid: sheetInfo.gid
        }];
    } catch (error) {
        console.error('Failed to load as CSV:', error);
        throw new Error(`Failed to load sheet as CSV. The sheet might not be published. To fix this:
1. Open your Google Sheet
2. Go to File → Share → Publish to web
3. Select "Entire Document" and "CSV" format
4. Click "Publish"
5. Try loading again`);
    }
}

// Parse CSV text into data array
export function parseCSVText(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Parse headers
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    // Parse rows
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || values.every(v => !v)) continue; // Skip empty rows
        
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        data.push(row);
    }
    
    return data;
}

// Parse a single CSV line handling quotes
export function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values;
}

// Helper to parse sheet URL
export function parseSheetUrl(url) {
    const info = {
        spreadsheetId: null,
        gid: 0,
        fullUrl: url,
        sheetName: null
    };
    
    // Extract spreadsheet ID
    const idMatch = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch) {
        info.spreadsheetId = idMatch[1];
    }
    
    // Extract GID - try multiple patterns
    let gidMatch = url.match(/[#&]gid=([0-9]+)/);
    if (!gidMatch) {
        gidMatch = url.match(/gid=([0-9]+)/);
    }
    if (gidMatch) {
        info.gid = parseInt(gidMatch[1]);
    }
    
    // Try to extract sheet name from URL if present
    const sheetMatch = url.match(/[#&]sheet=([^&]+)/);
    if (sheetMatch) {
        info.sheetName = decodeURIComponent(sheetMatch[1]);
    }
    
    return info;
}

// Load multiple sheets
export async function loadMultipleSheets(urls) {
    const sheets = [];
    const errors = [];
    
    for (const url of urls) {
        try {
            const sheetData = await loadGoogleSheetAsCSV(url);
            sheets.push(...sheetData);
        } catch (error) {
            errors.push({ url, error: error.message });
        }
    }
    
    if (errors.length > 0 && sheets.length === 0) {
        throw new Error('Failed to load any sheets: ' + errors.map(e => e.error).join(', '));
    }
    
    return { sheets, errors };
}
