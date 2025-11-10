const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const ValidationUtils = require('../utils/validation');

const unlink = promisify(fs.unlink);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create subdirectories for better organization
    const subDir = req.body.category || 'general';
    const dirPath = path.join(uploadsDir, subDir);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    cb(null, dirPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10 // Max 10 files at once
  }
});

// Single file upload middleware
const uploadSingle = upload.single('file');

// Multiple files upload middleware
const uploadMultiple = upload.array('files', 10);

// Enhanced upload middleware with validation
const uploadMiddleware = (req, res, next) => {
  uploadSingle(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 10 files.'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Upload error: ' + err.message
      });
    } else if (err) {
      // An unknown error occurred when uploading.
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // Validate uploaded file
    if (req.file) {
      const validation = ValidationUtils.validateFileUpload(
        req.file,
        ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        5 * 1024 * 1024 // 5MB
      );

      if (!validation.isValid) {
        // Remove uploaded file if validation fails
        unlink(req.file.path).catch(() => {});

        return res.status(400).json({
          success: false,
          message: 'File validation failed',
          errors: validation.errors
        });
      }
    }

    next();
  });
};

// Multiple files upload middleware with validation
const uploadMultipleMiddleware = (req, res, next) => {
  uploadMultiple(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // Handle Multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'One or more files are too large. Maximum size is 5MB per file.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum is 10 files.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Upload error: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // Validate uploaded files
    if (req.files && req.files.length > 0) {
      const errors = [];
      const filesToRemove = [];

      req.files.forEach((file, index) => {
        const validation = ValidationUtils.validateFileUpload(
          file,
          ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
          5 * 1024 * 1024 // 5MB
        );

        if (!validation.isValid) {
          errors.push(`File ${index + 1}: ${validation.errors.join(', ')}`);
          filesToRemove.push(file.path);
        }
      });

      // Remove invalid files
      Promise.all(filesToRemove.map(filePath => unlink(filePath).catch(() => {})))
        .then(() => {
          if (errors.length > 0) {
            return res.status(400).json({
              success: false,
              message: 'File validation failed',
              errors: errors
            });
          }
          next();
        });
    } else {
      next();
    }
  });
};

// Delete file utility
const deleteFile = async (filePath) => {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    await unlink(fullPath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Get file info utility
const getFileInfo = (file) => {
  if (!file) return null;

  return {
    filename: file.filename,
    originalname: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    path: file.path,
    url: `/uploads/${path.relative(path.join(__dirname, '..', 'uploads'), file.path).replace(/\\/g, '/')}`
  };
};

// Serve static files middleware
const serveUploads = (req, res, next) => {
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  express.static(uploadsPath)(req, res, next);
};

module.exports = {
  uploadMiddleware,
  uploadMultipleMiddleware,
  deleteFile,
  getFileInfo,
  serveUploads
};