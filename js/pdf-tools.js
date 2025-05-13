/**
 * Fileverse - PDF Processing Tools
 * Handles client-side PDF manipulation using PDF.js library
 */

// PDF Tools namespace with common utilities
const PDFTools = {
  // Load PDF.js library dynamically if not already loaded
  loadPDFJS: async function() {
    if (typeof pdfjsLib === 'undefined') {
      // In a real application, we'd load the library dynamically
      // For this demo, we'll assume it's already included in the page
      if (!window.pdfjsLib) {
        showError('PDF.js library not available');
        return false;
      }
      return true;
    }
    return true;
  },
  
  // Load a PDF document from a file
  loadPDFDocument: async function(file) {
    try {
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      return await loadingTask.promise;
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw new Error('Failed to load PDF document');
    }
  },
  
  // Render a PDF page to a canvas
  renderPageToCanvas: async function(page, scale = 1.0) {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    return canvas;
  },
  
  // Convert a PDF page to an image (returns a Blob)
  pageToImage: async function(page, format = 'image/jpeg', quality = 0.8, scale = 1.5) {
    const canvas = await this.renderPageToCanvas(page, scale);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, format, quality);
    });
  },
  
  // Get PDF info (number of pages, title, etc.)
  getPDFInfo: async function(pdfDoc) {
    const metadata = await pdfDoc.getMetadata();
    
    return {
      pageCount: pdfDoc.numPages,
      title: metadata.info?.Title || 'Untitled',
      author: metadata.info?.Author || 'Unknown',
      creationDate: metadata.info?.CreationDate || 'Unknown',
      isEncrypted: pdfDoc.isEncrypted || false
    };
  }
};

