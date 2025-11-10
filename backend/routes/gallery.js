const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { body, param, query, validationResult } = require('express-validator');
const fs = require('fs').promises;

const { authenticateToken, requireRole, handleValidationErrors, validators } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/security');
const { uploadMultipleMiddleware, deleteFile, getFileInfo } = require('../middleware/upload');

const router = express.Router();
const db = new sqlite3.Database(path.join(__dirname, '..', 'db.sqlite'));

// Apply input sanitization to all routes
router.use(sanitizeInput);

/**
 * GET /api/gallery
 * Get gallery images with optional filtering
 */
router.get('/',
  [
    query('category').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Category must be between 1 and 100 characters'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const {
        category,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT
          id, filename, title, alt_text, category, uploaded_at
        FROM gallery
        WHERE 1=1
      `;

      const params = [];

      // Add category filter
      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }

      // Add ordering
      query += ` ORDER BY uploaded_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      db.all(query, params, (err, images) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        // Add file URLs to images
        const imagesWithUrls = images.map(image => ({
          ...image,
          url: `/uploads/${image.category}/${image.filename}`
        }));

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM gallery WHERE 1=1';
        const countParams = [];

        if (category) {
          countQuery += ` AND category = ?`;
          countParams.push(category);
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
              images: imagesWithUrls,
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
      console.error('Gallery fetch error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/gallery/:id
 * Get single image by ID
 */
router.get('/:id',
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    const { id } = req.params;

    const query = `
      SELECT
        id, filename, title, alt_text, category, uploaded_at
      FROM gallery
      WHERE id = ?
    `;

    db.get(query, [id], (err, image) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!image) {
        return res.status(404).json({
          success: false,
          message: 'Image not found'
        });
      }

      const imageWithUrl = {
        ...image,
        url: `/uploads/${image.category}/${image.filename}`
      };

      res.json({
        success: true,
        data: {
          image: imageWithUrl
        }
      });
    });
  }
);

/**
 * POST /api/gallery
 * Upload images to gallery (admin only)
 */
router.post('/',
  authenticateToken,
  requireRole('admin'),
  uploadMultipleMiddleware,
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
    body('alt_text').optional().trim().isLength({ max: 500 }).withMessage('Alt text must be less than 500 characters'),
    body('category').trim().isLength({ min: 1, max: 100 }).withMessage('Category is required and must be less than 100 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, alt_text, category } = req.body;
      const files = req.files || [];

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one image file is required'
        });
      }

      const uploadedImages = [];
      const errors = [];

      // Process each uploaded file
      for (const file of files) {
        try {
          const query = `
            INSERT INTO gallery (
              filename, title, alt_text, category, uploaded_at
            ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          `;

          await new Promise((resolve, reject) => {
            db.run(
              query,
              [
                file.filename,
                title || file.originalname,
                alt_text || `${title || file.originalname} - VictorGraphics Gallery`,
                category
              ],
              function(err) {
                if (err) {
                  reject(err);
                } else {
                  resolve(this.lastID);
                }
              }
            );
          });

          uploadedImages.push({
            id: uploadedImages.length + 1, // Will be updated with actual DB ID
            filename: file.filename,
            title: title || file.originalname,
            alt_text: alt_text || `${title || file.originalname} - VictorGraphics Gallery`,
            category: category,
            url: `/uploads/${category}/${file.filename}`
          });
        } catch (error) {
          console.error('Error processing file:', error);
          errors.push(`Failed to process ${file.originalname}: ${error.message}`);
        }
      }

      if (uploadedImages.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload any images',
          errors
        });
      }

      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${uploadedImages.length} image(s)`,
        data: {
          images: uploadedImages,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      console.error('Gallery upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * PUT /api/gallery/:id
 * Update image details (admin only)
 */
router.put('/:id',
  authenticateToken,
  requireRole('admin'),
  [
    validators.idParam,
    body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
    body('alt_text').optional().trim().isLength({ max: 500 }).withMessage('Alt text must be less than 500 characters'),
    body('category').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Category must be between 1 and 100 characters')
  ],
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;
      const { title, alt_text, category } = req.body;

      // Get current image info
      db.get(
        'SELECT * FROM gallery WHERE id = ?',
        [id],
        (err, currentImage) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!currentImage) {
            return res.status(404).json({
              success: false,
              message: 'Image not found'
            });
          }

          const updateFields = [];
          const updateValues = [];

          // Build dynamic update query
          if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title);
          }
          if (alt_text !== undefined) {
            updateFields.push('alt_text = ?');
            updateValues.push(alt_text);
          }
          if (category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(category);
          }

          if (updateFields.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'No valid fields to update'
            });
          }

          updateValues.push(id);

          const query = `UPDATE gallery SET ${updateFields.join(', ')} WHERE id = ?`;

          db.run(query, updateValues, function(err) {
            if (err) {
              console.error('Image update error:', err);
              return res.status(500).json({
                success: false,
                message: 'Failed to update image'
              });
            }

            if (this.changes === 0) {
              return res.status(404).json({
                success: false,
                message: 'Image not found'
              });
            }

            // Get updated image
            db.get(
              'SELECT * FROM gallery WHERE id = ?',
              [id],
              (err, updatedImage) => {
                if (err) {
                  console.error('Error fetching updated image:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Image updated but failed to retrieve data'
                  });
                }

                const imageWithUrl = {
                  ...updatedImage,
                  url: `/uploads/${updatedImage.category}/${updatedImage.filename}`
                };

                res.json({
                  success: true,
                  message: 'Image updated successfully',
                  data: {
                    image: imageWithUrl
                  }
                });
              }
            );
          });
        }
      );
    } catch (error) {
      console.error('Image update error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * DELETE /api/gallery/:id
 * Delete image (admin only)
 */
router.delete('/:id',
  authenticateToken,
  requireRole('admin'),
  validators.idParam,
  handleValidationErrors,
  (req, res) => {
    try {
      const { id } = req.params;

      // Get image info before deletion
      db.get(
        'SELECT * FROM gallery WHERE id = ?',
        [id],
        async (err, image) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!image) {
            return res.status(404).json({
              success: false,
              message: 'Image not found'
            });
          }

          // Delete from database
          db.run(
            'DELETE FROM gallery WHERE id = ?',
            [id],
            async function(err) {
              if (err) {
                console.error('Database deletion error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Failed to delete image from database'
                });
              }

              // Delete physical file
              try {
                const filePath = path.join(__dirname, '..', 'uploads', image.category, image.filename);
                await deleteFile(filePath);
              } catch (fileError) {
                console.error('File deletion error:', fileError);
                // Continue even if file deletion fails
              }

              res.json({
                success: true,
                message: 'Image deleted successfully'
              });
            }
          );
        }
      );
    } catch (error) {
      console.error('Image deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/gallery/categories
 * Get all gallery categories
 */
router.get('/categories/list', (req, res) => {
  try {
    const query = `
      SELECT
        category,
        COUNT(*) as count
      FROM gallery
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
 * GET /api/gallery/featured
 * Get featured images for homepage
 */
router.get('/featured/list', (req, res) => {
  try {
    const query = `
      SELECT
        id, filename, title, alt_text, category, uploaded_at
      FROM gallery
      ORDER BY uploaded_at DESC
      LIMIT 8
    `;

    db.all(query, [], (err, images) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      // Add file URLs to images
      const imagesWithUrls = images.map(image => ({
        ...image,
        url: `/uploads/${image.category}/${image.filename}`
      }));

      res.json({
        success: true,
        data: {
          images: imagesWithUrls
        }
      });
    });
  } catch (error) {
    console.error('Featured images fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;