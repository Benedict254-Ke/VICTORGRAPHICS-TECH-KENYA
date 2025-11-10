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
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter
 */
router.post('/subscribe',
  contactLimiter,
  validators.newsletterSubscribe,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Check if email already exists
      db.get(
        'SELECT id, active FROM newsletter WHERE email = ?',
        [email],
        async (err, existingSubscriber) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (existingSubscriber) {
            if (existingSubscriber.active) {
              return res.status(409).json({
                success: false,
                message: 'Email already subscribed to newsletter'
              });
            } else {
              // Reactivate subscription
              db.run(
                'UPDATE newsletter SET active = 1, subscribed_at = CURRENT_TIMESTAMP WHERE email = ?',
                [email],
                async (err) => {
                  if (err) {
                    console.error('Reactivation error:', err);
                    return res.status(500).json({
                      success: false,
                      message: 'Failed to reactivate subscription'
                    });
                  }

                  try {
                    await emailService.sendNewsletterWelcome(email);
                  } catch (emailError) {
                    console.error('Welcome email error:', emailError);
                  }

                  res.json({
                    success: true,
                    message: 'Welcome back! You have been re-subscribed to our newsletter.'
                  });
                }
              );
            }
          } else {
            // New subscription
            const query = `
              INSERT INTO newsletter (email, active, subscribed_at)
              VALUES (?, 1, CURRENT_TIMESTAMP)
            `;

            db.run(query, [email], async function(err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to subscribe to newsletter'
                });
              }

              try {
                // Send welcome email
                await emailService.sendNewsletterWelcome(email);
              } catch (emailError) {
                console.error('Welcome email error:', emailError);
                // Continue even if email fails
              }

              res.status(201).json({
                success: true,
                message: 'Successfully subscribed to our newsletter!',
                data: {
                  subscriberId: this.lastID
                }
              });
            });
          }
        }
      );
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/newsletter
 * Get all newsletter subscribers (admin only)
 */
router.get('/admin/newsletter',
  authenticateToken,
  requireRole('admin'),
  [
    query('active').optional().isBoolean().withMessage('Active filter must be boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const {
        active,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT
          id, email, active, subscribed_at
        FROM newsletter
        WHERE 1=1
      `;

      const params = [];

      // Add active filter
      if (active !== undefined) {
        query += ` AND active = ?`;
        params.push(active === 'true' ? 1 : 0);
      }

      // Add ordering
      query += ` ORDER BY subscribed_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      db.all(query, params, (err, subscribers) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM newsletter WHERE 1=1';
        const countParams = [];

        if (active !== undefined) {
          countQuery += ` AND active = ?`;
          countParams.push(active === 'true' ? 1 : 0);
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
              subscribers,
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
      console.error('Subscribers fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/admin/newsletter/:id/toggle
 * Toggle subscriber active status (admin only)
 */
router.put('/admin/newsletter/:id/toggle',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      // Get current status
      db.get(
        'SELECT active FROM newsletter WHERE id = ?',
        [id],
        (err, subscriber) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!subscriber) {
            return res.status(404).json({
              success: false,
              message: 'Subscriber not found'
            });
          }

          const newStatus = subscriber.active === 1 ? 0 : 1;

          db.run(
            'UPDATE newsletter SET active = ? WHERE id = ?',
            [newStatus, id],
            function(err) {
              if (err) {
                console.error('Status update error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to update subscriber status'
                });
              }

              if (this.changes === 0) {
                return res.status(404).json({
                  success: false,
                  message: 'Subscriber not found'
                });
              }

              res.json({
                success: true,
                message: `Subscriber ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`,
                data: {
                  active: newStatus === 1
                }
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Subscriber toggle error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/admin/newsletter/:id
 * Delete subscriber (admin only)
 */
router.delete('/admin/newsletter/:id',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      // Check if subscriber exists
      db.get(
        'SELECT id FROM newsletter WHERE id = ?',
        [id],
        (err, subscriber) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!subscriber) {
            return res.status(404).json({
              success: false,
              message: 'Subscriber not found'
            });
          }

          // Delete subscriber
          db.run(
            'DELETE FROM newsletter WHERE id = ?',
            [id],
            function(err) {
              if (err) {
                console.error('Subscriber deletion error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to delete subscriber'
                });
              }

              res.json({
                success: true,
                message: 'Subscriber deleted successfully'
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Subscriber deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/newsletter/stats
 * Get newsletter statistics (admin only)
 */
router.get('/admin/newsletter/stats',
  authenticateToken,
  requireRole('admin'),
  (req, res) => {
    try {
      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN active = 1 THEN 1 END) as active,
          COUNT(CASE WHEN active = 0 THEN 1 END) as inactive,
          COUNT(CASE WHEN subscribed_at >= datetime('now', '-7 days') THEN 1 END) as this_week,
          COUNT(CASE WHEN subscribed_at >= datetime('now', '-30 days') THEN 1 END) as this_month
        FROM newsletter
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
              active: stats.active,
              inactive: stats.inactive,
              thisWeek: stats.this_week,
              thisMonth: stats.this_month
            }
          }
        });
      });
    } catch (error) {
      console.error('Newsletter stats fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/admin/newsletter/export
 * Export newsletter subscribers as CSV (admin only)
 */
router.get('/admin/newsletter/export',
  authenticateToken,
  requireRole('admin'),
  (req, res) => {
    try {
      const query = `
        SELECT
          id,
          email,
          CASE WHEN active = 1 THEN 'Active' ELSE 'Inactive' END as status,
          subscribed_at
        FROM newsletter
        ORDER BY subscribed_at DESC
      `;

      db.all(query, [], (err, subscribers) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Convert to CSV
        const csvHeader = 'ID,Email,Status,Subscribed At\n';
        const csvData = subscribers.map(sub =>
          `${sub.id},"${sub.email}","${sub.status}","${sub.subscribed_at}"`
        ).join('\n');

        const csv = csvHeader + csvData;

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv"`);

        res.send(csv);
      });
    } catch (error) {
      console.error('Newsletter export error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/newsletter/unsubscribe
 * Unsubscribe from newsletter
 */
router.delete('/unsubscribe',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { email } = req.body;

      db.run(
        'UPDATE newsletter SET active = 0 WHERE email = ?',
        [email],
        function(err) {
          if (err) {
            console.error('Unsubscribe error:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to unsubscribe'
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              success: false,
              message: 'Email not found in newsletter list'
            });
          }

          res.json({
            success: true,
            message: 'Successfully unsubscribed from newsletter'
          });
        }
      );
    } catch (error) {
      console.error('Unsubscribe error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

module.exports = router;