/**
 * Fileverse - Image Processing Tools
 * Handles client-side image manipulation using Canvas API
 */

// Common settings and utilities for image tools
const ImageTools = {
  // Maximum dimension for preview images
  MAX_PREVIEW_SIZE: 800,
  
  // Default image quality for JPEG compression
  DEFAULT_QUALITY: 0.8,
  
  // Supported image formats
  FORMATS: {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    WEBP: 'image/webp',
    GIF: 'image/gif',
    BMP: 'image/bmp'
  },
  
  // Create an image element from a file and return a promise
  createImage: function(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  },
  
  // Create a canvas with the given dimensions
  createCanvas: function(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  },
  
  // Draw an image to a canvas with specified dimensions
  drawImageToCanvas: function(img, canvas, width, height) {
    const ctx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  },
  
  // Resize an image to fit within max dimensions while preserving aspect ratio
  resizeImageForPreview: function(img) {
    const maxSize = this.MAX_PREVIEW_SIZE;
    let width = img.width;
    let height = img.height;
    
    if (width > height) {
      if (width > maxSize) {
        height = Math.round(height * (maxSize / width));
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = Math.round(width * (maxSize / height));
        height = maxSize;
      }
    }
    
    const canvas = this.createCanvas(width, height);
    this.drawImageToCanvas(img, canvas, width, height);
    return canvas;
  },
  
  // Convert canvas to blob with specified format and quality
  canvasToBlob: function(canvas, format = this.FORMATS.JPEG, quality = this.DEFAULT_QUALITY) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, format, quality);
    });
  },
  
  // Generate a thumbnail preview from an image file
  generateThumbnail: async function(file) {
    try {
      const img = await this.createImage(file);
      const canvas = this.resizeImageForPreview(img);
      return canvas.toDataURL();
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  }
};

