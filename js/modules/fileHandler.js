// File handling functions
import { parseCSV } from './csvParser.js';

export function initializeFileHandlers() {
    // File input handler
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
    
    // Sample file selector
    document.getElementById('repoFileSelect').addEventListener('change', function() {
        if (this.value) {
            loadRepoFile();
        }
    });
}

export async function loadRepoFile() {
    const select = document.getElementById('repoFileSelect');
    const fileName = select.value;
    
    if (!fileName) {
        document.getElementById('fileName').textContent = 'Please select a file';
        return;
    }
    
    document.getElementById('fileName').textContent = `Loading file: ${fileName}...`;
    
    try {
        // Try different approaches to load the file
        let response = await fetch(fileName);
        
        if (!response.ok) {
            // Try with ./ prefix
            response = await fetch('./' + fileName);
        }
        
        if (response.ok) {
            const data = await response.text();
            document.getElementById('fileName').textContent = `File loaded: ${fileName}`;
            parseCSV(data, fileName);
        } else {
            throw new Error('Failed to load file');
        }
    } catch (error) {
        console.error('Error loading file:', error);
        document.getElementById('fileName').textContent = `Error: Cannot load file ${fileName}`;
    }
}
