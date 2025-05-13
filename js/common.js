/**
 * Fileverse - Common JavaScript utilities
 * Contains shared functions used across all tool pages
 */

// Elements to show/hide during processing
const showLoading = () => {
  const loadingEl = document.querySelector('.progress-container');
  if (loadingEl) loadingEl.style.display = 'block';
};

const hideLoading = () => {
  const loadingEl = document.querySelector('.progress-container');
  if (loadingEl) loadingEl.style.display = 'none';
};

// Update progress bar with percentage
const updateProgress = (percent) => {
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (progressText) progressText.textContent = `Processing: ${Math.round(percent)}%`;
};

// Show error message
const showError = (message) => {
  hideLoading();
  
  const errorEl = document.querySelector('.error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  } else {
    console.error(message);
  }
};

// Show success message
const showSuccess = (message) => {
  hideLoading();
  
  const successEl = document.querySelector('.success-message');
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 5000);
  }
};

// Get file size in human-readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file extension from name
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};

// Check if file type is image
const isImageFile = (file) => {
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  return acceptedTypes.includes(file.type);
};

// Check if file type is PDF
const isPdfFile = (file) => {
  return file.type === 'application/pdf';
};

// Check if file type is video
const isVideoFile = (file) => {
  const acceptedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
  return acceptedTypes.includes(file.type);
};

// Check if file type is audio
const isAudioFile = (file) => {
  const acceptedTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'];
  return acceptedTypes.includes(file.type);
};

// Check if file type is document
const isDocumentFile = (file) => {
  const acceptedTypes = [
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  return acceptedTypes.includes(file.type);
};

// Read file as data URL
const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsDataURL(file);
  });
};

// Read file as array buffer
const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsArrayBuffer(file);
  });
};

// Read file as text
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsText(file);
  });
};

// Create a downloadable file link
const createDownloadLink = (data, filename, type) => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.className = 'btn btn-primary';
  link.innerHTML = `<i data-feather="download"></i> Download ${filename}`;
  
  // Clean up the URL object after download
  link.addEventListener('click', () => {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  });
  
  return link;
};

// Initialize file input elements
const initFileInputs = () => {
  const fileInputLabels = document.querySelectorAll('.file-input-label');
  
  fileInputLabels.forEach(label => {
    const input = label.querySelector('input[type="file"]');
    
    // Update label text when file is selected
    if (input) {
      input.addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || 'No file selected';
        const fileNameElement = label.querySelector('.file-name');
        
        if (fileNameElement) {
          fileNameElement.textContent = fileName;
        } else {
          const nameSpan = document.createElement('p');
          nameSpan.className = 'file-name';
          nameSpan.textContent = fileName;
          label.appendChild(nameSpan);
        }
        
        // Add a class to show the file is selected
        label.classList.add('file-selected');
      });
    }
    
    // Setup drag and drop
    label.addEventListener('dragover', (e) => {
      e.preventDefault();
      label.classList.add('drag-over');
    });
    
    label.addEventListener('dragleave', () => {
      label.classList.remove('drag-over');
    });
    
    label.addEventListener('drop', (e) => {
      e.preventDefault();
      label.classList.remove('drag-over');
      
      if (input && e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        input.dispatchEvent(changeEvent);
      }
    });
  });
};

// Initialize range input sliders with value display
const initRangeInputs = () => {
  const rangeInputs = document.querySelectorAll('.option-range');
  
  rangeInputs.forEach(input => {
    const valueDisplay = document.querySelector(`#${input.id}-value`);
    
    if (valueDisplay) {
      // Set initial value
      valueDisplay.textContent = input.value;
      
      // Update on input change
      input.addEventListener('input', () => {
        valueDisplay.textContent = input.value;
      });
    }
  });
};

// Set up back-to-top button
const initBackToTop = () => {
  const backToTopBtn = document.getElementById('back-to-top');
  
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        backToTopBtn.style.display = 'block';
      } else {
        backToTopBtn.style.display = 'none';
      }
    });
    
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
};

// Mobile menu toggle
const initMobileMenu = () => {
  const menuToggle = document.getElementById('menu-toggle');
  const navList = document.querySelector('.nav-list');
  
  if (menuToggle && navList) {
    menuToggle.addEventListener('click', () => {
      navList.classList.toggle('active');
    });
  }
};

// Initialize all common JS after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Feather icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
  
  // Initialize UI elements
  initFileInputs();
  initRangeInputs();
  initBackToTop();
  initMobileMenu();
  
  // Hide loading screens by default
  hideLoading();
  
  // Hide message elements by default
  const messages = document.querySelectorAll('.message');
  messages.forEach(msg => {
    msg.style.display = 'none';
  });
});