// Image Cropping Tool functionality
const ImageCropTool = {
  originalImage: null,
  cropCanvas: null,
  cropContext: null,
  previewCanvas: null,
  previewContext: null,
  cropStartX: 0,
  cropStartY: 0,
  cropEndX: 0,
  cropEndY: 0,
  isDragging: false,
  
  // Initialize the crop tool
  init: function() {
    this.cropCanvas = document.getElementById('cropCanvas');
    this.previewCanvas = document.getElementById('previewCanvas');
    
    if (!this.cropCanvas || !this.previewCanvas) return;
    
    this.cropContext = this.cropCanvas.getContext('2d');
    this.previewContext = this.previewCanvas.getContext('2d');
    
    // Set up crop canvas event listeners
    this.cropCanvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.cropCanvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.cropCanvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.cropCanvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    
    // Touch support
    this.cropCanvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.cropCanvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    this.cropCanvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    
    // Handle file input
    const fileInput = document.getElementById('imageFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleImageSelect.bind(this));
    }
    
    // Handle crop button
    const cropButton = document.getElementById('cropButton');
    if (cropButton) {
      cropButton.addEventListener('click', this.performCrop.bind(this));
    }
  },
  
  // Handle image file selection
  handleImageSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      showError('Please select a valid image file');
      return;
    }
    
    try {
      showLoading();
      this.originalImage = await ImageTools.createImage(file);
      
      // Resize canvas to fit image
      this.cropCanvas.width = this.originalImage.width;
      this.cropCanvas.height = this.originalImage.height;
      
      // Draw image to crop canvas
      this.cropContext.drawImage(this.originalImage, 0, 0);
      
      // Initialize crop area to the center 50%
      this.cropStartX = this.originalImage.width * 0.25;
      this.cropStartY = this.originalImage.height * 0.25;
      this.cropEndX = this.originalImage.width * 0.75;
      this.cropEndY = this.originalImage.height * 0.75;
      
      // Update preview
      this.updateCropPreview();
      hideLoading();
      
      // Update file info
      document.getElementById('originalWidth').textContent = this.originalImage.width + 'px';
      document.getElementById('originalHeight').textContent = this.originalImage.height + 'px';
      document.getElementById('originalSize').textContent = formatFileSize(file.size);
      
      // Show crop container
      document.querySelector('.canvas-container').style.display = 'block';
    } catch (error) {
      hideLoading();
      showError('Failed to load image: ' + error.message);
    }
  },
  
  // Draw crop overlay on canvas
  drawCropOverlay: function() {
    if (!this.cropContext || !this.originalImage) return;
    
    // Clear canvas
    this.cropContext.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
    
    // Draw original image
    this.cropContext.drawImage(this.originalImage, 0, 0);
    
    // Draw semi-transparent overlay
    this.cropContext.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.cropContext.fillRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
    
    // Calculate crop rectangle
    const cropWidth = this.cropEndX - this.cropStartX;
    const cropHeight = this.cropEndY - this.cropStartY;
    
    // Clear the crop area to show the original image
    this.cropContext.clearRect(this.cropStartX, this.cropStartY, cropWidth, cropHeight);
    
    // Draw crop rectangle border
    this.cropContext.strokeStyle = '#00f2fe';
    this.cropContext.lineWidth = 2;
    this.cropContext.strokeRect(this.cropStartX, this.cropStartY, cropWidth, cropHeight);
    
    // Draw handles at corners
    const handleSize = 8;
    this.cropContext.fillStyle = '#00f2fe';
    
    // Top-left
    this.cropContext.fillRect(this.cropStartX - handleSize/2, this.cropStartY - handleSize/2, handleSize, handleSize);
    // Top-right
    this.cropContext.fillRect(this.cropEndX - handleSize/2, this.cropStartY - handleSize/2, handleSize, handleSize);
    // Bottom-left
    this.cropContext.fillRect(this.cropStartX - handleSize/2, this.cropEndY - handleSize/2, handleSize, handleSize);
    // Bottom-right
    this.cropContext.fillRect(this.cropEndX - handleSize/2, this.cropEndY - handleSize/2, handleSize, handleSize);
  },
  
  // Update preview with current crop selection
  updateCropPreview: function() {
    if (!this.previewContext || !this.originalImage) return;
    
    const cropWidth = this.cropEndX - this.cropStartX;
    const cropHeight = this.cropEndY - this.cropStartY;
    
    // Resize preview canvas
    this.previewCanvas.width = cropWidth;
    this.previewCanvas.height = cropHeight;
    
    // Draw cropped area to preview canvas
    this.previewContext.drawImage(
      this.originalImage,
      this.cropStartX, this.cropStartY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
    
    // Update crop dimensions
    document.getElementById('cropWidth').textContent = Math.round(cropWidth) + 'px';
    document.getElementById('cropHeight').textContent = Math.round(cropHeight) + 'px';
    
    // Redraw crop overlay
    this.drawCropOverlay();
  },
  
  // Mouse event handlers
  onMouseDown: function(e) {
    this.isDragging = true;
    const rect = this.cropCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.cropCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.cropCanvas.height / rect.height);
    
    this.startDrag(x, y);
  },
  
  onMouseMove: function(e) {
    if (!this.isDragging) return;
    
    const rect = this.cropCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.cropCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.cropCanvas.height / rect.height);
    
    this.updateDrag(x, y);
  },
  
  onMouseUp: function() {
    this.isDragging = false;
  },
  
  // Touch event handlers
  onTouchStart: function(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.cropCanvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (this.cropCanvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (this.cropCanvas.height / rect.height);
      
      this.isDragging = true;
      this.startDrag(x, y);
    }
  },
  
  onTouchMove: function(e) {
    e.preventDefault();
    if (this.isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.cropCanvas.getBoundingClientRect();
      const x = (touch.clientX - rect.left) * (this.cropCanvas.width / rect.width);
      const y = (touch.clientY - rect.top) * (this.cropCanvas.height / rect.height);
      
      this.updateDrag(x, y);
    }
  },
  
  onTouchEnd: function(e) {
    e.preventDefault();
    this.isDragging = false;
  },
  
  // Determine drag mode and set initial position
  startDrag: function(x, y) {
    const handleSize = 10;
    const cropWidth = this.cropEndX - this.cropStartX;
    const cropHeight = this.cropEndY - this.cropStartY;
    
    // Check if we're near a corner
    if (Math.abs(x - this.cropStartX) < handleSize && Math.abs(y - this.cropStartY) < handleSize) {
      this.dragMode = 'topLeft';
    } else if (Math.abs(x - this.cropEndX) < handleSize && Math.abs(y - this.cropStartY) < handleSize) {
      this.dragMode = 'topRight';
    } else if (Math.abs(x - this.cropStartX) < handleSize && Math.abs(y - this.cropEndY) < handleSize) {
      this.dragMode = 'bottomLeft';
    } else if (Math.abs(x - this.cropEndX) < handleSize && Math.abs(y - this.cropEndY) < handleSize) {
      this.dragMode = 'bottomRight';
    }
    // Check if we're inside the crop area
    else if (x > this.cropStartX && x < this.cropEndX && y > this.cropStartY && y < this.cropEndY) {
      this.dragMode = 'move';
      this.dragOffsetX = x - this.cropStartX;
      this.dragOffsetY = y - this.cropStartY;
    }
    // Otherwise, start a new selection
    else {
      this.dragMode = 'new';
      this.cropStartX = x;
      this.cropStartY = y;
      this.cropEndX = x;
      this.cropEndY = y;
    }
  },
  
  // Update crop selection based on drag mode
  updateDrag: function(x, y) {
    const minSize = 20; // Minimum crop size
    
    // Constrain coordinates to canvas bounds
    x = Math.max(0, Math.min(this.cropCanvas.width, x));
    y = Math.max(0, Math.min(this.cropCanvas.height, y));
    
    switch (this.dragMode) {
      case 'topLeft':
        this.cropStartX = Math.min(this.cropEndX - minSize, x);
        this.cropStartY = Math.min(this.cropEndY - minSize, y);
        break;
      case 'topRight':
        this.cropEndX = Math.max(this.cropStartX + minSize, x);
        this.cropStartY = Math.min(this.cropEndY - minSize, y);
        break;
      case 'bottomLeft':
        this.cropStartX = Math.min(this.cropEndX - minSize, x);
        this.cropEndY = Math.max(this.cropStartY + minSize, y);
        break;
      case 'bottomRight':
        this.cropEndX = Math.max(this.cropStartX + minSize, x);
        this.cropEndY = Math.max(this.cropStartY + minSize, y);
        break;
      case 'move':
        const width = this.cropEndX - this.cropStartX;
        const height = this.cropEndY - this.cropStartY;
        
        let newStartX = x - this.dragOffsetX;
        let newStartY = y - this.dragOffsetY;
        
        // Ensure the crop area stays within canvas bounds
        if (newStartX < 0) newStartX = 0;
        if (newStartY < 0) newStartY = 0;
        if (newStartX + width > this.cropCanvas.width) newStartX = this.cropCanvas.width - width;
        if (newStartY + height > this.cropCanvas.height) newStartY = this.cropCanvas.height - height;
        
        this.cropStartX = newStartX;
        this.cropStartY = newStartY;
        this.cropEndX = newStartX + width;
        this.cropEndY = newStartY + height;
        break;
      case 'new':
        this.cropEndX = x;
        this.cropEndY = y;
        break;
    }
    
    this.updateCropPreview();
  },
  
  // Perform crop operation and prepare result for download
  performCrop: async function() {
    if (!this.originalImage) {
      showError('Please select an image first');
      return;
    }
    
    try {
      showLoading();
      
      const cropWidth = this.cropEndX - this.cropStartX;
      const cropHeight = this.cropEndY - this.cropStartY;
      
      // Create result canvas
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = cropWidth;
      resultCanvas.height = cropHeight;
      
      const resultCtx = resultCanvas.getContext('2d');
      resultCtx.drawImage(
        this.originalImage,
        this.cropStartX, this.cropStartY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      // Determine output format
      const formatSelect = document.getElementById('outputFormat');
      const format = formatSelect ? formatSelect.value : 'image/jpeg';
      
      // Convert to blob
      const blob = await ImageTools.canvasToBlob(resultCanvas, format);
      
      // Create download link
      const fileExtension = format.split('/')[1];
      const downloadLink = createDownloadLink(
        blob, 
        `cropped_image.${fileExtension}`, 
        format
      );
      
      // Display result
      const resultContainer = document.querySelector('.result-container');
      if (resultContainer) {
        const resultActions = resultContainer.querySelector('.result-actions');
        if (resultActions) {
          // Clear previous results
          resultActions.innerHTML = '';
          // Add download button
          resultActions.appendChild(downloadLink);
          // Initialize Feather icons
          if (typeof feather !== 'undefined') {
            feather.replace();
          }
        }
      }
      
      // Show success message
      showSuccess('Image cropped successfully!');
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to crop image: ' + error.message);
    }
  }
};