// PDF to Image Tool functionality
const PDFToImageTool = {
  pdfDocument: null,
  pdfFile: null,
  pageCount: 0,
  selectedPages: [],
  
  // Initialize the PDF to Image tool
  init: function() {
    // Check if PDF.js is loaded
    PDFTools.loadPDFJS();
    
    // Handle file input
    const fileInput = document.getElementById('pdfFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handlePDFSelect.bind(this));
    }
    
    // Handle convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) {
      convertButton.addEventListener('click', this.convertToImages.bind(this));
    }
    
    // Handle page selection
    const pageRangeInput = document.getElementById('pageRange');
    if (pageRangeInput) {
      pageRangeInput.addEventListener('input', this.validatePageRange.bind(this));
    }
    
    // Handle format change
    const formatSelect = document.getElementById('imageFormat');
    if (formatSelect) {
      formatSelect.addEventListener('change', this.updateFormatOptions.bind(this));
    }
    
    // Initialize page range validation
    this.validatePageRange();
  },
  
  // Handle PDF file selection
  handlePDFSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      showError('Please select a valid PDF file');
      return;
    }
    
    try {
      showLoading();
      this.pdfFile = file;
      
      // Load PDF document
      this.pdfDocument = await PDFTools.loadPDFDocument(file);
      this.pageCount = this.pdfDocument.numPages;
      
      // Get first page for preview
      const page = await this.pdfDocument.getPage(1);
      const previewCanvas = await PDFTools.renderPageToCanvas(page, 0.5);
      
      // Show preview
      const previewContainer = document.getElementById('pdfPreview');
      previewContainer.innerHTML = '';
      previewContainer.appendChild(previewCanvas);
      
      // Update page range input
      const pageRangeInput = document.getElementById('pageRange');
      if (pageRangeInput) {
        pageRangeInput.placeholder = `1-${this.pageCount}`;
        pageRangeInput.max = this.pageCount;
      }
      
      // Update file info
      document.getElementById('pageCount').textContent = this.pageCount;
      document.getElementById('fileSize').textContent = formatFileSize(file.size);
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load PDF: ' + error.message);
    }
  },
  
  // Validate page range input
  validatePageRange: function() {
    if (!this.pdfDocument) return;
    
    const pageRangeInput = document.getElementById('pageRange');
    const pageSelectionResult = document.getElementById('pageSelectionResult');
    
    if (!pageRangeInput || !pageSelectionResult) return;
    
    const value = pageRangeInput.value.trim();
    
    if (!value) {
      // Default to all pages
      this.selectedPages = Array.from({ length: this.pageCount }, (_, i) => i + 1);
      pageSelectionResult.textContent = `All pages (1-${this.pageCount})`;
      pageSelectionResult.classList.remove('error');
      return;
    }
    
    try {
      // Parse page range (e.g., "1,3,5-7")
      const selectedPages = [];
      const parts = value.split(',');
      
      for (const part of parts) {
        if (part.includes('-')) {
          // Range of pages
          const [start, end] = part.split('-').map(num => parseInt(num.trim()));
          
          if (isNaN(start) || isNaN(end) || start < 1 || end > this.pageCount || start > end) {
            throw new Error(`Invalid range: ${part}`);
          }
          
          for (let i = start; i <= end; i++) {
            selectedPages.push(i);
          }
        } else {
          // Single page
          const page = parseInt(part.trim());
          
          if (isNaN(page) || page < 1 || page > this.pageCount) {
            throw new Error(`Invalid page: ${part}`);
          }
          
          selectedPages.push(page);
        }
      }
      
      // Remove duplicates and sort
      this.selectedPages = [...new Set(selectedPages)].sort((a, b) => a - b);
      
      pageSelectionResult.textContent = `Selected ${this.selectedPages.length} pages`;
      pageSelectionResult.classList.remove('error');
    } catch (error) {
      pageSelectionResult.textContent = error.message;
      pageSelectionResult.classList.add('error');
      this.selectedPages = [];
    }
  },
  
  // Update format-specific options
  updateFormatOptions: function() {
    const formatSelect = document.getElementById('imageFormat');
    const qualityContainer = document.getElementById('qualityContainer');
    
    if (!formatSelect || !qualityContainer) return;
    
    const format = formatSelect.value;
    
    // Only show quality option for JPEG
    if (format === 'image/jpeg') {
      qualityContainer.style.display = 'block';
    } else {
      qualityContainer.style.display = 'none';
    }
  },
  
  // Convert PDF pages to images
  convertToImages: async function() {
    if (!this.pdfDocument) {
      showError('Please select a PDF file first');
      return;
    }
    
    if (this.selectedPages.length === 0) {
      showError('Please select at least one page to convert');
      return;
    }
    
    try {
      showLoading();
      
      // Get selected options
      const formatSelect = document.getElementById('imageFormat');
      const format = formatSelect ? formatSelect.value : 'image/jpeg';
      
      const qualityInput = document.getElementById('quality');
      const quality = qualityInput ? parseFloat(qualityInput.value) / 100 : 0.8;
      
      const dpiInput = document.getElementById('dpi');
      const dpi = dpiInput ? parseInt(dpiInput.value) : 150;
      const scale = dpi / 72; // PDF uses 72 DPI as base
      
      // Create a folder for multiple images using JSZip if >1 page
      let zip;
      if (this.selectedPages.length > 1) {
        zip = new JSZip();
      }
      
      // Convert each selected page
      const fileExtension = format.split('/')[1];
      const images = [];
      let totalProgress = 0;
      
      for (let i = 0; i < this.selectedPages.length; i++) {
        const pageNumber = this.selectedPages[i];
        
        // Get the page
        const page = await this.pdfDocument.getPage(pageNumber);
        
        // Convert to image
        const imageBlob = await PDFTools.pageToImage(page, format, quality, scale);
        
        if (zip) {
          // Add to zip
          zip.file(`page_${pageNumber}.${fileExtension}`, imageBlob);
        } else {
          // Single image
          images.push(imageBlob);
        }
        
        // Update progress
        totalProgress = ((i + 1) / this.selectedPages.length) * 100;
        updateProgress(totalProgress);
      }
      
      // Create download link(s)
      const resultContainer = document.querySelector('.result-container');
      const resultActions = resultContainer.querySelector('.result-actions');
      resultActions.innerHTML = '';
      
      if (zip) {
        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Create download link for zip
        const zipLink = createDownloadLink(
          zipBlob,
          `pdf_images.zip`,
          'application/zip'
        );
        
        resultActions.appendChild(zipLink);
      } else {
        // Create download link for single image
        const imageLink = createDownloadLink(
          images[0],
          `pdf_page_${this.selectedPages[0]}.${fileExtension}`,
          format
        );
        
        resultActions.appendChild(imageLink);
      }
      
      // Initialize Feather icons
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
      
      // Show success message
      showSuccess(`Converted ${this.selectedPages.length} pages to images successfully!`);
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to convert PDF: ' + error.message);
    }
  }
};

