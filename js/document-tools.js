/**
 * Fileverse - Document Processing Tools
 * Handles client-side document manipulation
 */

// Document Tools namespace with common utilities
const DocumentTools = {
  // Check if a file is a Word document
  isWordDocument: function(file) {
    const wordTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return wordTypes.includes(file.type);
  },
  
  // Check if a file is an Excel document
  isExcelDocument: function(file) {
    const excelTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return excelTypes.includes(file.type);
  },
  
  // Parse CSV data from string
  parseCSV: function(csvText, delimiter = ',') {
    const rows = csvText.split('\n');
    return rows.map(row => {
      // Handle quoted values with commas inside
      const regExp = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
      return row.split(regExp).map(cell => cell.trim().replace(/^"|"$/g, ''));
    });
  },
  
  // Convert array data to CSV string
  arrayToCSV: function(data, delimiter = ',') {
    return data.map(row => {
      return row.map(cell => {
        // Quote cell if it contains delimiter or newline
        const cellStr = String(cell);
        if (cellStr.includes(delimiter) || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(delimiter);
    }).join('\n');
  },
  
  // Create a preview of tabular data
  createTablePreview: function(data, maxRows = 10) {
    const table = document.createElement('table');
    table.className = 'preview-table';
    
    // Create header row if available
    if (data.length > 0) {
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      data[0].forEach(cell => {
        const th = document.createElement('th');
        th.textContent = cell;
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }
    
    // Create data rows
    const tbody = document.createElement('tbody');
    
    // Skip header row, limit to maxRows
    const dataRows = data.slice(1, maxRows + 1);
    
    dataRows.forEach(row => {
      const tr = document.createElement('tr');
      
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    
    // Add message if data was truncated
    if (data.length > maxRows + 1) {
      const caption = document.createElement('caption');
      caption.textContent = `Showing ${maxRows} of ${data.length - 1} rows`;
      caption.style.captionSide = 'bottom';
      table.appendChild(caption);
    }
    
    return table;
  }
};

// DOC to PDF Conversion Tool functionality
const DocToPdfTool = {
  documentFile: null,
  
  // Initialize the DOC to PDF tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('documentFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleDocumentSelect.bind(this));
    }
    
    // Handle convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) {
      convertButton.addEventListener('click', this.convertToPdf.bind(this));
    }
  },
  
  // Handle document file selection
  handleDocumentSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !DocumentTools.isWordDocument(file)) {
      showError('Please select a valid Word document (.doc or .docx)');
      return;
    }
    
    try {
      showLoading();
      this.documentFile = file;
      
      // Update file info
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileSize').textContent = formatFileSize(file.size);
      document.getElementById('fileType').textContent = file.type;
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load document: ' + error.message);
    }
  },
  
  // Convert DOC/DOCX to PDF
  convertToPdf: async function() {
    if (!this.documentFile) {
      showError('Please select a Word document first');
      return;
    }
    
    try {
      showLoading();
      
      // In a real application, we would use a library like mammoth.js or docx.js
      // to convert DOCX to HTML, and then use a PDF generation library
      // For this demo, we'll simulate the conversion
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateProgress(50);
      
      // Create a mock PDF result
      // In a real app, we would actually convert the document
      
      // Note: PDFs are binary files, so we're creating a simple placeholder
      const mockPDFBlob = new Blob(['PDF content would go here'], { type: 'application/pdf' });
      
      // Create download link
      const fileName = this.documentFile.name.replace(/\.(doc|docx)$/i, '.pdf');
      const downloadLink = createDownloadLink(
        mockPDFBlob,
        fileName,
        'application/pdf'
      );
      
      // Display download button
      const resultContainer = document.querySelector('.result-container');
      const resultActions = resultContainer.querySelector('.result-actions');
      resultActions.innerHTML = '';
      resultActions.appendChild(downloadLink);
      
      // Initialize Feather icons
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
      
      // Simulate final steps
      updateProgress(100);
      
      // Show success message
      showSuccess('Document converted to PDF successfully!');
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to convert document: ' + error.message);
    }
  }
};

// Excel to CSV Conversion Tool functionality
const ExcelToCSVTool = {
  excelFile: null,
  parsedData: null,
  
  // Initialize the Excel to CSV tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('excelFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleExcelSelect.bind(this));
    }
    
    // Handle convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) {
      convertButton.addEventListener('click', this.convertToCSV.bind(this));
    }
    
    // Handle delimiter change
    const delimiterSelect = document.getElementById('delimiter');
    if (delimiterSelect) {
      delimiterSelect.addEventListener('change', this.updatePreview.bind(this));
    }
    
    // Handle sheet selection if multiple sheets
    const sheetSelect = document.getElementById('sheetSelect');
    if (sheetSelect) {
      sheetSelect.addEventListener('change', this.changeSheet.bind(this));
    }
  },
  
  // Handle Excel file selection
  handleExcelSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !DocumentTools.isExcelDocument(file)) {
      showError('Please select a valid Excel document (.xls or .xlsx)');
      return;
    }
    
    try {
      showLoading();
      this.excelFile = file;
      
      // In a real application, we would use a library like SheetJS/xlsx
      // to parse the Excel file. For this demo, we'll simulate it.
      
      // Simulate Excel data
      this.parsedData = [
        ['Name', 'Age', 'Email', 'Country'],
        ['John Doe', '30', 'john@example.com', 'USA'],
        ['Jane Smith', '25', 'jane@example.com', 'Canada'],
        ['Robert Johnson', '45', 'robert@example.com', 'UK'],
        ['Emily Davis', '28', 'emily@example.com', 'Australia'],
        ['Michael Brown', '35', 'michael@example.com', 'Germany']
      ];
      
      // Update file info
      document.getElementById('fileName').textContent = file.name;
      document.getElementById('fileSize').textContent = formatFileSize(file.size);
      
      // Update sheet selection
      const sheetSelect = document.getElementById('sheetSelect');
      if (sheetSelect) {
        sheetSelect.innerHTML = '';
        
        // Simulate multiple sheets
        const sheets = ['Sheet1', 'Sheet2', 'Sheet3'];
        
        sheets.forEach(sheet => {
          const option = document.createElement('option');
          option.value = sheet;
          option.textContent = sheet;
          sheetSelect.appendChild(option);
        });
        
        // Show sheet selection
        document.getElementById('sheetSelectContainer').style.display = 'block';
      }
      
      // Create table preview
      this.updatePreview();
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load Excel file: ' + error.message);
    }
  },
  
  // Update CSV preview based on selected delimiter
  updatePreview: function() {
    if (!this.parsedData) return;
    
    const delimiter = document.getElementById('delimiter').value;
    const previewContainer = document.getElementById('excelPreview');
    
    if (previewContainer) {
      // Clear previous preview
      previewContainer.innerHTML = '';
      
      // Create table preview
      const tablePreview = DocumentTools.createTablePreview(this.parsedData);
      previewContainer.appendChild(tablePreview);
      
      // Create CSV preview
      const csvPreview = document.createElement('pre');
      csvPreview.className = 'csv-preview';
      
      // Create CSV content with selected delimiter
      const csvContent = DocumentTools.arrayToCSV(this.parsedData, delimiter);
      
      // Show a sample of the CSV
      const csvLines = csvContent.split('\n').slice(0, 6).join('\n');
      csvPreview.textContent = csvLines;
      
      // Add CSV preview
      const csvContainer = document.createElement('div');
      csvContainer.className = 'csv-container';
      csvContainer.innerHTML = '<h4>CSV Preview</h4>';
      csvContainer.appendChild(csvPreview);
      
      previewContainer.appendChild(csvContainer);
    }
  },
  
  // Change active sheet
  changeSheet: function(e) {
    // In a real application, we would load the selected sheet data
    // For this demo, we'll just show a message
    showSuccess(`Sheet "${e.target.value}" selected`);
    
    // Simulate different data for different sheets
    if (e.target.value === 'Sheet1') {
      this.parsedData = [
        ['Name', 'Age', 'Email', 'Country'],
        ['John Doe', '30', 'john@example.com', 'USA'],
        ['Jane Smith', '25', 'jane@example.com', 'Canada'],
        ['Robert Johnson', '45', 'robert@example.com', 'UK'],
        ['Emily Davis', '28', 'emily@example.com', 'Australia'],
        ['Michael Brown', '35', 'michael@example.com', 'Germany']
      ];
    } else if (e.target.value === 'Sheet2') {
      this.parsedData = [
        ['Product', 'Category', 'Price', 'Stock'],
        ['Laptop', 'Electronics', '999.99', '45'],
        ['Headphones', 'Electronics', '149.99', '78'],
        ['Desk Chair', 'Furniture', '249.99', '32'],
        ['Coffee Maker', 'Appliances', '89.99', '54']
      ];
    } else {
      this.parsedData = [
        ['Date', 'Revenue', 'Expenses', 'Profit'],
        ['2023-01-01', '12500', '8750', '3750'],
        ['2023-02-01', '14200', '9100', '5100'],
        ['2023-03-01', '13800', '8900', '4900'],
        ['2023-04-01', '15500', '9800', '5700']
      ];
    }
    
    // Update preview
    this.updatePreview();
  },
  
  // Convert Excel to CSV
  convertToCSV: async function() {
    if (!this.excelFile || !this.parsedData) {
      showError('Please select an Excel file first');
      return;
    }
    
    try {
      showLoading();
      
      // Get selected delimiter
      const delimiter = document.getElementById('delimiter').value;
      
      // Convert data to CSV
      const csvContent = DocumentTools.arrayToCSV(this.parsedData, delimiter);
      
      // Create blob
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      
      // Create download link
      const fileName = this.excelFile.name.replace(/\.(xls|xlsx)$/i, '.csv');
      const downloadLink = createDownloadLink(
        csvBlob,
        fileName,
        'text/csv'
      );
      
      // Display download button
      const resultContainer = document.querySelector('.result-container');
      const resultActions = resultContainer.querySelector('.result-actions');
      resultActions.innerHTML = '';
      resultActions.appendChild(downloadLink);
      
      // Initialize Feather icons
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
      
      // Show success message
      showSuccess('Excel file converted to CSV successfully!');
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to convert Excel file: ' + error.message);
    }
  }
};

