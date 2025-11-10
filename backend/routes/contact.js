const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { body, param, validationResult } = require('express-validator');

const { authenticateToken, requireRole, contactLimiter, handleValidationErrors, validators } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/security');
const emailService = require('../config/email');

const router = express.Router();
const db = new sqlite3.Database(path.join(__dirname, '..', 'db.sqlite'));

// Apply input sanitization to all routes
router.use(sanitizeInput);

/**
 * POST /api/contact
 * Submit contact form
 */
router.post('/',
  contactLimiter,
  validators.contactCreate,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        subject,
        message,
        serviceInterest,
        preferredDate
      } = req.body;

      // Insert message into database
      const query = `
        INSERT INTO messages (
          name, email, phone, subject, message, source, read, created_at
        ) VALUES (?, ?, ?, ?, ?, 'contact', 0, CURRENT_TIMESTAMP)
      `;

      db.run(
        query,
        [name, email, phone, subject, message],
        async function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to save message'
            });
          }

          try {
            // Send email notification
            await emailService.sendContactForm({
              name,
              email,
              phone,
              subject,
              message,
              serviceInterest,
              preferredDate,
              messageId: this.lastID
            });

            res.status(201).json({
              success: true,
              message: 'Message sent successfully! We\'ll get back to you soon.',
              data: {
                messageId: this.lastID
              }
            });
          } catch (emailError) {
            console.error('Email sending error:', emailError);

            // Still consider it successful since message was saved
            res.status(201).json({
              success: true,
              message: 'Message received successfully! We\'ll get back to you soon.',
              data: {
                messageId: this.lastID,
                note: 'Email notification failed, but message was saved'
              }
            });
          }
        }
      );
    } catch (error) {
      console.error('Contact form submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/messages
 * Get all messages (admin only)
 */
router.get('/admin/messages',
  authenticateToken,
  requireRole('admin'),
  [
    query('read').optional().isBoolean().withMessage('Read filter must be boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const {
        read,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT
          id, name, email, phone, subject, message, source,
          read, created_at
        FROM messages
        WHERE 1=1
      `;

      const params = [];

      // Add read filter
      if (read !== undefined) {
        query += ` AND read = ?`;
        params.push(read === 'true' ? 1 : 0);
      }

      // Add ordering
      query += ` ORDER BY created_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      db.all(query, params, (err, messages) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM messages WHERE 1=1';
        const countParams = [];

        if (read !== undefined) {
          countQuery += ` AND read = ?`;
          countParams.push(read === 'true' ? 1 : 0);
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
              messages,
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
      console.error('Messages fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/messages/:id
 * Get single message (admin only)
 */
router.get('/admin/messages/:id',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    const { id } = req.params;

    const query = `
      SELECT
        id, name, email, phone, subject, message, source,
        read, created_at
      FROM messages
      WHERE id = ?
    `;

    db.get(query, [id], (err, message) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      res.json({
        success: true,
        data: {
          message
        }
      });
    });
  }
);

/**
 * PUT /api/admin/messages/:id/read
 * Mark message as read (admin only)
 */
router.put('/admin/messages/:id/read',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      db.run(
        'UPDATE messages SET read = 1 WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to mark message as read'
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              success: false,
              message: 'Message not found'
            });
          }

          res.json({
            success: true,
            message: 'Message marked as read'
          });
        }
      );
    } catch (error) {
      console.error('Mark message as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/admin/messages/:id/unread
 * Mark message as unread (admin only)
 */
router.put('/admin/messages/:id/unread',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      db.run(
        'UPDATE messages SET read = 0 WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to mark message as unread'
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              success: false,
              message: 'Message not found'
            });
          }

          res.json({
            success: true,
            message: 'Message marked as unread'
          });
        }
      );
    } catch (error) {
      console.error('Mark message as unread error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/admin/messages/:id
 * Delete message (admin only)
 */
router.delete('/admin/messages/:id',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      // Check if message exists
      db.get(
        'SELECT id FROM messages WHERE id = ?',
        [id],
        (err, message) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!message) {
            return res.status(404).json({
              success: false,
              message: 'Message not found'
            });
          }

          // Delete message
          db.run(
            'DELETE FROM messages WHERE id = ?',
            [id],
            function(err) {
              if (err) {
                console.error('Message deletion error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to delete message'
                });
              }

              res.json({
                success: true,
                message: 'Message deleted successfully'
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Message deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/messages/stats
 * Get message statistics (admin only)
 */
router.get('/admin/messages/stats',
  authenticateToken,
  requireRole('admin'),
  (req, res) => {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN read = 0 THEN 1 END) as unread,
          COUNT(CASE WHEN read = 1 THEN 1 END) as read,
          COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as this_week,
          COUNT(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 END) as this_month
        FROM messages
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
              unread: stats.unread,
              read: stats.read,
              thisWeek: stats.this_week,
              thisMonth: stats.this_month
            }
          }
        });
      });
    } catch (error) {
      console.error('Message stats fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/messages/export
 * Export messages as CSV (admin only)
 */
router.get('/admin/messages/export',
  authenticateToken,
  requireRole('admin'),
  (req, res) => {
    try {
      const query = `
        SELECT
          id,
          name,
          email,
          phone,
          subject,
          message,
          source,
          CASE WHEN read = 1 THEN 'Read' ELSE 'Unread' END as status,
          created_at
        FROM messages
        ORDER BY created_at DESC
      `;

      db.all(query, [], (err, messages) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Convert to CSV
        const csvHeader = 'ID,Name,Email,Phone,Subject,Message,Source,Status,Created At\n';
        const csvData = messages.map(msg =>
          `${msg.id},"${msg.name.replace(/"/g, '""')}","${msg.email}","${msg.phone}","${msg.subject.replace(/"/g, '""')}","${msg.message.replace(/"/g, '""')}","${msg.source}","${msg.status}","${msg.created_at}"`
        ).join('\n');

        const csv = csvHeader + csvData;

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="messages_${new Date().toISOString().split('T')[0]}.csv"`);

        res.send(csv);
      });
    } catch (error) {
      console.error('Message export error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

module.exports = router;