// PDF Compression Tool functionality
const PDFCompressTool = {
  pdfDocument: null,
  pdfFile: null,
  
  // Initialize the PDF compression tool
  init: function() {
    // Check if PDF.js is loaded
    PDFTools.loadPDFJS();
    
    // Handle file input
    const fileInput = document.getElementById('pdfFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handlePDFSelect.bind(this));
    }
    
    // Handle compress button
    const compressButton = document.getElementById('compressButton');
    if (compressButton) {
      compressButton.addEventListener('click', this.compressPDF.bind(this));
    }
  },
  
  // Handle PDF file selection
  handlePDFSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      showError('Please select a valid PDF file');
      return;
    }
    
    try {
      showLoading();
      this.pdfFile = file;
      
      // Load PDF document
      this.pdfDocument = await PDFTools.loadPDFDocument(file);
      
      // Get PDF info
      const pdfInfo = await PDFTools.getPDFInfo(this.pdfDocument);
      
      // Update file info
      document.getElementById('pageCount').textContent = pdfInfo.pageCount;
      document.getElementById('fileSize').textContent = formatFileSize(file.size);
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load PDF: ' + error.message);
    }
  },
  
  // Compress PDF
  compressPDF: async function() {
    if (!this.pdfDocument || !this.pdfFile) {
      showError('Please select a PDF file first');
      return;
    }
    
    try {
      showLoading();
      
      // Get compression options
      const qualitySelect = document.getElementById('compressionLevel');
      const quality = qualitySelect ? parseFloat(qualitySelect.value) : 0.7;
      
      const imageQualitySelect = document.getElementById('imageQuality');
      const imageQuality = imageQualitySelect ? parseFloat(imageQualitySelect.value) : 0.5;
      
      // This is a simplified approach since full PDF compression
      // would require a more complex implementation
      // In a real application, we'd use libraries like pdf-lib or similar
      
      // For demonstration, we'll re-render the PDF at lower quality
      const pageCount = this.pdfDocument.numPages;
      const doc = new jspdf.jsPDF();
      
      for (let i = 1; i <= pageCount; i++) {
        // Get page
        const page = await this.pdfDocument.getPage(i);
        
        // Render to canvas with reduced quality
        const canvas = await PDFTools.renderPageToCanvas(page, 1.0);
        
        // Add to new PDF (first page doesn't need addPage)
        if (i > 1) {
          doc.addPage();
        }
        
        // Get page dimensions
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Add image to PDF at reduced quality
        const imgData = canvas.toDataURL('image/jpeg', imageQuality);
        doc.addImage(imgData, 'JPEG', 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), '', 'FAST');
        
        // Update progress
        updateProgress((i / pageCount) * 100);
      }
      
      // Generate compressed PDF
      const compressedPDFBlob = doc.output('blob');
      
      // Create download link
      const downloadLink = createDownloadLink(
        compressedPDFBlob,
        'compressed_document.pdf',
        'application/pdf'
      );
      
      // Update compression results
      const originalSize = this.pdfFile.size;
      const compressedSize = compressedPDFBlob.size;
      const reductionPercent = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
      
      document.getElementById('originalSizeResult').textContent = formatFileSize(originalSize);
      document.getElementById('compressedSizeResult').textContent = formatFileSize(compressedSize);
      document.getElementById('reductionResult').textContent = `${reductionPercent}%`;
      
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
      showSuccess(`PDF compressed successfully! Reduced by ${reductionPercent}%`);
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to compress PDF: ' + error.message);
    }
  }
};