// Image Compression Tool functionality
const ImageCompressTool = {
  originalImage: null,
  originalSize: 0,
  
  // Initialize the compression tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('imageFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleImageSelect.bind(this));
    }
    
    // Handle compress button
    const compressButton = document.getElementById('compressButton');
    if (compressButton) {
      compressButton.addEventListener('click', this.performCompression.bind(this));
    }
    
    // Update compression preview when quality slider changes
    const qualitySlider = document.getElementById('quality');
    if (qualitySlider) {
      qualitySlider.addEventListener('input', this.updateCompressionPreview.bind(this));
    }
  },
  
  // Handle image file selection
  handleImageSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      showError('Please select a valid image file');
      return;
    }
    
    try {
      showLoading();
      this.originalSize = file.size;
      this.originalImage = await ImageTools.createImage(file);
      
      // Show original image preview
      const originalPreview = document.getElementById('originalPreview');
      if (originalPreview) {
        const canvas = ImageTools.resizeImageForPreview(this.originalImage);
        originalPreview.src = canvas.toDataURL();
        originalPreview.style.display = 'block';
      }
      
      // Update file info
      document.getElementById('originalWidth').textContent = this.originalImage.width + 'px';
      document.getElementById('originalHeight').textContent = this.originalImage.height + 'px';
      document.getElementById('originalSize').textContent = formatFileSize(file.size);
      
      // Show preview container
      document.querySelector('.preview-container').style.display = 'flex';
      
      // Initialize compression preview
      this.updateCompressionPreview();
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load image: ' + error.message);
    }
  },
  
  // Update compression preview based on quality slider
  updateCompressionPreview: async function() {
    if (!this.originalImage) return;
    
    const qualitySlider = document.getElementById('quality');
    const quality = qualitySlider ? parseFloat(qualitySlider.value) / 100 : 0.8;
    
    try {
      // Create preview canvas
      const canvas = ImageTools.resizeImageForPreview(this.originalImage);
      
      // Get compressed image preview
      const blob = await ImageTools.canvasToBlob(canvas, 'image/jpeg', quality);
      const compressedPreview = document.getElementById('compressedPreview');
      if (compressedPreview) {
        compressedPreview.src = URL.createObjectURL(blob);
        compressedPreview.style.display = 'block';
      }
      
      // Update compression info
      const compressionRatio = (this.originalSize / blob.size).toFixed(2);
      const percentReduction = ((1 - blob.size / this.originalSize) * 100).toFixed(2);
      
      document.getElementById('compressedSize').textContent = formatFileSize(blob.size);
      document.getElementById('compressionRatio').textContent = compressionRatio + 'x';
      document.getElementById('percentReduction').textContent = percentReduction + '%';
    } catch (error) {
      console.error('Error updating compression preview:', error);
    }
  },
  
  // Perform full image compression
  performCompression: async function() {
    if (!this.originalImage) {
      showError('Please select an image first');
      return;
    }
    
    try {
      showLoading();
      
      const qualitySlider = document.getElementById('quality');
      const quality = qualitySlider ? parseFloat(qualitySlider.value) / 100 : 0.8;
      
      // Create full-size canvas with original dimensions
      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.width;
      canvas.height = this.originalImage.height;
      
      // Draw original image to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.originalImage, 0, 0);
      
      // Determine output format
      const formatSelect = document.getElementById('outputFormat');
      const format = formatSelect ? formatSelect.value : 'image/jpeg';
      
      // Compress image
      const blob = await ImageTools.canvasToBlob(canvas, format, quality);
      
      // Create download link
      const fileExtension = format.split('/')[1];
      const downloadLink = createDownloadLink(
        blob, 
        `compressed_image.${fileExtension}`, 
        format
      );
      
      // Display result
      const resultContainer = document.querySelector('.result-container');
      if (resultContainer) {
        const resultActions = resultContainer.querySelector('.result-actions');
        if (resultActions) {
          // Clear previous results
          resultActions.innerHTML = '';
          // Add download button
          resultActions.appendChild(downloadLink);
          // Initialize Feather icons
          if (typeof feather !== 'undefined') {
            feather.replace();
          }
        }
      }
      
      // Show success message
      const percentReduction = ((1 - blob.size / this.originalSize) * 100).toFixed(2);
      showSuccess(`Image compressed successfully! Size reduced by ${percentReduction}%`);
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to compress image: ' + error.message);
    }
  }
};

