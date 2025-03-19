document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const gridContainer = document.getElementById('grid-container');
    const formulaInput = document.getElementById('formula-input');
    const activeCellRef = document.getElementById('active-cell');
    const addSheetBtn = document.getElementById('add-sheet-btn');
    const saveBtn = document.getElementById('save-btn');
    const sheetTabs = document.querySelector('.sheet-tabs');
    const sheetModal = document.getElementById('sheet-modal');
    const closeModalBtn = document.querySelector('.close');
    const confirmAddSheetBtn = document.getElementById('confirm-add-sheet');
    const sheetNameInput = document.getElementById('sheet-name-input');
    
    // Variables
    let activeCell = null;
    let currentSheetIndex = 0;
    let spreadsheetData = null;
    
    // Initialize
    fetchSpreadsheetData();
    
    // Event Listeners
    gridContainer.addEventListener('click', handleCellClick);
    formulaInput.addEventListener('keydown', handleFormulaInput);
    addSheetBtn.addEventListener('click', openAddSheetModal);
    saveBtn.addEventListener('click', saveSpreadsheet);
    sheetTabs.addEventListener('click', handleSheetTabClick);
    closeModalBtn.addEventListener('click', closeModal);
    confirmAddSheetBtn.addEventListener('click', addNewSheet);
    
    // Functions
    function fetchSpreadsheetData() {
        fetch('/api/spreadsheet')
            .then(response => response.json())
            .then(data => {
                spreadsheetData = data;
                renderSheet(currentSheetIndex);
            })
            .catch(error => console.error('Error fetching spreadsheet data:', error));
    }
    
    function renderSheet(sheetIndex) {
        if (!spreadsheetData || !spreadsheetData.sheets[sheetIndex]) return;
        
        const sheet = spreadsheetData.sheets[sheetIndex];
        const rows = gridContainer.querySelectorAll('.row');
        
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('.cell');
            cells.forEach((cell, colIndex) => {
                cell.textContent = sheet.data[rowIndex][colIndex] || '';
            });
        });
        
        // Update active sheet tab
        const sheetTabs = document.querySelectorAll('.sheet-tab');
        sheetTabs.forEach((tab, index) => {
            if (index === sheetIndex) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        currentSheetIndex = sheetIndex;
    }
    
    function handleCellClick(event) {
        const cell = event.target.closest('.cell');
        if (!cell) return;
        
        // Remove selection from previous cell
        if (activeCell) {
            activeCell.classList.remove('selected');
        }
        
        // Select new cell
        activeCell = cell;
        activeCell.classList.add('selected');
        
        // Update formula bar
        const cellId = cell.getAttribute('data-cell-id');
        activeCellRef.textContent = cellId;
        formulaInput.value = cell.textContent;
        formulaInput.focus();
    }
    
    function handleFormulaInput(event) {
        if (event.key === 'Enter' && activeCell) {
            event.preventDefault();
            
            const value = formulaInput.value;
            const row = parseInt(activeCell.getAttribute('data-row'));
            const col = parseInt(activeCell.getAttribute('data-col'));
            
            // Update cell value in UI
            activeCell.textContent = value;
            
            // Update cell value in data model
            updateCellValue(currentSheetIndex, row, col, value);
        }
    }
    
    function updateCellValue(sheetIndex, row, col, value) {
        // Update local data
        spreadsheetData.sheets[sheetIndex].data[row][col] = value;
        
        // Send update to server
        fetch('/api/update-cell', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sheetIndex, row, col, value })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Failed to update cell on server');
            }
        })
        .catch(error => console.error('Error updating cell:', error));
    }
    
    function handleSheetTabClick(event) {
        const tab = event.target.closest('.sheet-tab');
        if (!tab) return;
        
        const sheetIndex = parseInt(tab.getAttribute('data-sheet-index'));
        renderSheet(sheetIndex);
    }
    
    function openAddSheetModal() {
        sheetModal.style.display = 'block';
        sheetNameInput.value = '';
        sheetNameInput.focus();
    }
    
    function closeModal() {
        sheetModal.style.display = 'none';
    }
    
    function addNewSheet() {
        const sheetName = sheetNameInput.value.trim() || `Sheet ${spreadsheetData.sheets.length + 1}`;
        
        fetch('/api/add-sheet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: sheetName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Add new sheet tab
                const newTab = document.createElement('div');
                newTab.className = 'sheet-tab';
                newTab.setAttribute('data-sheet-index', data.sheetIndex);
                newTab.textContent = sheetName;
                sheetTabs.appendChild(newTab);
                
                // Update local data
                spreadsheetData.sheets.push({
                    name: sheetName,
                    data: Array(20).fill().map(() => Array(10).fill(''))
                });
                
                // Switch to new sheet
                renderSheet(data.sheetIndex);
                
                // Close modal
                closeModal();
            } else {
                console.error('Failed to add sheet on server');
            }
        })
        .catch(error => console.error('Error adding sheet:', error));
    }
    
    function saveSpreadsheet() {
        // The spreadsheet is automatically saved when cells are updated
        // This button provides visual feedback to the user
        saveBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        }, 2000);
    }
    
    // Close modal if clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === sheetModal) {
            closeModal();
        }
    });
    
    // Handle keyboard navigation
    document.addEventListener('keydown', function(event) {
        if (!activeCell) return;
        
        const row = parseInt(activeCell.getAttribute('data-row'));
        const col = parseInt(activeCell.getAttribute('data-col'));
        
        let newRow = row;
        let newCol = col;
        
        switch (event.key) {
            case 'ArrowUp':
                newRow = Math.max(0, row - 1);
                break;
            case 'ArrowDown':
                newRow = Math.min(19, row + 1);
                break;
            case 'ArrowLeft':
                newCol = Math.max(0, col - 1);
                break;
            case 'ArrowRight':
                newCol = Math.min(9, col + 1);
                break;
            case 'Tab':
                event.preventDefault();
                newCol = (col + 1) % 10;
                if (newCol === 0) {
                    newRow = Math.min(19, row + 1);
                }
                break;
            default:
                return; // Exit for other keys
        }
        
        if (newRow !== row || newCol !== col) {
            const newCell = document.querySelector(`.cell[data-row="${newRow}"][data-col="${newCol}"]`);
            if (newCell) {
                newCell.click();
            }
        }
    });
});
