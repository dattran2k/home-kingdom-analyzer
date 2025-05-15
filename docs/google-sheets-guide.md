# How to Use Google Sheets with Kingdom Analyzer

## Method 1: Direct Google Sheets URL

1. Open your Google Sheet
2. Share the sheet:
   - Click "Share" button
   - Select "Anyone with the link can view"
   - Copy the share link

3. Publish the sheet to web:
   - Go to File → Share → Publish to web
   - Select "Entire Document" or specific sheet
   - Choose "CSV" format
   - Click "Publish"

4. Use the sheet URL in the analyzer:
   - Select "Google Sheets" option
   - Paste your Google Sheets URL
   - Click "Load Sheet"

### Example Google Sheets URL format:
```
https://docs.google.com/spreadsheets/d/1ABC123DEF456/edit#gid=0
```

## Method 2: Google Drive Share Link

If you have a shareable link like:
```
https://drive.google.com/file/d/1XYZ789ABC/view?usp=sharing
```

Convert it to a direct download link:
```
https://drive.google.com/uc?export=download&id=1XYZ789ABC
```

But this method is not recommended. Use the Google Sheets method instead.

## Method 3: CSV File Upload

1. Export your Google Sheet as CSV:
   - File → Download → Comma Separated Values (.csv)
   
2. In the analyzer:
   - Select "CSV File" option
   - Click "Choose CSV File from Computer"
   - Select your downloaded CSV file

## Method 4: Sample File

A sample file `20250408.csv` is provided for testing:
1. Select "CSV File" option
2. Choose "20250408.csv" from the dropdown
3. Click "Load Sample"

## Troubleshooting

### "Failed to load sheet as CSV"
- Make sure the sheet is published to web
- Check that the URL is correct
- Try republishing the sheet

### "Invalid Google Sheets URL"
- Use the full Google Sheets URL, not a Google Drive link
- Include the sheet ID and gid parameter

### CORS errors
- The sheet must be publicly accessible
- Publishing to web is required for direct access

## Multiple Sheets

To load multiple sheets:
1. Click "Load Multiple Sheets"
2. Enter one URL per line in the dialog
3. Click OK

## Data Requirements

Your CSV/Sheet should have columns like:
- governor_id or lord_id
- kingdom or home_server
- power
- victories
- defeats
- kills columns (tier_1_kills, tier_5_kills, etc.)

The analyzer will automatically detect and map your columns.