// Image Format Conversion Tool functionality
const ImageConvertTool = {
  originalImage: null,
  originalFile: null,
  
  // Initialize the conversion tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('imageFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleImageSelect.bind(this));
    }
    
    // Handle convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) {
      convertButton.addEventListener('click', this.performConversion.bind(this));
    }
  },
  
  // Handle image file selection
  handleImageSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      showError('Please select a valid image file');
      return;
    }
    
    try {
      showLoading();
      this.originalFile = file;
      this.originalImage = await ImageTools.createImage(file);
      
      // Show original image preview
      const originalPreview = document.getElementById('originalPreview');
      if (originalPreview) {
        const canvas = ImageTools.resizeImageForPreview(this.originalImage);
        originalPreview.src = canvas.toDataURL();
        originalPreview.style.display = 'block';
      }
      
      // Update file info
      document.getElementById('originalWidth').textContent = this.originalImage.width + 'px';
      document.getElementById('originalHeight').textContent = this.originalImage.height + 'px';
      document.getElementById('originalSize').textContent = formatFileSize(file.size);
      document.getElementById('originalFormat').textContent = file.type.split('/')[1].toUpperCase();
      
      // Show preview container
      document.querySelector('.preview-container').style.display = 'flex';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load image: ' + error.message);
    }
  },
  
  // Perform image format conversion
  performConversion: async function() {
    if (!this.originalImage) {
      showError('Please select an image first');
      return;
    }
    
    try {
      showLoading();
      
      // Get selected output format
      const formatSelect = document.getElementById('outputFormat');
      const format = formatSelect ? formatSelect.value : 'image/jpeg';
      
      // Get quality setting
      const qualitySlider = document.getElementById('quality');
      const quality = qualitySlider ? parseFloat(qualitySlider.value) / 100 : 0.9;
      
      // Create canvas with original dimensions
      const canvas = document.createElement('canvas');
      canvas.width = this.originalImage.width;
      canvas.height = this.originalImage.height;
      
      // Draw original image to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.originalImage, 0, 0);
      
      // Convert image
      const blob = await ImageTools.canvasToBlob(canvas, format, quality);
      
      // Create download link
      const fileExtension = format.split('/')[1];
      const filename = this.originalFile.name.split('.')[0];
      const downloadLink = createDownloadLink(
        blob, 
        `${filename}.${fileExtension}`, 
        format
      );
      
      // Display result
      const resultContainer = document.querySelector('.result-container');
      if (resultContainer) {
        const resultActions = resultContainer.querySelector('.result-actions');
        if (resultActions) {
          // Clear previous results
          resultActions.innerHTML = '';
          // Add download button
          resultActions.appendChild(downloadLink);
          // Initialize Feather icons
          if (typeof feather !== 'undefined') {
            feather.replace();
          }
        }
      }
      
      // Show success message
      showSuccess(`Image converted to ${fileExtension.toUpperCase()} successfully!`);
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to convert image: ' + error.message);
    }
  }
};

