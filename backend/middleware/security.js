const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { body, param, query, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Security headers and middleware configuration
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.github.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Response compression
 */
const compressionMiddleware = compression();

/**
 * Request logging
 */
const logging = morgan('combined');

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Basic HTML sanitization
        req.body[key] = DOMPurify.sanitize(req.body[key].trim(), {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        });
      }
    }
  }

  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = DOMPurify.sanitize(req.query[key].trim(), {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        });
      }
    }
  }

  next();
};

/**
 * XSS Prevention middleware
 */
const xssPrevention = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Common validation chains
 */
const validators = {
  // User validations
  userLogin: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 1 })
      .withMessage('Password is required')
  ],

  userRegistration: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('role')
      .optional()
      .isIn(['admin', 'staff'])
      .withMessage('Role must be either admin or staff')
  ],

  // Service validations
  serviceCreate: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title is required and must be less than 200 characters'),
    body('slug')
      .trim()
      .isLength({ min: 1, max: 200 })
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('price_ksh')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Price must be a positive integer'),
    body('featured')
      .optional()
      .isBoolean()
      .withMessage('Featured must be a boolean'),
    body('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean')
  ],

  // Course validations
  courseCreate: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title is required and must be less than 200 characters'),
    body('duration')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Duration is required'),
    body('fee_ksh')
      .isInt({ min: 0 })
      .withMessage('Fee must be a positive integer'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('level')
      .optional()
      .isIn(['basic', 'advanced', 'professional'])
      .withMessage('Level must be basic, advanced, or professional'),
    body('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean')
  ],

  // Booking validations
  bookingCreate: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .trim()
      .matches(/^(?:\+254|0)?[17]\d{8}$/)
      .withMessage('Valid Kenyan phone number is required'),
    body('service_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Service ID must be a positive integer'),
    body('course_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Course ID must be a positive integer'),
    body('preferred_date')
      .optional()
      .isISO8601()
      .withMessage('Preferred date must be a valid date'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Message must be less than 1000 characters')
  ],

  // Contact form validations
  contactCreate: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('phone')
      .optional()
      .trim()
      .matches(/^(?:\+254|0)?[17]\d{8}$/)
      .withMessage('Valid Kenyan phone number is required'),
    body('subject')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Subject is required and must be less than 200 characters'),
    body('message')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Message must be between 10 and 2000 characters')
  ],

  // Newsletter validations
  newsletterSubscribe: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],

  // ID parameter validations
  idParam: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('ID must be a positive integer')
  ],

  // Search query validations
  searchQuery: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('category')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be less than 100 characters'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(403).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Handle database errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
};

module.exports = {
  securityHeaders,
  compressionMiddleware,
  logging,
  sanitizeInput,
  xssPrevention,
  handleValidationErrors,
  validators,
  errorHandler
};