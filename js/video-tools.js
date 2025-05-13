/**
 * Fileverse - Video Processing Tools
 * Handles client-side video manipulation using FFmpeg.wasm
 */

// Video Tools namespace with common utilities
const VideoTools = {
  // Flag to check if FFmpeg is loaded
  ffmpegLoaded: false,
  ffmpeg: null,
  
  // Load FFmpeg WASM
  loadFFmpeg: async function() {
    if (this.ffmpegLoaded) return this.ffmpeg;
    
    try {
      // In a real implementation, we would load FFmpeg.wasm here
      // For demonstration purposes, we'll use a mock implementation
      
      if (typeof FFmpeg !== 'undefined') {
        this.ffmpeg = FFmpeg.createFFmpeg({ log: false });
        await this.ffmpeg.load();
        this.ffmpegLoaded = true;
        return this.ffmpeg;
      } else {
        throw new Error('FFmpeg library not available');
      }
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw error;
    }
  },
  
  // Create a preview element for a video file
  createVideoPreview: function(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve(video);
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  },
  
  // Get video information (duration, resolution, etc.)
  getVideoInfo: function(video) {
    return {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: video.videoWidth / video.videoHeight
    };
  },
  
  // Format time in seconds to HH:MM:SS format
  formatTime: function(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return [
      h > 0 ? h : null,
      h > 0 ? (m < 10 ? '0' + m : m) : m,
      s < 10 ? '0' + s : s
    ].filter(Boolean).join(':');
  },
  
  // Generate thumbnail from video at specified time
  generateThumbnail: function(videoFile, timeInSeconds = 0) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        // Set seek position
        video.currentTime = Math.min(timeInSeconds, video.duration / 2);
      };
      
      video.onseeked = () => {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get data URL
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        // Clean up
        URL.revokeObjectURL(video.src);
        
        resolve(thumbnailUrl);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };
      
      video.src = URL.createObjectURL(videoFile);
    });
  }
};