// Image Resize Tool functionality
const ImageResizeTool = {
  originalImage: null,
  originalFile: null,
  lockAspectRatio: true,
  aspectRatio: 1,
  
  // Initialize the resize tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('imageFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleImageSelect.bind(this));
    }
    
    // Handle resize button
    const resizeButton = document.getElementById('resizeButton');
    if (resizeButton) {
      resizeButton.addEventListener('click', this.performResize.bind(this));
    }
    
    // Handle aspect ratio lock
    const aspectRatioLock = document.getElementById('lockAspectRatio');
    if (aspectRatioLock) {
      aspectRatioLock.addEventListener('change', (e) => {
        this.lockAspectRatio = e.target.checked;
      });
    }
    
    // Handle width/height input changes
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    
    if (widthInput && heightInput) {
      widthInput.addEventListener('input', () => {
        if (this.lockAspectRatio && this.aspectRatio) {
          heightInput.value = Math.round(parseInt(widthInput.value) / this.aspectRatio);
        }
        this.updateResizePreview();
      });
      
      heightInput.addEventListener('input', () => {
        if (this.lockAspectRatio && this.aspectRatio) {
          widthInput.value = Math.round(parseInt(heightInput.value) * this.aspectRatio);
        }
        this.updateResizePreview();
      });
    }
    
    // Handle predefined sizes
    const presetSizes = document.getElementById('presetSizes');
    if (presetSizes) {
      presetSizes.addEventListener('change', this.applyPresetSize.bind(this));
    }
  },
  
  // Handle image file selection
  handleImageSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      showError('Please select a valid image file');
      return;
    }
    
    try {
      showLoading();
      this.originalFile = file;
      this.originalImage = await ImageTools.createImage(file);
      
      // Calculate aspect ratio
      this.aspectRatio = this.originalImage.width / this.originalImage.height;
      
      // Show original image preview
      const originalPreview = document.getElementById('originalPreview');
      if (originalPreview) {
        const canvas = ImageTools.resizeImageForPreview(this.originalImage);
        originalPreview.src = canvas.toDataURL();
        originalPreview.style.display = 'block';
      }
      
      // Update file info
      document.getElementById('originalWidth').textContent = this.originalImage.width + 'px';
      document.getElementById('originalHeight').textContent = this.originalImage.height + 'px';
      document.getElementById('originalSize').textContent = formatFileSize(file.size);
      
      // Set initial width/height values in inputs
      const widthInput = document.getElementById('width');
      const heightInput = document.getElementById('height');
      
      if (widthInput && heightInput) {
        widthInput.value = this.originalImage.width;
        heightInput.value = this.originalImage.height;
        
        // Set max values
        widthInput.max = this.originalImage.width * 2;
        heightInput.max = this.originalImage.height * 2;
      }
      
      // Show preview container
      document.querySelector('.preview-container').style.display = 'flex';
      document.querySelector('.options-container').style.display = 'block';
      
      // Initialize resize preview
      this.updateResizePreview();
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load image: ' + error.message);
    }
  },
  
  // Apply preset size to inputs
  applyPresetSize: function(e) {
    const preset = e.target.value;
    
    // Reset to original if "custom" is selected
    if (preset === 'custom') {
      document.getElementById('width').value = this.originalImage.width;
      document.getElementById('height').value = this.originalImage.height;
      this.updateResizePreview();
      return;
    }
    
    // Parse preset dimensions
    const dimensions = preset.split('x');
    if (dimensions.length === 2) {
      const width = parseInt(dimensions[0]);
      const height = parseInt(dimensions[1]);
      
      document.getElementById('width').value = width;
      document.getElementById('height').value = height;
      this.updateResizePreview();
    }
  },
  
  // Update resize preview based on current inputs
  updateResizePreview: async function() {
    if (!this.originalImage) return;
    
    try {
      const widthInput = document.getElementById('width');
      const heightInput = document.getElementById('height');
      
      if (!widthInput || !heightInput) return;
      
      const width = parseInt(widthInput.value);
      const height = parseInt(heightInput.value);
      
      if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) return;
      
      // Create preview canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set dimensions proportional to preview area
      const maxPreviewDimension = 300;
      let previewWidth, previewHeight;
      
      if (width > height) {
        previewWidth = Math.min(width, maxPreviewDimension);
        previewHeight = (previewWidth / width) * height;
      } else {
        previewHeight = Math.min(height, maxPreviewDimension);
        previewWidth = (previewHeight / height) * width;
      }
      
      canvas.width = previewWidth;
      canvas.height = previewHeight;
      
      // Draw resized image for preview
      ctx.drawImage(this.originalImage, 0, 0, canvas.width, canvas.height);
      
      // Update preview
      const resizedPreview = document.getElementById('resizedPreview');
      if (resizedPreview) {
        resizedPreview.src = canvas.toDataURL();
        resizedPreview.style.display = 'block';
      }
      
      // Update resize info
      document.getElementById('newWidth').textContent = width + 'px';
      document.getElementById('newHeight').textContent = height + 'px';
      
      // Estimate new file size (rough approximation)
      const originalPixels = this.originalImage.width * this.originalImage.height;
      const newPixels = width * height;
      const estimatedSizeBytes = (this.originalFile.size * newPixels / originalPixels);
      
      document.getElementById('newSize').textContent = formatFileSize(estimatedSizeBytes);
    } catch (error) {
      console.error('Error updating resize preview:', error);
    }
  },
  
  // Perform image resize
  performResize: async function() {
    if (!this.originalImage) {
      showError('Please select an image first');
      return;
    }
    
    try {
      showLoading();
      
      const widthInput = document.getElementById('width');
      const heightInput = document.getElementById('height');
      
      if (!widthInput || !heightInput) {
        throw new Error('Missing dimension inputs');
      }
      
      const width = parseInt(widthInput.value);
      const height = parseInt(heightInput.value);
      
      if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        throw new Error('Invalid dimensions');
      }
      
      // Create canvas with new dimensions
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Draw resized image
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.originalImage, 0, 0, width, height);
      
      // Get selected output format
      const formatSelect = document.getElementById('outputFormat');
      const format = formatSelect ? formatSelect.value : 'image/jpeg';
      
      // Get quality setting
      const qualitySlider = document.getElementById('quality');
      const quality = qualitySlider ? parseFloat(qualitySlider.value) / 100 : 0.9;
      
      // Convert canvas to blob
      const blob = await ImageTools.canvasToBlob(canvas, format, quality);
      
      // Create download link
      const fileExtension = format.split('/')[1];
      const filename = this.originalFile.name.split('.')[0];
      const downloadLink = createDownloadLink(
        blob, 
        `${filename}_${width}x${height}.${fileExtension}`, 
        format
      );
      
      // Display result
      const resultContainer = document.querySelector('.result-container');
      if (resultContainer) {
        const resultActions = resultContainer.querySelector('.result-actions');
        if (resultActions) {
          // Clear previous results
          resultActions.innerHTML = '';
          // Add download button
          resultActions.appendChild(downloadLink);
          // Initialize Feather icons
          if (typeof feather !== 'undefined') {
            feather.replace();
          }
        }
      }
      
      // Show success message
      showSuccess(`Image resized to ${width}x${height} successfully!`);
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to resize image: ' + error.message);
    }
  }
};

