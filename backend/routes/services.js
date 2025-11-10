const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { body, param, query, validationResult } = require('express-validator');

const { authenticateToken, requireRole, handleValidationErrors, validators } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/security');

const router = express.Router();
const db = new sqlite3.Database(path.join(__dirname, '..', 'db.sqlite'));

// Apply input sanitization to all routes
router.use(sanitizeInput);

/**
 * GET /api/services
 * Get all services with optional search and filtering
 */
router.get('/',
  validators.searchQuery,
  handleValidationErrors,
  (req, res) => {
    try {
      const {
        q: searchQuery,
        category,
        featured,
        active = true,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT
          id, title, slug, description, category, price_ksh,
          featured, active, created_at, updated_at
        FROM services
        WHERE 1=1
      `;

      const params = [];

      // Add search filter
      if (searchQuery) {
        query += ` AND (title LIKE ? OR description LIKE ?)`;
        const searchTerm = `%${searchQuery}%`;
        params.push(searchTerm, searchTerm);
      }

      // Add category filter
      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }

      // Add featured filter
      if (featured !== undefined) {
        query += ` AND featured = ?`;
        params.push(featured === 'true' ? 1 : 0);
      }

      // Add active filter
      if (active !== undefined) {
        query += ` AND active = ?`;
        params.push(active === 'true' ? 1 : 0);
      }

      // Add ordering
      query += ` ORDER BY featured DESC, title ASC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      db.all(query, params, (err, services) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM services WHERE 1=1';
        const countParams = [];

        if (searchQuery) {
          countQuery += ` AND (title LIKE ? OR description LIKE ?)`;
          countParams.push(params[0], params[1]);
        }
        if (category) {
          countQuery += ` AND category = ?`;
          countParams.push(category);
        }
        if (featured !== undefined) {
          countQuery += ` AND featured = ?`;
          countParams.push(featured === 'true' ? 1 : 0);
        }
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
              services,
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
      console.error('Services fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/services/:id
 * Get service by ID
 */
router.get('/:id',
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    const { id } = req.params;

    const query = `
      SELECT
        id, title, slug, description, category, price_ksh,
        featured, active, created_at, updated_at
      FROM services
      WHERE id = ?
    `;

    db.get(query, [id], (err, service) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      res.json({
        success: true,
        data: {
          service
        }
      });
    });
  }
);

/**
 * GET /api/services/slug/:slug
 * Get service by slug
 */
router.get('/slug/:slug',
  (req, res) => {
    const { slug } = req.params;

    const query = `
      SELECT
        id, title, slug, description, category, price_ksh,
        featured, active, created_at, updated_at
      FROM services
      WHERE slug = ? AND active = 1
    `;

    db.get(query, [slug], (err, service) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      res.json({
        success: true,
        data: {
          service
        }
      });
    });
  }
);

/**
 * POST /api/services
 * Create new service (admin only)
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  validators.serviceCreate,
  handleValidationErrors,
  (req, res) => {
    try {
      const {
        title,
        slug,
        description,
        category,
        price_ksh,
        featured = false,
        active = true
      } = req.body;

      // Check if slug already exists
      db.get(
        'SELECT id FROM services WHERE slug = ?',
        [slug],
        (err, existingService) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (existingService) {
            return res.status(409).json({
              success: false,
              message: 'Service with this slug already exists'
            });
          }

          // Create new service
          const query = `
            INSERT INTO services (
              title, slug, description, category, price_ksh,
              featured, active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;

          db.run(
            query,
            [title, slug, description, category, price_ksh, featured ? 1 : 0, active ? 1 : 0],
            function(err) {
              if (err) {
                console.error('Service creation error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to create service'
                });
              }

              // Get created service
              db.get(
                'SELECT * FROM services WHERE id = ?',
                [this.lastID],
                (err, newService) => {
                  if (err) {
                    console.error('Error fetching new service:', err);
                    return res.status(500).json({
                      success: false,
                      message: 'Service created but failed to retrieve data'
                    });
                  }

                  res.status(201).json({
                    success: true,
                    message: 'Service created successfully',
                    data: {
                      service: newService
                    }
                  });
                }
              );
            }
          );
        }
      );
    } catch (error) {
      console.error('Service creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/services/:id
 * Update service (admin only)
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  [
    validators.idParam,
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
    body('slug').optional().trim().isLength({ min: 1, max: 200 }).matches(/^[a-z0-9-]+$/).withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('category').optional().trim().isLength({ max: 100 }).withMessage('Category must be less than 100 characters'),
    body('price_ksh').optional().isInt({ min: 0 }).withMessage('Price must be a positive integer'),
    body('featured').optional().isBoolean().withMessage('Featured must be a boolean'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = [];
      const updateValues = [];

      // Build dynamic update query
      const allowedFields = ['title', 'slug', 'description', 'category', 'price_ksh', 'featured', 'active'];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(field === 'featured' || field === 'active' ? (req.body[field] ? 1 : 0) : req.body[field]);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      const query = `UPDATE services SET ${updateFields.join(', ')} WHERE id = ?`;

      // Check if slug conflicts with existing service (if slug is being updated)
      if (req.body.slug) {
        db.get(
          'SELECT id FROM services WHERE slug = ? AND id != ?',
          [req.body.slug, id],
          (err, existingService) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                message: 'Internal server error'
              });
            }

            if (existingService) {
              return res.status(409).json({
                success: false,
                message: 'Service with this slug already exists'
              });
            }

            performUpdate();
          }
        );
      } else {
        performUpdate();
      }

      function performUpdate() {
        db.run(query, updateValues, function(err) {
          if (err) {
            console.error('Service update error:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to update service'
            });
          }

          if (this.changes === 0) {
            return res.status(404).json({
              success: false,
              message: 'Service not found'
            });
          }

          // Get updated service
          db.get(
            'SELECT * FROM services WHERE id = ?',
            [id],
            (err, updatedService) => {
              if (err) {
                console.error('Error fetching updated service:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Service updated but failed to retrieve data'
                });
              }

              res.json({
                success: true,
                message: 'Service updated successfully',
                data: {
                  service: updatedService
                }
              });
            }
          );
        });
      }
    } catch (error) {
      console.error('Service update error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/services/:id
 * Delete service (admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      // Check if service exists
      db.get(
        'SELECT id FROM services WHERE id = ?',
        [id],
        (err, service) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!service) {
            return res.status(404).json({
              success: false,
              message: 'Service not found'
            });
          }

          // Delete service
          db.run(
            'DELETE FROM services WHERE id = ?',
            [id],
            function(err) {
              if (err) {
                console.error('Service deletion error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to delete service'
                });
              }

              res.json({
                success: true,
                message: 'Service deleted successfully'
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Service deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/services/categories
 * Get all service categories
 */
router.get('/categories/list', (req, res) => {
  try {
    const query = `
      SELECT category, COUNT(*) as count
      FROM services
      WHERE active = 1 AND category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `;

    db.all(query, [], (err, categories) => {
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
          categories: categories.map(cat => ({
            name: cat.category,
            count: cat.count
          }))
        }
      });
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/services/featured
 * Get featured services
 */
router.get('/featured/list', (req, res) => {
  try {
    const query = `
      SELECT
        id, title, slug, description, category, price_ksh,
        featured, active, created_at, updated_at
      FROM services
      WHERE featured = 1 AND active = 1
      ORDER BY title ASC
      LIMIT 10
    `;

    db.all(query, [], (err, services) => {
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
          services
        }
      });
    });
  } catch (error) {
    console.error('Featured services fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
);

module.exports = router;