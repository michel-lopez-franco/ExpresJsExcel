const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'spreadsheet.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize empty spreadsheet if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const emptySpreadsheet = {
    sheets: [
      {
        name: 'Sheet 1',
        data: Array(20).fill().map(() => Array(10).fill(''))
      }
    ]
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(emptySpreadsheet, null, 2));
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  try {
    const spreadsheetData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.render('index', { spreadsheet: spreadsheetData });
  } catch (error) {
    console.error('Error reading spreadsheet data:', error);
    res.status(500).send('Error loading spreadsheet');
  }
});

// API to get spreadsheet data
app.get('/api/spreadsheet', (req, res) => {
  try {
    const spreadsheetData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(spreadsheetData);
  } catch (error) {
    console.error('Error reading spreadsheet data:', error);
    res.status(500).json({ error: 'Failed to load spreadsheet data' });
  }
});

// API to update cell value
app.post('/api/update-cell', (req, res) => {
  try {
    const { sheetIndex, row, col, value } = req.body;
    const spreadsheetData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    // Ensure the sheet exists
    if (!spreadsheetData.sheets[sheetIndex]) {
      return res.status(404).json({ error: 'Sheet not found' });
    }
    
    // Update the cell value
    spreadsheetData.sheets[sheetIndex].data[row][col] = value;
    
    // Save the updated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(spreadsheetData, null, 2));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating cell:', error);
    res.status(500).json({ error: 'Failed to update cell' });
  }
});

// API to add a new sheet
app.post('/api/add-sheet', (req, res) => {
  try {
    const { name } = req.body;
    const spreadsheetData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    
    // Create a new sheet with empty data
    const newSheet = {
      name: name || `Sheet ${spreadsheetData.sheets.length + 1}`,
      data: Array(20).fill().map(() => Array(10).fill(''))
    };
    
    // Add the new sheet
    spreadsheetData.sheets.push(newSheet);
    
    // Save the updated data
    fs.writeFileSync(DATA_FILE, JSON.stringify(spreadsheetData, null, 2));
    
    res.json({ success: true, sheetIndex: spreadsheetData.sheets.length - 1 });
  } catch (error) {
    console.error('Error adding sheet:', error);
    res.status(500).json({ error: 'Failed to add sheet' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
