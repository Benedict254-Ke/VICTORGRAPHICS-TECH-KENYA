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
 * GET /api/courses
 * Get all courses with optional filtering
 */
router.get('/',
  [
    query('level').optional().isIn(['basic', 'advanced', 'professional']).withMessage('Level must be basic, advanced, or professional'),
    query('active').optional().isBoolean().withMessage('Active must be a boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const {
        level,
        active = true,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT
          id, title, duration, fee_ksh, description, level, active, created_at
        FROM courses
        WHERE 1=1
      `;

      const params = [];

      // Add level filter
      if (level) {
        query += ` AND level = ?`;
        params.push(level);
      }

      // Add active filter
      if (active !== undefined) {
        query += ` AND active = ?`;
        params.push(active === 'true' ? 1 : 0);
      }

      // Add ordering
      query += ` ORDER BY level, fee_ksh ASC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      db.all(query, params, (err, courses) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM courses WHERE 1=1';
        const countParams = [];

        if (level) {
          countQuery += ` AND level = ?`;
          countParams.push(level);
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
              courses,
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
      console.error('Courses fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/courses/:id
 * Get course by ID
 */
router.get('/:id',
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    const { id } = req.params;

    const query = `
      SELECT
        id, title, duration, fee_ksh, description, level, active, created_at
      FROM courses
      WHERE id = ?
    `;

    db.get(query, [id], (err, course) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      res.json({
        success: true,
        data: {
          course
        }
      });
    });
  }
);

/**
 * POST /api/courses
 * Create new course (admin only)
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  validators.courseCreate,
  handleValidationErrors,
  (req, res) => {
    try {
      const {
        title,
        duration,
        fee_ksh,
        description,
        level = 'basic',
        active = true
      } = req.body;

      // Create new course
      const query = `
        INSERT INTO courses (
          title, duration, fee_ksh, description, level, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      db.run(
        query,
        [title, duration, fee_ksh, description, level, active ? 1 : 0],
        function(err) {
          if (err) {
            console.error('Course creation error:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to create course'
            });
          }

          // Get created course
          db.get(
            'SELECT * FROM courses WHERE id = ?',
            [this.lastID],
            (err, newCourse) => {
              if (err) {
                console.error('Error fetching new course:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Course created but failed to retrieve data'
                });
              }

              res.status(201).json({
                success: true,
                message: 'Course created successfully',
                data: {
                  course: newCourse
                }
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Course creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/courses/:id
 * Update course (admin only)
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  [
    validators.idParam,
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
    body('duration').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Duration is required'),
    body('fee_ksh').optional().isInt({ min: 0 }).withMessage('Fee must be a positive integer'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
    body('level').optional().isIn(['basic', 'advanced', 'professional']).withMessage('Level must be basic, advanced, or professional'),
    body('active').optional().isBoolean().withMessage('Active must be a boolean')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = [];
      const updateValues = [];

      // Build dynamic update query
      const allowedFields = ['title', 'duration', 'fee_ksh', 'description', 'level', 'active'];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(field === 'active' ? (req.body[field] ? 1 : 0) : req.body[field]);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updateValues.push(id);

      const query = `UPDATE courses SET ${updateFields.join(', ')} WHERE id = ?`;

      db.run(query, updateValues, function(err) {
        if (err) {
          console.error('Course update error:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to update course'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: 'Course not found'
          });
        }

        // Get updated course
        db.get(
          'SELECT * FROM courses WHERE id = ?',
          [id],
          (err, updatedCourse) => {
            if (err) {
              console.error('Error fetching updated course:', err);
              return res.status(500).json({
                success: false,
                message: 'Course updated but failed to retrieve data'
              });
            }

            res.json({
              success: true,
              message: 'Course updated successfully',
              data: {
                course: updatedCourse
              }
            });
          }
        );
      });
    } catch (error) {
      console.error('Course update error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/courses/:id
 * Delete course (admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      // Check if course exists
      db.get(
        'SELECT id FROM courses WHERE id = ?',
        [id],
        (err, course) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!course) {
            return res.status(404).json({
              success: false,
              message: 'Course not found'
            });
          }

          // Delete course
          db.run(
            'DELETE FROM courses WHERE id = ?',
            [id],
            function(err) {
              if (err) {
                console.error('Course deletion error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to delete course'
                });
              }

              res.json({
                success: true,
                message: 'Course deleted successfully'
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Course deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/courses/pricing-summary
 * Get pricing summary for all active courses
 */
router.get('/pricing/summary', (req, res) => {
  try {
    const query = `
      SELECT
        level,
        title,
        duration,
        fee_ksh,
        description,
        id
      FROM courses
      WHERE active = 1
      ORDER BY
        CASE
          WHEN level = 'basic' THEN 1
          WHEN level = 'advanced' THEN 2
          WHEN level = 'professional' THEN 3
        END,
        fee_ksh ASC
    `;

    db.all(query, [], (err, courses) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      // Group by level for better organization
      const coursesByLevel = {
        basic: [],
        advanced: [],
        professional: []
      };

      courses.forEach(course => {
        if (coursesByLevel[course.level]) {
          coursesByLevel[course.level].push(course);
        }
      });

      res.json({
        success: true,
        data: {
          courses: coursesByLevel,
          summary: {
            basic: coursesByLevel.basic.length,
            advanced: coursesByLevel.advanced.length,
            professional: coursesByLevel.professional.length,
            total: courses.length
          }
        }
      });
    });
  } catch (error) {
    console.error('Pricing summary fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/courses/levels
 * Get all available course levels
 */
router.get('/levels/list', (req, res) => {
  try {
    const query = `
      SELECT
        level,
        COUNT(*) as count,
        MIN(fee_ksh) as min_price,
        MAX(fee_ksh) as max_price
      FROM courses
      WHERE active = 1
      GROUP BY level
      ORDER BY level
    `;

    db.all(query, [], (err, levels) => {
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
          levels: levels.map(level => ({
            name: level.level,
            count: level.count,
            priceRange: {
              min: level.min_price,
              max: level.max_price
            }
          }))
        }
      });
    });
  } catch (error) {
    console.error('Levels fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;