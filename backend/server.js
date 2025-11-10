require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Security and utility middleware
const {
  securityHeaders,
  compressionMiddleware,
  logging,
  sanitizeInput,
  xssPrevention,
  errorHandler
} = require('./middleware/security');

// Rate limiting
const { generalLimiter } = require('./middleware/auth');

// Upload middleware
const { serveUploads } = require('./middleware/upload');

// Import routes
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const coursesRoutes = require('./routes/courses');
const contactRoutes = require('./routes/contact');
const bookingsRoutes = require('./routes/bookings');
const galleryRoutes = require('./routes/gallery');
const newsletterRoutes = require('./routes/newsletter');

const app = express();

// Trust proxy for rate limiting and security
app.set('trust proxy', 1);

// Security middleware (must be first)
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(xssPrevention);

// General rate limiting
app.use(generalLimiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://victorgraphics-kenya.com',
          'https://www.victorgraphics-kenya.com'
        ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
};

app.use(cors(corsOptions));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(logging);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Database setup
const dbPath = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database.');

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Enable WAL mode for better concurrency
    db.run('PRAGMA journal_mode = WAL');
  }
});

// Make database available to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '2.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Serve uploaded files
app.use('/uploads', serveUploads);

// Serve static frontend files (for production)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');

  app.use(express.static(frontendPath));

  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // In development, serve the old frontend for now
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');

  server.close(() => {
    console.log('HTTP server closed');

    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');

  server.close(() => {
    console.log('HTTP server closed');

    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
      process.exit(0);
    });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Server is running!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📅 Started at: ${new Date().toLocaleString()}
📝 Health check: http://localhost:${PORT}/api/health
  `);
});

// Export for testing
module.exports = app;