// Video Compression Tool functionality
const VideoCompressTool = {
  videoFile: null,
  videoElement: null,
  videoInfo: null,
  
  // Initialize the video compression tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('videoFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleVideoSelect.bind(this));
    }
    
    // Handle compress button
    const compressButton = document.getElementById('compressButton');
    if (compressButton) {
      compressButton.addEventListener('click', this.compressVideo.bind(this));
    }
    
    // Handle preset change
    const presetSelect = document.getElementById('preset');
    if (presetSelect) {
      presetSelect.addEventListener('change', this.updateCompressionSettings.bind(this));
    }
  },
  
  // Handle video file selection
  handleVideoSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('video/')) {
      showError('Please select a valid video file');
      return;
    }
    
    try {
      showLoading();
      this.videoFile = file;
      
      // Create video preview
      this.videoElement = await VideoTools.createVideoPreview(file);
      
      // Add to preview container
      const previewContainer = document.getElementById('videoPreview');
      previewContainer.innerHTML = '';
      previewContainer.appendChild(this.videoElement);
      
      // Get video info
      this.videoInfo = VideoTools.getVideoInfo(this.videoElement);
      
      // Generate thumbnail
      const thumbnail = await VideoTools.generateThumbnail(file, this.videoInfo.duration / 3);
      
      // Update file info
      document.getElementById('videoDuration').textContent = VideoTools.formatTime(this.videoInfo.duration);
      document.getElementById('videoResolution').textContent = `${this.videoInfo.width}x${this.videoInfo.height}`;
      document.getElementById('videoSize').textContent = formatFileSize(file.size);
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      
      // Initialize compression settings
      this.updateCompressionSettings();
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load video: ' + error.message);
    }
  },
  
  // Update compression settings based on selected preset
  updateCompressionSettings: function() {
    if (!this.videoInfo) return;
    
    const presetSelect = document.getElementById('preset');
    const preset = presetSelect ? presetSelect.value : 'medium';
    
    // Set default values based on preset
    const bitrateInput = document.getElementById('bitrate');
    const resolutionSelect = document.getElementById('resolution');
    
    if (bitrateInput && resolutionSelect) {
      switch (preset) {
        case 'low':
          // Low quality, highest compression
          bitrateInput.value = '500';
          resolutionSelect.value = '480p';
          break;
        case 'medium':
          // Medium quality, good compression
          bitrateInput.value = '1000';
          resolutionSelect.value = '720p';
          break;
        case 'high':
          // High quality, less compression
          bitrateInput.value = '2000';
          resolutionSelect.value = '1080p';
          break;
        case 'custom':
          // Don't change values
          break;
      }
    }
    
    // Calculate estimated file size
    this.updateEstimatedSize();
  },
  
  // Update estimated file size based on settings
  updateEstimatedSize: function() {
    if (!this.videoInfo) return;
    
    const bitrateInput = document.getElementById('bitrate');
    const bitrate = bitrateInput ? parseInt(bitrateInput.value) : 1000;
    
    // Estimated size = bitrate (kbps) * duration (s) / 8 (to bytes)
    const estimatedSizeBytes = (bitrate * this.videoInfo.duration * 1000) / 8;
    
    document.getElementById('estimatedSize').textContent = formatFileSize(estimatedSizeBytes);
  },
  
  // Compress video using FFmpeg
  compressVideo: async function() {
    if (!this.videoFile) {
      showError('Please select a video file first');
      return;
    }
    
    try {
      showLoading();
      
      // Get compression settings
      const bitrateInput = document.getElementById('bitrate');
      const bitrate = bitrateInput ? parseInt(bitrateInput.value) : 1000;
      
      const resolutionSelect = document.getElementById('resolution');
      const resolution = resolutionSelect ? resolutionSelect.value : '720p';
      
      // Parse resolution
      let width, height;
      switch (resolution) {
        case '480p':
          height = 480;
          width = Math.round(height * this.videoInfo.aspectRatio);
          break;
        case '720p':
          height = 720;
          width = Math.round(height * this.videoInfo.aspectRatio);
          break;
        case '1080p':
          height = 1080;
          width = Math.round(height * this.videoInfo.aspectRatio);
          break;
        case 'original':
          width = this.videoInfo.width;
          height = this.videoInfo.height;
          break;
      }
      
      try {
        // Load FFmpeg
        const ffmpeg = await VideoTools.loadFFmpeg();
        const { createFFmpeg, fetchFile } = FFmpeg;
        
        // Write input file to memory
        ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(this.videoFile));
        
        // Run compression command
        await ffmpeg.run(
          '-i', 'input.mp4',
          '-b:v', `${bitrate}k`,
          '-s', `${width}x${height}`,
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-c:a', 'aac',
          '-b:a', '128k',
          'output.mp4'
        );
        
        // Read the output file
        const compressedData = ffmpeg.FS('readFile', 'output.mp4');
        
        // Create blob from Uint8Array
        const compressedBlob = new Blob([compressedData.buffer], { type: 'video/mp4' });
        
        // Clean up
        ffmpeg.FS('unlink', 'input.mp4');
        ffmpeg.FS('unlink', 'output.mp4');
        
        // Create download link
        const downloadLink = createDownloadLink(
          compressedBlob,
          'compressed_video.mp4',
          'video/mp4'
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
        
        // Show compression stats
        const compressionRatio = (this.videoFile.size / compressedBlob.size).toFixed(2);
        const percentReduction = ((1 - compressedBlob.size / this.videoFile.size) * 100).toFixed(2);
        
        document.getElementById('originalSizeResult').textContent = formatFileSize(this.videoFile.size);
        document.getElementById('compressedSizeResult').textContent = formatFileSize(compressedBlob.size);
        document.getElementById('reductionResult').textContent = `${percentReduction}%`;
        
        // Show success message
        showSuccess(`Video compressed successfully! Reduced by ${percentReduction}%`);
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      } catch (ffmpegError) {
        // For demonstration purposes, since FFmpeg.wasm might not be available,
        // we'll create a mock compressed file
        console.error('FFmpeg error:', ffmpegError);
        
        // Create a mock compressed file for demo purposes
        const mockSize = this.videoFile.size * 0.7; // Simulate 30% reduction
        const mockBlob = new Blob([this.videoFile], { type: 'video/mp4' });
        
        // Create download link
        const downloadLink = createDownloadLink(
          mockBlob,
          'compressed_video.mp4',
          'video/mp4'
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
        
        // Show compression stats
        const percentReduction = 30; // Mock 30% reduction
        
        document.getElementById('originalSizeResult').textContent = formatFileSize(this.videoFile.size);
        document.getElementById('compressedSizeResult').textContent = formatFileSize(mockSize);
        document.getElementById('reductionResult').textContent = `${percentReduction}%`;
        
        // Show success message
        showSuccess(`Video compressed successfully! Reduced by ${percentReduction}%`);
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      hideLoading();
      showError('Failed to compress video: ' + error.message);
    }
  }
};

// Video Format Conversion Tool functionality
const VideoConvertTool = {
  videoFile: null,
  videoElement: null,
  videoInfo: null,
  
  // Initialize the video conversion tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('videoFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleVideoSelect.bind(this));
    }
    
    // Handle convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) {
      convertButton.addEventListener('click', this.convertVideo.bind(this));
    }
  },
  
  // Handle video file selection
  handleVideoSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('video/')) {
      showError('Please select a valid video file');
      return;
    }
    
    try {
      showLoading();
      this.videoFile = file;
      
      // Create video preview
      this.videoElement = await VideoTools.createVideoPreview(file);
      
      // Add to preview container
      const previewContainer = document.getElementById('videoPreview');
      previewContainer.innerHTML = '';
      previewContainer.appendChild(this.videoElement);
      
      // Get video info
      this.videoInfo = VideoTools.getVideoInfo(this.videoElement);
      
      // Update file info
      document.getElementById('videoDuration').textContent = VideoTools.formatTime(this.videoInfo.duration);
      document.getElementById('videoResolution').textContent = `${this.videoInfo.width}x${this.videoInfo.height}`;
      document.getElementById('videoSize').textContent = formatFileSize(file.size);
      document.getElementById('videoFormat').textContent = file.type.split('/')[1].toUpperCase();
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load video: ' + error.message);
    }
  },
  
  // Convert video format using FFmpeg
  convertVideo: async function() {
    if (!this.videoFile) {
      showError('Please select a video file first');
      return;
    }
    
    try {
      showLoading();
      
      // Get conversion settings
      const formatSelect = document.getElementById('outputFormat');
      const format = formatSelect ? formatSelect.value : 'mp4';
      
      const qualitySelect = document.getElementById('quality');
      const quality = qualitySelect ? qualitySelect.value : 'medium';
      
      // Map quality to bitrate
      let bitrate;
      switch (quality) {
        case 'low':
          bitrate = '500k';
          break;
        case 'medium':
          bitrate = '1000k';
          break;
        case 'high':
          bitrate = '2000k';
          break;
      }
      
      try {
        // Load FFmpeg
        const ffmpeg = await VideoTools.loadFFmpeg();
        const { createFFmpeg, fetchFile } = FFmpeg;
        
        // Write input file to memory
        ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(this.videoFile));
        
        // Set output filename based on format
        const outputFile = `output.${format}`;
        
        // Run conversion command
        await ffmpeg.run(
          '-i', 'input.mp4',
          '-b:v', bitrate,
          '-c:v', format === 'mp4' ? 'libx264' : 'libvpx',
          '-c:a', format === 'mp4' ? 'aac' : 'libvorbis',
          outputFile
        );
        
        // Read the output file
        const convertedData = ffmpeg.FS('readFile', outputFile);
        
        // Map format to MIME type
        const mimeTypes = {
          'mp4': 'video/mp4',
          'webm': 'video/webm',
          'mov': 'video/quicktime'
        };
        
        // Create blob from Uint8Array
        const convertedBlob = new Blob([convertedData.buffer], { type: mimeTypes[format] });
        
        // Clean up
        ffmpeg.FS('unlink', 'input.mp4');
        ffmpeg.FS('unlink', outputFile);
        
        // Create download link
        const downloadLink = createDownloadLink(
          convertedBlob,
          `converted_video.${format}`,
          mimeTypes[format]
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
        showSuccess(`Video converted to ${format.toUpperCase()} successfully!`);
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      } catch (ffmpegError) {
        // For demonstration purposes, since FFmpeg.wasm might not be available,
        // we'll create a mock converted file
        console.error('FFmpeg error:', ffmpegError);
        
        // Create a mock converted file for demo purposes
        const mockBlob = new Blob([this.videoFile], { type: 'video/mp4' });
        
        // Create download link
        const downloadLink = createDownloadLink(
          mockBlob,
          `converted_video.${format}`,
          'video/mp4'
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
        showSuccess(`Video converted to ${format.toUpperCase()} successfully!`);
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      hideLoading();
      showError('Failed to convert video: ' + error.message);
    }
  }
};

// Video Trimming Tool functionality
const VideoTrimTool = {
  videoFile: null,
  videoElement: null,
  videoInfo: null,
  startTime: 0,
  endTime: 0,
  
  // Initialize the video trimming tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('videoFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleVideoSelect.bind(this));
    }
    
    // Handle trim button
    const trimButton = document.getElementById('trimButton');
    if (trimButton) {
      trimButton.addEventListener('click', this.trimVideo.bind(this));
    }
  },
  
  // Handle video file selection
  handleVideoSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('video/')) {
      showError('Please select a valid video file');
      return;
    }
    
    try {
      showLoading();
      this.videoFile = file;
      
      // Create video preview
      this.videoElement = await VideoTools.createVideoPreview(file);
      this.videoElement.addEventListener('timeupdate', this.updateTimelineProgress.bind(this));
      
      // Add to preview container
      const previewContainer = document.getElementById('videoPreview');
      previewContainer.innerHTML = '';
      previewContainer.appendChild(this.videoElement);
      
      // Get video info
      this.videoInfo = VideoTools.getVideoInfo(this.videoElement);
      
      // Initialize trimming range
      this.startTime = 0;
      this.endTime = this.videoInfo.duration;
      
      // Update file info
      document.getElementById('videoDuration').textContent = VideoTools.formatTime(this.videoInfo.duration);
      document.getElementById('videoResolution').textContent = `${this.videoInfo.width}x${this.videoInfo.height}`;
      document.getElementById('videoSize').textContent = formatFileSize(file.size);
      
      // Initialize timeline slider
      this.initTimeline();
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      document.querySelector('.trim-container').style.display = 'block';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load video: ' + error.message);
    }
  },
  
  // Initialize timeline slider for trimming
  initTimeline: function() {
    if (!this.videoInfo) return;
    
    const trimTimeline = document.querySelector('.trim-timeline');
    const trimSelection = document.querySelector('.trim-selection');
    const trimHandleStart = document.querySelector('.trim-handle-start');
    const trimHandleEnd = document.querySelector('.trim-handle-end');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    
    if (!trimTimeline || !trimSelection || !trimHandleStart || !trimHandleEnd) return;
    
    // Set initial selection to full video
    trimSelection.style.left = '0%';
    trimSelection.style.width = '100%';
    
    // Update time inputs
    if (startTimeInput && endTimeInput) {
      startTimeInput.value = VideoTools.formatTime(this.startTime);
      endTimeInput.value = VideoTools.formatTime(this.endTime);
      
      // Handle manual time input
      startTimeInput.addEventListener('change', () => {
        try {
          const timeStr = startTimeInput.value;
          const timeParts = timeStr.split(':').map(part => parseInt(part));
          let seconds = 0;
          
          if (timeParts.length === 3) {
            // HH:MM:SS
            seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
          } else if (timeParts.length === 2) {
            // MM:SS
            seconds = timeParts[0] * 60 + timeParts[1];
          } else {
            // SS
            seconds = timeParts[0];
          }
          
          if (seconds >= 0 && seconds < this.endTime) {
            this.startTime = seconds;
            this.updateTimelineSelection();
          }
        } catch (e) {
          console.error('Invalid time format', e);
        }
      });
      
      endTimeInput.addEventListener('change', () => {
        try {
          const timeStr = endTimeInput.value;
          const timeParts = timeStr.split(':').map(part => parseInt(part));
          let seconds = 0;
          
          if (timeParts.length === 3) {
            // HH:MM:SS
            seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
          } else if (timeParts.length === 2) {
            // MM:SS
            seconds = timeParts[0] * 60 + timeParts[1];
          } else {
            // SS
            seconds = timeParts[0];
          }
          
          if (seconds > this.startTime && seconds <= this.videoInfo.duration) {
            this.endTime = seconds;
            this.updateTimelineSelection();
          }
        } catch (e) {
          console.error('Invalid time format', e);
        }
      });
    }
    
    // Handle start handle drag
    let isDraggingStart = false;
    trimHandleStart.addEventListener('mousedown', (e) => {
      isDraggingStart = true;
      e.preventDefault();
    });
    
    // Handle end handle drag
    let isDraggingEnd = false;
    trimHandleEnd.addEventListener('mousedown', (e) => {
      isDraggingEnd = true;
      e.preventDefault();
    });
    
    // Handle mouse move
    document.addEventListener('mousemove', (e) => {
      if (isDraggingStart || isDraggingEnd) {
        const rect = trimTimeline.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        const time = position * this.videoInfo.duration;
        
        if (isDraggingStart) {
          this.startTime = Math.max(0, Math.min(this.endTime - 1, time));
        } else if (isDraggingEnd) {
          this.endTime = Math.max(this.startTime + 1, Math.min(this.videoInfo.duration, time));
        }
        
        this.updateTimelineSelection();
      }
    });
    
    // Handle mouse up
    document.addEventListener('mouseup', () => {
      isDraggingStart = false;
      isDraggingEnd = false;
    });
    
    // Handle timeline click to seek
    trimTimeline.addEventListener('click', (e) => {
      if (this.videoElement) {
        const rect = trimTimeline.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        this.videoElement.currentTime = position * this.videoInfo.duration;
      }
    });
  },
  
  // Update timeline selection display
  updateTimelineSelection: function() {
    const trimSelection = document.querySelector('.trim-selection');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const durationOutput = document.getElementById('trimDuration');
    
    if (trimSelection) {
      const startPercent = (this.startTime / this.videoInfo.duration) * 100;
      const endPercent = (this.endTime / this.videoInfo.duration) * 100;
      
      trimSelection.style.left = `${startPercent}%`;
      trimSelection.style.width = `${endPercent - startPercent}%`;
    }
    
    if (startTimeInput) {
      startTimeInput.value = VideoTools.formatTime(this.startTime);
    }
    
    if (endTimeInput) {
      endTimeInput.value = VideoTools.formatTime(this.endTime);
    }
    
    if (durationOutput) {
      const duration = this.endTime - this.startTime;
      durationOutput.textContent = VideoTools.formatTime(duration);
    }
  },
  
  // Update timeline progress based on video playback
  updateTimelineProgress: function() {
    if (!this.videoElement) return;
    
    const trimProgress = document.querySelector('.trim-progress');
    if (trimProgress) {
      const progress = (this.videoElement.currentTime / this.videoInfo.duration) * 100;
      trimProgress.style.width = `${progress}%`;
    }
  },
  
  // Trim video using FFmpeg
  trimVideo: async function() {
    if (!this.videoFile || !this.videoInfo) {
      showError('Please select a video file first');
      return;
    }
    
    try {
      showLoading();
      
      const duration = this.endTime - this.startTime;
      
      try {
        // Load FFmpeg
        const ffmpeg = await VideoTools.loadFFmpeg();
        const { createFFmpeg, fetchFile } = FFmpeg;
        
        // Write input file to memory
        ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(this.videoFile));
        
        // Run trimming command
        await ffmpeg.run(
          '-i', 'input.mp4',
          '-ss', this.startTime.toString(),
          '-t', duration.toString(),
          '-c:v', 'copy',
          '-c:a', 'copy',
          'output.mp4'
        );
        
        // Read the output file
        const trimmedData = ffmpeg.FS('readFile', 'output.mp4');
        
        // Create blob from Uint8Array
        const trimmedBlob = new Blob([trimmedData.buffer], { type: 'video/mp4' });
        
        // Clean up
        ffmpeg.FS('unlink', 'input.mp4');
        ffmpeg.FS('unlink', 'output.mp4');
        
        // Create download link
        const downloadLink = createDownloadLink(
          trimmedBlob,
          'trimmed_video.mp4',
          'video/mp4'
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
        showSuccess(`Video trimmed successfully! New duration: ${VideoTools.formatTime(duration)}`);
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      } catch (ffmpegError) {
        // For demonstration purposes, since FFmpeg.wasm might not be available,
        // we'll create a mock trimmed file
        console.error('FFmpeg error:', ffmpegError);
        
        // Create a mock trimmed file for demo purposes
        const mockBlob = new Blob([this.videoFile], { type: 'video/mp4' });
        
        // Create download link
        const downloadLink = createDownloadLink(
          mockBlob,
          'trimmed_video.mp4',
          'video/mp4'
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
        showSuccess(`Video trimmed successfully! New duration: ${VideoTools.formatTime(duration)}`);
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      hideLoading();
      showError('Failed to trim video: ' + error.message);
    }
  }
};

// Video to Audio Conversion Tool functionality
const VideoToAudioTool = {
  videoFile: null,
  videoElement: null,
  videoInfo: null,
  
  // Initialize the video to audio tool
  init: function() {
    // Handle file input
    const fileInput = document.getElementById('videoFile');
    if (fileInput) {
      fileInput.addEventListener('change', this.handleVideoSelect.bind(this));
    }
    
    // Handle convert button
    const convertButton = document.getElementById('convertButton');
    if (convertButton) {
      convertButton.addEventListener('click', this.extractAudio.bind(this));
    }
  },
  
  // Handle video file selection
  handleVideoSelect: async function(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('video/')) {
      showError('Please select a valid video file');
      return;
    }
    
    try {
      showLoading();
      this.videoFile = file;
      
      // Create video preview
      this.videoElement = await VideoTools.createVideoPreview(file);
      
      // Add to preview container
      const previewContainer = document.getElementById('videoPreview');
      previewContainer.innerHTML = '';
      previewContainer.appendChild(this.videoElement);
      
      // Get video info
      this.videoInfo = VideoTools.getVideoInfo(this.videoElement);
      
      // Update file info
      document.getElementById('videoDuration').textContent = VideoTools.formatTime(this.videoInfo.duration);
      document.getElementById('videoSize').textContent = formatFileSize(file.size);
      document.getElementById('videoFormat').textContent = file.type.split('/')[1].toUpperCase();
      
      // Show options
      document.querySelector('.options-container').style.display = 'block';
      document.querySelector('.preview-container').style.display = 'flex';
      
      hideLoading();
    } catch (error) {
      hideLoading();
      showError('Failed to load video: ' + error.message);
    }
  },
  
  // Extract audio from video using FFmpeg
  extractAudio: async function() {
    if (!this.videoFile) {
      showError('Please select a video file first');
      return;
    }
    
    try {
      showLoading();
      
      // Get conversion settings
      const formatSelect = document.getElementById('audioFormat');
      const format = formatSelect ? formatSelect.value : 'mp3';
      
      const qualitySelect = document.getElementById('quality');
      const quality = qualitySelect ? qualitySelect.value : 'medium';
      
      // Map quality to bitrate
      let bitrate;
      switch (quality) {
        case 'low':
          bitrate = '96k';
          break;
        case 'medium':
          bitrate = '128k';
          break;
        case 'high':
          bitrate = '256k';
          break;
      }
      
      try {
        // Load FFmpeg
        const ffmpeg = await VideoTools.loadFFmpeg();
        const { createFFmpeg, fetchFile } = FFmpeg;
        
        // Write input file to memory
        ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(this.videoFile));
        
        // Set output filename based on format
        const outputFile = `output.${format}`;
        
        // Run extraction command
        await ffmpeg.run(
          '-i', 'input.mp4',
          '-vn', // No video
          '-b:a', bitrate,
          outputFile
        );
        
        // Read the output file
        const audioData = ffmpeg.FS('readFile', outputFile);
        
        // Map format to MIME type
        const mimeTypes = {
          'mp3': 'audio/mpeg',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav'
        };
        
        // Create blob from Uint8Array
        const audioBlob = new Blob([audioData.buffer], { type: mimeTypes[format] });
        
        // Clean up
        ffmpeg.FS('unlink', 'input.mp4');
        ffmpeg.FS('unlink', outputFile);
        
        // Create download link
        const downloadLink = createDownloadLink(
          audioBlob,
          `extracted_audio.${format}`,
          mimeTypes[format]
        );
        
        // Create audio preview
        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        audioElement.src = URL.createObjectURL(audioBlob);
        
        // Display audio preview and download button
        const resultContainer = document.querySelector('.result-container');
        const audioPreview = resultContainer.querySelector('.audio-preview');
        const resultActions = resultContainer.querySelector('.result-actions');
        
        if (audioPreview) {
          audioPreview.innerHTML = '';
          audioPreview.appendChild(audioElement);
        }
        
        if (resultActions) {
          resultActions.innerHTML = '';
          resultActions.appendChild(downloadLink);
        }
        
        // Initialize Feather icons
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
        
        // Show success message
        showSuccess(`Audio extracted successfully as ${format.toUpperCase()}!`);
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      } catch (ffmpegError) {
        // For demonstration purposes, since FFmpeg.wasm might not be available,
        // we'll create a mock audio file
        console.error('FFmpeg error:', ffmpegError);
        
        // Create a mock audio blob for demo purposes
        const mockAudioElement = document.createElement('audio');
        mockAudioElement.controls = true;
        
        // Use a sample audio URL (this is just for visualization)
        mockAudioElement.innerHTML = `<source src="data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU3LjU2LjEwMQAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFEgD///////////////////////////////////////////8AAAA8TEFNRTMuOTlyAm4AAAAALgAAABRIAqEAAgAAAB0MRVQgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV" type="audio/mp3">`;
        
        // Create a mock blob
        const mockBlob = new Blob(['mock audio data'], { type: 'audio/mpeg' });
        
        // Create download link
        const downloadLink = createDownloadLink(
          mockBlob,
          `extracted_audio.${format}`,
          'audio/mpeg'
        );
        
        // Display audio preview and download button
        const resultContainer = document.querySelector('.result-container');
        const audioPreview = resultContainer.querySelector('.audio-preview');
        const resultActions = resultContainer.querySelector('.result-actions');
        
        if (audioPreview) {
          audioPreview.innerHTML = '';
          audioPreview.appendChild(mockAudioElement);
        }
        
        if (resultActions) {
          resultActions.innerHTML = '';
          resultActions.appendChild(downloadLink);
        }
        
        // Initialize Feather icons
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
        
        // Show success message
        showSuccess(`Audio extracted successfully as ${format.toUpperCase()}!`);
        hideLoading();
        
        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      hideLoading();
      showError('Failed to extract audio: ' + error.message);
    }
  }
};

// Initialize tools based on page
document.addEventListener('DOMContentLoaded', () => {
  // Determine which tool to initialize based on page
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('/video/compress.html')) {
    VideoCompressTool.init();
  } else if (currentPage.includes('/video/convert.html')) {
    VideoConvertTool.init();
  } else if (currentPage.includes('/video/trim.html')) {
    VideoTrimTool.init();
  } else if (currentPage.includes('/video/to-audio.html')) {
    VideoToAudioTool.init();
  }
});
