const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { body, param, query, validationResult } = require('express-validator');

const { authenticateToken, requireRole, contactLimiter, handleValidationErrors, validators } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/security');
const emailService = require('../config/email');

const router = express.Router();
const db = new sqlite3.Database(path.join(__dirname, '..', 'db.sqlite'));

// Apply input sanitization to all routes
router.use(sanitizeInput);

/**
 * POST /api/bookings
 * Create new booking
 */
router.post('/',
  contactLimiter,
  validators.bookingCreate,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        service_id,
        course_id,
        preferred_date,
        message
      } = req.body;

      // Validate that at least service_id or course_id is provided
      if (!service_id && !course_id) {
        return res.status(400).json({
          success: false,
          message: 'Either service_id or course_id must be provided'
        });
      }

      // Get service or course details
      let itemDetails = null;
      if (service_id) {
        db.get('SELECT title FROM services WHERE id = ? AND active = 1', [service_id], (err, service) => {
          if (err) {
            console.error('Service fetch error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!service) {
            return res.status(400).json({
              success: false,
              message: 'Service not found or inactive'
            });
          }

          itemDetails = { type: 'service', name: service.title };
          createBooking(itemDetails);
        });
      } else if (course_id) {
        db.get('SELECT title FROM courses WHERE id = ? AND active = 1', [course_id], (err, course) => {
          if (err) {
            console.error('Course fetch error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!course) {
            return res.status(400).json({
              success: false,
              message: 'Course not found or inactive'
            });
          }

          itemDetails = { type: 'course', name: course.title };
          createBooking(itemDetails);
        });
      }

      function createBooking(itemDetails) {
        // Insert booking into database
        const query = `
          INSERT INTO bookings (
            name, email, phone, service_id, course_id, preferred_date, message, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        `;

        db.run(
          query,
          [name, email, phone, service_id, course_id, preferred_date, message],
          async function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                message: 'Failed to create booking'
              });
            }

            try {
              // Send booking confirmation email
              await emailService.sendBookingConfirmation({
                name,
                email,
                phone,
                serviceName: itemDetails.type === 'service' ? itemDetails.name : null,
                courseName: itemDetails.type === 'course' ? itemDetails.name : null,
                preferredDate: preferred_date,
                message,
                bookingId: this.lastID
              });

              res.status(201).json({
                success: true,
                message: 'Booking created successfully! We\'ll contact you soon to confirm.',
                data: {
                  bookingId: this.lastID,
                  item: itemDetails
                }
              });
            } catch (emailError) {
              console.error('Email sending error:', emailError);

              // Still consider it successful since booking was saved
              res.status(201).json({
                success: true,
                message: 'Booking received successfully! We\'ll contact you soon to confirm.',
                data: {
                  bookingId: this.lastID,
                  item: itemDetails,
                  note: 'Email notification failed, but booking was saved'
                }
              });
            }
          }
        );
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/bookings
 * Get all bookings (admin only)
 */
router.get('/admin/bookings',
  authenticateToken,
  requireRole('admin'),
  [
    query('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const {
        status,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT
          b.id, b.name, b.email, b.phone, b.preferred_date,
          b.message, b.status, b.created_at,
          s.title as service_name,
          c.title as course_name
        FROM bookings b
        LEFT JOIN services s ON b.service_id = s.id
        LEFT JOIN courses c ON b.course_id = c.id
        WHERE 1=1
      `;

      const params = [];

      // Add status filter
      if (status) {
        query += ` AND b.status = ?`;
        params.push(status);
      }

      // Add ordering
      query += ` ORDER BY b.created_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      db.all(query, params, (err, bookings) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Get total count for pagination
        let countQuery = `
          SELECT COUNT(*) as total
          FROM bookings b
          WHERE 1=1
        `;
        const countParams = [];

        if (status) {
          countQuery += ` AND b.status = ?`;
          countParams.push(status);
        }

        db.get(countQuery, countParams, (err, countResult) => {
          if (err) {
            console.error('Count query error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          res.json({
            success: true,
            data: {
              bookings,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult.total,
                pages: Math.ceil(countResult.total / parseInt(limit))
              }
            }
          });
        });
      });
    } catch (error) {
      console.error('Bookings fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/bookings/:id
 * Get single booking (admin only)
 */
router.get('/admin/bookings/:id',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    const { id } = req.params;

    const query = `
      SELECT
        b.id, b.name, b.email, b.phone, b.preferred_date,
        b.message, b.status, b.created_at,
        s.title as service_name,
        c.title as course_name,
        s.description as service_description,
        c.description as course_description
      FROM bookings b
      LEFT JOIN services s ON b.service_id = s.id
      LEFT JOIN courses c ON b.course_id = c.id
      WHERE b.id = ?
    `;

    db.get(query, [id], (err, booking) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      res.json({
        success: true,
        data: {
          booking
        }
      });
    });
  }
);

