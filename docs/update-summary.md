# Kingdom Analyzer - Update Summary

## New Features Implemented

### 1. Google Sheets Integration
- Load data directly from Google Sheets URL
- Support for multiple sheets
- CSV export functionality for published sheets
- Dynamic sheet tab management

### 2. Dynamic Data Handling
- Automatic column detection
- Dynamic header mapping
- Support for varying CSV formats
- Intelligent column type detection

### 3. Sheet Management
- Multiple sheet tabs
- Change detection between sheets
- Aggregated changes view
- Sheet name display

### 4. Data Visualization
- Interactive bar chart
- Dynamic metric selection
- Player highlighting
- Scroll to player functionality

### 5. UI Improvements
- Immediate column selection updates
- URL configuration sharing
- Number formatting (1,200,000)
- Color coding based on averages
- Row numbering

### 6. Removed Features
- Kingdom comparison mode
- Faction filtering
- Range selection
- Stars/ratings display

## File Structure
```
D:\dev\-home-kingdom-analyzer\
├── index.html                     # Main application page
├── style.css                      # Styling
├── docs/                          # Documentation
│   └── update-summary.md          # This file
├── js/
│   ├── main.js                    # Application entry point
│   └── modules/
│       ├── state.js               # State management
│       ├── fileHandler.js         # File handling
│       ├── csvParser.js           # CSV parsing
│       ├── filtering.js           # Data filtering
│       ├── sorting.js             # Data sorting
│       ├── tableRenderer.js       # Table rendering
│       ├── statistics.js          # Statistics calculation
│       ├── ui.js                  # UI utilities
│       ├── constants.js           # Constants
│       ├── sheets/                # Google Sheets modules
│       │   ├── googleSheetsLoader.js
│       │   └── sheetManager.js
│       └── charts/                # Chart modules
│           └── chartManager.js
└── 20250408.csv                   # Test data file
```

## Usage

### Basic Usage
1. Open `index.html` in a web browser
2. Enter a Google Sheets URL
3. Click "Load Sheet"
4. Select columns to display
5. Apply filters and sorting

### Advanced Features
- Load multiple sheets: Click "Load Multiple Sheets"
- View changes: Click change tabs between sheets
- Visualize data: Toggle chart view
- Share configuration: Copy URL with parameters

### Google Sheets Requirements
The Google Sheet must be published to web:
1. Open your Google Sheet
2. Go to File → Share → Publish to web
3. Select "Entire Document" and "CSV" format
4. Click "Publish"
5. Use the sheet URL in the analyzer

## Technical Details

### Dynamic Column Mapping
The system automatically detects and maps columns based on patterns:
- ID columns: 'governor_id', 'lord_id', 'player_id'
- Kingdom/Server: 'kingdom', 'home server', 'server'
- Power: 'power' (excluding 'highest power')
- Names: 'name' (excluding 'alliance')

### Data Processing
- Automatic numeric parsing
- ID preservation (no formatting)
- Win rate calculation
- Player type determination (Tank/DPS)
- T4+T5 aggregation

### State Management
- Global app state
- Sheet-specific state
- Change tracking
- URL parameter sync

## Browser Compatibility
- Modern browsers with ES6 support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Considerations
- Efficient data filtering
- Lazy rendering
- Canvas-based charts
- Minimal DOM updates

## Future Enhancements
- Export functionality
- Advanced filtering
- Custom calculations
- Data persistence
- Mobile optimization