// Images to PDF Tool functionality
const ImageToPdfTool = {
  images: [],
  
  // Initialize the image to PDF tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('imageFiles');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleImagesSelect.bind(this));
    }
    
    // Handle convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) {
      convertButton.addEventListener('click', this.convertToPdf.bind(this));
    }
    
    // Initialize sortable image list (if available)
    if (typeof Sortable !== 'undefined') {
      const imageList = document.getElementById('imageList');
      if (imageList) {
        Sortable.create(imageList, {
          animation: 150,
          ghostClass: 'sortable-ghost',
          onEnd: () => {
            this.updateImageOrder();
          }
        });
      }
    }
  },
  
  // Handle multiple image selection
  handleImagesSelect: async function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      showLoading();
      
      // Filter image files
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        showError('Please select valid image files');
        hideLoading();
        return;
      }
      
      // Process each image
      for (const file of imageFiles) {
        try {
          const img = await ImageTools.createImage(file);
          const thumbnail = await ImageTools.generateThumbnail(file);
          
          this.images.push({
            file,
            img,
            thumbnail,
            width: img.width,
            height: img.height
          });
        } catch (error) {
          console.error(`Error processing image ${file.name}:`, error);
        }
      }
      
      // Update UI with selected images
      this.updateImageList();
      
      hideLoading();
      
      // Show success message
      showSuccess(`${imageFiles.length} images added successfully`);
      
      // Show image list and options
      document.querySelector('.image-list-container').style.display = 'block';
      document.querySelector('.options-container').style.display = 'block';
    } catch (error) {
      hideLoading();
      showError('Failed to process images: ' + error.message);
    }
  },
  
  // Update the image list UI
  updateImageList: function() {
    const imageList = document.getElementById('imageList');
    if (!imageList) return;
    
    // Clear current list
    imageList.innerHTML = '';
    
    // Add each image as a list item
    this.images.forEach((image, index) => {
      const listItem = document.createElement('li');
      listItem.className = 'image-item';
      listItem.dataset.index = index;
      
      // Create thumbnail
      const thumbnail = document.createElement('img');
      thumbnail.src = image.thumbnail;
      thumbnail.alt = `Image ${index + 1}`;
      thumbnail.className = 'image-thumbnail';
      
      // Create info
      const infoDiv = document.createElement('div');
      infoDiv.className = 'image-info';
      infoDiv.innerHTML = `
        <p class="image-name">${image.file.name}</p>
        <p class="image-meta">${image.width}x${image.height} - ${formatFileSize(image.file.size)}</p>
      `;
      
      // Create controls
      const controlsDiv = document.createElement('div');
      controlsDiv.className = 'image-controls';
      
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.className = 'image-control';
      removeBtn.innerHTML = '<i data-feather="trash-2"></i>';
      removeBtn.title = 'Remove image';
      removeBtn.addEventListener('click', () => this.removeImage(index));
      
      // Rotate button
      const rotateBtn = document.createElement('button');
      rotateBtn.className = 'image-control';
      rotateBtn.innerHTML = '<i data-feather="rotate-cw"></i>';
      rotateBtn.title = 'Rotate image';
      rotateBtn.addEventListener('click', () => this.rotateImage(index));
      
      // Move buttons
      const moveUpBtn = document.createElement('button');
      moveUpBtn.className = 'image-control';
      moveUpBtn.innerHTML = '<i data-feather="arrow-up"></i>';
      moveUpBtn.title = 'Move up';
      moveUpBtn.addEventListener('click', () => this.moveImage(index, 'up'));
      moveUpBtn.disabled = index === 0;
      
      const moveDownBtn = document.createElement('button');
      moveDownBtn.className = 'image-control';
      moveDownBtn.innerHTML = '<i data-feather="arrow-down"></i>';
      moveDownBtn.title = 'Move down';
      moveDownBtn.addEventListener('click', () => this.moveImage(index, 'down'));
      moveDownBtn.disabled = index === this.images.length - 1;
      
      // Add controls to container
      controlsDiv.appendChild(moveUpBtn);
      controlsDiv.appendChild(moveDownBtn);
      controlsDiv.appendChild(rotateBtn);
      controlsDiv.appendChild(removeBtn);
      
      // Assemble list item
      listItem.appendChild(thumbnail);
      listItem.appendChild(infoDiv);
      listItem.appendChild(controlsDiv);
      
      // Add to list
      imageList.appendChild(listItem);
    });
    
    // Initialize Feather icons
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
    
    // Update total count
    document.getElementById('imageCount').textContent = this.images.length;
  },
  
  // Remove an image from the list
  removeImage: function(index) {
    this.images.splice(index, 1);
    this.updateImageList();
  },
  
  // Rotate an image 90 degrees clockwise
  rotateImage: async function(index) {
    try {
      const image = this.images[index];
      
      // Create a canvas to rotate the image
      const canvas = document.createElement('canvas');
      canvas.width = image.height;
      canvas.height = image.width;
      
      const ctx = canvas.getContext('2d');
      
      // Translate and rotate
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(image.img, -image.width / 2, -image.height / 2);
      
      // Create a new image from the rotated canvas
      const rotatedDataURL = canvas.toDataURL();
      const rotatedImg = new Image();
      
      await new Promise((resolve) => {
        rotatedImg.onload = resolve;
        rotatedImg.src = rotatedDataURL;
      });
      
      // Swap width and height
      const temp = image.width;
      image.width = image.height;
      image.height = temp;
      
      // Update image and thumbnail
      image.img = rotatedImg;
      image.thumbnail = rotatedDataURL;
      
      // Update the UI
      this.updateImageList();
    } catch (error) {
      showError('Failed to rotate image: ' + error.message);
    }
  },
  
  // Move an image up or down in the list
  moveImage: function(index, direction) {
    if (direction === 'up' && index > 0) {
      const temp = this.images[index];
      this.images[index] = this.images[index - 1];
      this.images[index - 1] = temp;
    } else if (direction === 'down' && index < this.images.length - 1) {
      const temp = this.images[index];
      this.images[index] = this.images[index + 1];
      this.images[index + 1] = temp;
    }
    
    this.updateImageList();
  },
  
  // Update image order after drag-and-drop reordering
  updateImageOrder: function() {
    const imageItems = document.querySelectorAll('.image-item');
    const newOrder = [];
    
    imageItems.forEach(item => {
      const index = parseInt(item.dataset.index);
      newOrder.push(this.images[index]);
    });
    
    this.images = newOrder;
    this.updateImageList();
  },
  
  // Convert images to PDF
  convertToPdf: async function() {
    if (this.images.length === 0) {
      showError('Please add at least one image');
      return;
    }
    
    try {
      showLoading();
      
      // Load required libraries dynamically if not available
      if (typeof jsPDF === 'undefined') {
        // Note: In a real implementation, you would need to load jsPDF here
        throw new Error('PDF generation library not available');
      }
      
      // Get PDF options
      const pageFormat = document.getElementById('pageFormat').value || 'a4';
      const pageOrientation = document.getElementById('pageOrientation').value || 'portrait';
      const margin = parseInt(document.getElementById('margin').value) || 10;
      
      // Create PDF document
      const pdf = new jsPDF({
        format: pageFormat,
        orientation: pageOrientation,
        unit: 'mm'
      });
      
      // Get page dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      
      // Process each image
      for (let i = 0; i < this.images.length; i++) {
        const image = this.images[i];
        
        // Add a new page for each image except the first
        if (i > 0) {
          pdf.addPage();
        }
        
        // Calculate image dimensions to fit within content area
        let imgWidth = image.width;
        let imgHeight = image.height;
        
        // Scale image to fit content area while maintaining aspect ratio
        if (imgWidth > contentWidth) {
          const scaleFactor = contentWidth / imgWidth;
          imgWidth = contentWidth;
          imgHeight = imgHeight * scaleFactor;
        }
        
        if (imgHeight > contentHeight) {
          const scaleFactor = contentHeight / imgHeight;
          imgHeight = contentHeight;
          imgWidth = imgWidth * scaleFactor;
        }
        
        // Convert to mm for PDF
        imgWidth = imgWidth * 0.26458;
        imgHeight = imgHeight * 0.26458;
        
        // Calculate centered position
        const xPos = margin + (contentWidth - imgWidth) / 2;
        const yPos = margin + (contentHeight - imgHeight) / 2;
        
        // Add image to PDF
        pdf.addImage(
          image.img, 
          'JPEG', 
          xPos, 
          yPos, 
          imgWidth, 
          imgHeight
        );
        
        // Update progress
        updateProgress((i + 1) / this.images.length * 100);
      }
      
      // Generate PDF blob
      const pdfBlob = pdf.output('blob');
      
      // Create download link
      const downloadLink = createDownloadLink(
        pdfBlob, 
        'images_to_pdf.pdf', 
        'application/pdf'
      );
      
      // Display result
      const resultContainer = document.querySelector('.result-container');
      if (resultContainer) {
        const resultActions = resultContainer.querySelector('.result-actions');
        if (resultActions) {
          // Clear previous results
          resultActions.innerHTML = '';
          // Add download button
          resultActions.appendChild(downloadLink);
          // Initialize Feather icons
          if (typeof feather !== 'undefined') {
            feather.replace();
          }
        }
      }
      
      // Show success message
      showSuccess(`PDF created successfully with ${this.images.length} images!`);
      hideLoading();
      
      // Scroll to result
      resultContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      hideLoading();
      showError('Failed to create PDF: ' + error.message);
    }
  }
};

// Initialize tools based on page
document.addEventListener('DOMContentLoaded', () => {
  // Determine which tool to initialize based on page
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('/image/crop.html')) {
    ImageCropTool.init();
  } else if (currentPage.includes('/image/compress.html')) {
    ImageCompressTool.init();
  } else if (currentPage.includes('/image/convert.html')) {
    ImageConvertTool.init();
  } else if (currentPage.includes('/image/resize.html')) {
    ImageResizeTool.init();
  } else if (currentPage.includes('/image/to-pdf.html')) {
    ImageToPdfTool.init();
  }
});