// PDF Unlock Tool functionality
const PDFUnlockTool = {
  pdfFile: null,
  
  // Initialize the PDF unlock tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('pdfFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handlePDFSelect.bind(this));
    }
    
    // Handle unlock button
    const unlockButton = document.getElementById('unlockButton');
    if (unlockButton) {
      unlockButton.addEventListener('click', this.unlockPDF.bind(this));
    }
  },
  
  // Handle PDF file selection
  handlePDFSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      showError('Please select a valid PDF file');
      return;
    }
    
    try {
      showLoading();
      this.pdfFile = file;
      
      // Try to load PDF to check if it's encrypted
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      try {
        // Try to load PDF normally
        const pdfDoc = await loadingTask.promise;
        const isEncrypted = pdfDoc.isEncrypted;
        
        if (!isEncrypted) {
          showError('This PDF is not password-protected');
          hideLoading();
          return;
        }
        
        // Show password input
        document.getElementById('pdfPasswordContainer').style.display = 'block';
      } catch (error) {
        // If error contains "password", it's likely password-protected
        if (error.message.includes('password')) {
          document.getElementById('pdfPasswordContainer').style.display = 'block';
        } else {
          throw error;
        }
      }
      
      // Update file info
      document.getElementById('fileSize').textContent = formatFileSize(file.size);
      document.getElementById('fileName').textContent = file.name;
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load PDF: ' + error.message);
    }
  },
  
  // Unlock PDF with password
  unlockPDF: async function() {
    if (!this.pdfFile) {
      showError('Please select a PDF file first');
      return;
    }
    
    try {
      showLoading();
      
      const passwordInput = document.getElementById('pdfPassword');
      const password = passwordInput ? passwordInput.value : '';
      
      if (!password) {
        showError('Please enter the PDF password');
        hideLoading();
        return;
      }
      
      // Load the PDF with password
      const arrayBuffer = await readFileAsArrayBuffer(this.pdfFile);
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        password: password
      });
      
      try {
        // Try to load with provided password
        const pdfDoc = await loadingTask.promise;
        
        // If we get here, password was correct
        // Now we need to create a new PDF without password
        // In a real application, we'd use a library like pdf-lib
        // For this demo, we'll use a simpler approach
        
        // Create a new PDF document
        const doc = new jspdf.jsPDF();
        
        // Copy each page to the new document
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          // Get page
          const page = await pdfDoc.getPage(i);
          
          // Render to canvas
          const canvas = await PDFTools.renderPageToCanvas(page, 1.0);
          
          // Add to new PDF (first page doesn't need addPage)
          if (i > 1) {
            doc.addPage();
          }
          
          // Get page dimensions
          const viewport = page.getViewport({ scale: 1.0 });
          
          // Add image to PDF
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          doc.addImage(imgData, 'JPEG', 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());
          
          // Update progress
          updateProgress((i / pdfDoc.numPages) * 100);
        }
        
        // Generate unlocked PDF
        const unlockedPDFBlob = doc.output('blob');
        
        // Create download link
        const downloadLink = createDownloadLink(
          unlockedPDFBlob,
          'unlocked_document.pdf',
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
        
        // Show success message
        showSuccess('PDF unlocked successfully!');
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        // Password incorrect
        if (error.message.includes('password')) {
          showError('Incorrect password. Please try again.');
        } else {
          throw error;
        }
        hideLoading();
      }
    } catch (error) {
      hideLoading();
      showError('Failed to unlock PDF: ' + error.message);
    }
  }
};