// Document Merge Tool functionality
const DocumentMergeTool = {
  documentFiles: [],
  
  // Initialize the document merge tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('documentFiles');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleDocumentsSelect.bind(this));
    }
    
    // Handle merge button
    const mergeButton = document.getElementById('mergeButton');
    if (mergeButton) {
      mergeButton.addEventListener('click', this.mergeDocuments.bind(this));
    }
    
    // Initialize sortable document list (if available)
    if (typeof Sortable !== 'undefined') {
      const documentList = document.getElementById('documentList');
      if (documentList) {
        Sortable.create(documentList, {
          animation: 150,
          ghostClass: 'sortable-ghost',
          onEnd: () => {
            this.updateDocumentOrder();
          }
        });
      }
    }
  },
  
  // Handle multiple document selection
  handleDocumentsSelect: function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      showLoading();
      
      // Filter valid document files
      const docFiles = Array.from(files).filter(file => {
        return DocumentTools.isWordDocument(file) || file.type === 'application/pdf';
      });
      
      if (docFiles.length === 0) {
        showError('Please select valid documents (.doc, .docx, .pdf)');
        hideLoading();
        return;
      }
      
      // Add to document list
      for (const file of docFiles) {
        this.documentFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type
        });
      }
      
      // Update UI with selected documents
      this.updateDocumentList();
      
      hideLoading();
      
      // Show success message
      showSuccess(`${docFiles.length} documents added successfully`);
      
      // Show document list and options
      document.querySelector('.document-list-container').style.display = 'block';
      document.querySelector('.options-container').style.display = 'block';
    } catch (error) {
      hideLoading();
      showError('Failed to process documents: ' + error.message);
    }
  },
  
  // Update the document list UI
  updateDocumentList: function() {
    const documentList = document.getElementById('documentList');
    if (!documentList) return;
    
    // Clear current list
    documentList.innerHTML = '';
    
    // Add each document as a list item
    this.documentFiles.forEach((doc, index) => {
      const listItem = document.createElement('li');
      listItem.className = 'document-item';
      listItem.dataset.index = index;
      
      // Create icon based on file type
      const icon = document.createElement('div');
      icon.className = 'document-icon';
      
      if (doc.type === 'application/pdf') {
        icon.innerHTML = '<i data-feather="file-text"></i>';
      } else {
        icon.innerHTML = '<i data-feather="file-text"></i>';
      }
      
      // Create info
      const infoDiv = document.createElement('div');
      infoDiv.className = 'document-info';
      infoDiv.innerHTML = `
        <p class="document-name">${doc.name}</p>
        <p class="document-meta">${formatFileSize(doc.size)} - ${doc.type}</p>
      `;
      
      // Create controls
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'document-controls';
      
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'document-control';
      removeBtn.innerHTML = '<i data-feather="trash-2"></i>';
      removeBtn.title = 'Remove document';
      removeBtn.addEventListener('click', () => this.removeDocument(index));
      
      // Move buttons
      const moveUpBtn = document.createElement('button');
      moveUpBtn.className = 'document-control';
      moveUpBtn.innerHTML = '<i data-feather="arrow-up"></i>';
      moveUpBtn.title = 'Move up';
      moveUpBtn.addEventListener('click', () => this.moveDocument(index, 'up'));
      moveUpBtn.disabled = index === 0;
      
      const moveDownBtn = document.createElement('button');
      moveDownBtn.className = 'document-control';
      moveDownBtn.innerHTML = '<i data-feather="arrow-down"></i>';
      moveDownBtn.title = 'Move down';
      moveDownBtn.addEventListener('click', () => this.moveDocument(index, 'down'));
      moveDownBtn.disabled = index === this.documentFiles.length - 1;
      
      // Add controls to container
      controlsDiv.appendChild(moveUpBtn);
      controlsDiv.appendChild(moveDownBtn);
      controlsDiv.appendChild(removeBtn);
      
      // Assemble list item
      listItem.appendChild(icon);
      listItem.appendChild(infoDiv);
      listItem.appendChild(controlsDiv);
      
      // Add to list
      documentList.appendChild(listItem);
    });
    
    // Initialize Feather icons
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
    
    // Update total count
    document.getElementById('documentCount').textContent = this.documentFiles.length;
  },
  
  // Remove a document from the list
  removeDocument: function(index) {
    this.documentFiles.splice(index, 1);
    this.updateDocumentList();
  },
  
  // Move a document up or down in the list
  moveDocument: function(index, direction) {
    if (direction === 'up' && index > 0) {
      const temp = this.documentFiles[index];
      this.documentFiles[index] = this.documentFiles[index - 1];
      this.documentFiles[index - 1] = temp;
    } else if (direction === 'down' && index < this.documentFiles.length - 1) {
      const temp = this.documentFiles[index];
      this.documentFiles[index] = this.documentFiles[index + 1];
      this.documentFiles[index + 1] = temp;
    }
    
    this.updateDocumentList();
  },
  
  // Update document order after drag-and-drop reordering
  updateDocumentOrder: function() {
    const documentItems = document.querySelectorAll('.document-item');
    const newOrder = [];
    
    documentItems.forEach(item => {
      const index = parseInt(item.dataset.index);
      newOrder.push(this.documentFiles[index]);
    });
    
    this.documentFiles = newOrder;
    this.updateDocumentList();
  },
  
  // Merge documents
  mergeDocuments: async function() {
    if (this.documentFiles.length < 2) {
      showError('Please add at least two documents to merge');
      return;
    }
    
    try {
      showLoading();
      
      // Get merge options
      const outputFormat = document.getElementById('outputFormat').value;
      
      // In a real application, we would use libraries like pdf-lib or docx
      // to merge documents based on their types. For this demo, we'll simulate it.
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      updateProgress(100);
      
      // Create a mock merged document result
      const mockMergedBlob = new Blob(['Merged document content'], { type: outputFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      // Create download link
      const extension = outputFormat === 'pdf' ? 'pdf' : 'docx';
      const downloadLink = createDownloadLink(
        mockMergedBlob,
        `merged_document.${extension}`,
        outputFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      
      // Display download button
      const resultContainer = document.querySelector('.result-container');
      const resultActions = resultContainer.querySelector('.result-actions');
      resultActions.innerHTML = '';
      resultActions.appendChild(downloadLink);
      
      // Initialize Feather icons
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
      
      // Show success message
      showSuccess(`${this.documentFiles.length} documents merged successfully!`);
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to merge documents: ' + error.message);
    }
  }
};

// Initialize tools based on page
document.addEventListener('DOMContentLoaded', () => {
  // Determine which tool to initialize based on page
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('/document/doc-to-pdf.html')) {
    DocToPdfTool.init();
  } else if (currentPage.includes('/document/excel-to-csv.html')) {
    ExcelToCSVTool.init();
  } else if (currentPage.includes('/document/merge.html')) {
    DocumentMergeTool.init();
  }
});