/**
 * PUT /api/admin/bookings/:id/status
 * Update booking status (admin only)
 */
router.put('/admin/bookings/:id/status',
  authenticateToken,
  requireRole('admin'),
  [
    validators.idParam,
    body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid status')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      db.run(
        'UPDATE bookings SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to update booking status'
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              success: false,
              message: 'Booking not found'
            });
          }

          res.json({
            success: true,
            message: `Booking status updated to ${status}`
          });
        }
      );
    } catch (error) {
      console.error('Booking status update error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/admin/bookings/:id
 * Delete booking (admin only)
 */
router.delete('/admin/bookings/:id',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      // Check if booking exists
      db.get(
        'SELECT id FROM bookings WHERE id = ?',
        [id],
        (err, booking) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!booking) {
            return res.status(404).json({
              success: false,
              message: 'Booking not found'
            });
          }

          // Delete booking
          db.run(
            'DELETE FROM bookings WHERE id = ?',
            [id],
            function(err) {
              if (err) {
                console.error('Booking deletion error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to delete booking'
                });
              }

              res.json({
                success: true,
                message: 'Booking deleted successfully'
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Booking deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/bookings/stats
 * Get booking statistics (admin only)
 */
router.get('/admin/bookings/stats',
  authenticateToken,
  requireRole('admin'),
  (req, res) => {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as this_week,
          COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as this_month
        FROM bookings
      `;

      db.get(query, [], (err, stats) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        res.json({
          success: true,
          data: {
            stats: {
              total: stats.total,
              pending: stats.pending,
              confirmed: stats.confirmed,
              completed: stats.completed,
              cancelled: stats.cancelled,
              thisWeek: stats.this_week,
              thisMonth: stats.this_month
            }
          }
        });
      });
    } catch (error) {
      console.error('Booking stats fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/bookings/export
 * Export bookings as CSV (admin only)
 */
router.get('/admin/bookings/export',
  authenticateToken,
  requireRole('admin'),
  (req, res) => {
    try {
      const query = `
        SELECT
          b.id,
          b.name,
          b.email,
          b.phone,
          COALESCE(s.title, c.title) as item_name,
          CASE WHEN s.id IS NOT NULL THEN 'Service' WHEN c.id IS NOT NULL THEN 'Course' END as item_type,
          b.preferred_date,
          b.message,
          b.status,
          b.created_at
        FROM bookings b
        LEFT JOIN services s ON b.service_id = s.id
        LEFT JOIN courses c ON b.course_id = c.id
        ORDER BY b.created_at DESC
      `;

      db.all(query, [], (err, bookings) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Convert to CSV
        const csvHeader = 'ID,Name,Email,Phone,Item Name,Item Type,Preferred Date,Message,Status,Created At\n';
        const csvData = bookings.map(booking =>
          `${booking.id},"${booking.name.replace(/"/g, '""')}","${booking.email}","${booking.phone}","${booking.item_name.replace(/"/g, '""')}","${booking.item_type}","${booking.preferred_date}","${booking.message.replace(/"/g, '""')}","${booking.status}","${booking.created_at}"`
        ).join('\n');

        const csv = csvHeader + csvData;

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="bookings_${new Date().toISOString().split('T')[0]}.csv"`);

        res.send(csv);
      });
    } catch (error) {
      console.error('Booking export error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

module.exports = router;