// PDF Convert Tool functionality
const PDFConvertTool = {
  pdfDocument: null,
  pdfFile: null,
  
  // Initialize the PDF conversion tool
  init: function() {
    // Check if PDF.js is loaded
    PDFTools.loadPDFJS();
    
    // Handle file input
    const fileInput = document.getElementById('pdfFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handlePDFSelect.bind(this));
    }
    
    // Handle convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) {
      convertButton.addEventListener('click', this.convertPDF.bind(this));
    }
    
    // Handle format change
    const formatSelect = document.getElementById('outputFormat');
    if (formatSelect) {
      formatSelect.addEventListener('change', () => {
        // Show format-specific options
        const format = formatSelect.value;
        document.querySelectorAll('.format-options').forEach(el => {
          el.style.display = 'none';
        });
        
        const targetOptions = document.getElementById(`${format}Options`);
        if (targetOptions) {
          targetOptions.style.display = 'block';
        }
      });
    }
  },
  
  // Handle PDF file selection
  handlePDFSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      showError('Please select a valid PDF file');
      return;
    }
    
    try {
      showLoading();
      this.pdfFile = file;
      
      // Load PDF document
      this.pdfDocument = await PDFTools.loadPDFDocument(file);
      
      // Get PDF info
      const pdfInfo = await PDFTools.getPDFInfo(this.pdfDocument);
      
      // Update file info
      document.getElementById('pageCount').textContent = pdfInfo.pageCount;
      document.getElementById('fileSize').textContent = formatFileSize(file.size);
      
      // Get first page for preview
      const page = await this.pdfDocument.getPage(1);
      const previewCanvas = await PDFTools.renderPageToCanvas(page, 0.5);
      
      // Show preview
      const previewContainer = document.getElementById('pdfPreview');
      previewContainer.innerHTML = '';
      previewContainer.appendChild(previewCanvas);
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load PDF: ' + error.message);
    }
  },
  
  // Convert PDF to selected format
  convertPDF: async function() {
    if (!this.pdfDocument || !this.pdfFile) {
      showError('Please select a PDF file first');
      return;
    }
    
    try {
      showLoading();
      
      // Get selected format
      const formatSelect = document.getElementById('outputFormat');
      const format = formatSelect ? formatSelect.value : 'text';
      
      let resultBlob;
      let filename;
      let mimeType;
      
      switch (format) {
        case 'text':
          // Extract text from PDF
          const textContent = await this.extractText();
          resultBlob = new Blob([textContent], { type: 'text/plain' });
          filename = 'converted_document.txt';
          mimeType = 'text/plain';
          break;
          
        case 'html':
          // Convert to HTML
          const htmlContent = await this.convertToHTML();
          resultBlob = new Blob([htmlContent], { type: 'text/html' });
          filename = 'converted_document.html';
          mimeType = 'text/html';
          break;
          
        case 'docx':
          // For demonstration purposes
          // In a real app, this would use a library like mammoth or docx
          showError('Conversion to DOCX is not implemented in this demo');
          hideLoading();
          return;
          
        case 'excel':
          // For demonstration purposes
          // In a real app, this would use a library like xlsx
          showError('Conversion to Excel is not implemented in this demo');
          hideLoading();
          return;
          
        default:
          throw new Error('Unsupported format');
      }
      
      // Create download link
      const downloadLink = createDownloadLink(
        resultBlob,
        filename,
        mimeType
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
      showSuccess(`PDF converted to ${format.toUpperCase()} successfully!`);
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to convert PDF: ' + error.message);
    }
  },
  
  // Extract text from PDF
  extractText: async function() {
    let fullText = '';
    
    for (let i = 1; i <= this.pdfDocument.numPages; i++) {
      // Get page
      const page = await this.pdfDocument.getPage(i);
      
      // Extract text content
      const textContent = await page.getTextContent();
      
      // Concatenate text items
      const pageText = textContent.items.map(item => item.str).join(' ');
      
      // Add page number and text
      fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
      
      // Update progress
      updateProgress((i / this.pdfDocument.numPages) * 100);
    }
    
    return fullText;
  },
  
  // Convert PDF to HTML
  convertToHTML: async function() {
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Converted Document</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .page { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
    .page-number { font-weight: bold; margin-bottom: 10px; }
  </style>
</head>
<body>`;
    
    for (let i = 1; i <= this.pdfDocument.numPages; i++) {
      // Get page
      const page = await this.pdfDocument.getPage(i);
      
      // Extract text content
      const textContent = await page.getTextContent();
      
      // Render page to canvas for image
      const canvas = await PDFTools.renderPageToCanvas(page, 1.0);
      const pageImage = canvas.toDataURL('image/jpeg', 0.7);
      
      // Add page to HTML
      htmlContent += `
  <div class="page">
    <div class="page-number">Page ${i}</div>
    <img src="${pageImage}" style="max-width: 100%;" alt="Page ${i}">
    <div class="page-text">
      ${textContent.items.map(item => item.str).join(' ')}
    </div>
  </div>`;
      
      // Update progress
      updateProgress((i / this.pdfDocument.numPages) * 100);
    }
    
    htmlContent += `
</body>
</html>`;
    
    return htmlContent;
  }
};

// Initialize tools based on page
document.addEventListener('DOMContentLoaded', () => {
  // Determine which tool to initialize based on page
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('/pdf/to-image.html')) {
    PDFToImageTool.init();
  } else if (currentPage.includes('/pdf/compress.html')) {
    PDFCompressTool.init();
  } else if (currentPage.includes('/pdf/unlock.html')) {
    PDFUnlockTool.init();
  } else if (currentPage.includes('/pdf/convert.html')) {
    PDFConvertTool.init();
  }
});
