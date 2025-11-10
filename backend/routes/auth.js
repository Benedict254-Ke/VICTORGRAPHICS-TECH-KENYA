const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authUtils = require('../utils/auth');
const { authenticateToken, authLimiter } = require('../middleware/auth');
const { handleValidationErrors, validators } = require('../middleware/security');

const router = express.Router();
const db = new sqlite3.Database(path.join(__dirname, '..', 'db.sqlite'));

/**
 * POST /api/auth/login
 * Login endpoint for admin users
 */
router.post('/login',
  authLimiter,
  validators.userLogin,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      db.get(
        'SELECT * FROM users WHERE email = ? AND active = 1',
        [email],
        async (err, user) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!user) {
            return res.status(401).json({
              success: false,
              message: 'Invalid email or password'
            });
          }

          // Verify password
          try {
            const isValidPassword = await authUtils.verifyPassword(password, user.password_hash);

            if (!isValidPassword) {
              return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
              });
            }

            // Generate JWT token
            const token = authUtils.generateToken(user);

            // Update last login
            db.run(
              'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [user.id]
            );

            res.json({
              success: true,
              message: 'Login successful',
              data: {
                token,
                user: authUtils.sanitizeUser(user)
              }
            });
          } catch (error) {
            console.error('Password verification error:', error);
            return res.status(500).json({
              success: false,
              message: 'Authentication failed'
            });
          }
        }
      );
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/auth/register
 * Register new admin user (protected)
 */
router.post('/register',
  authenticateToken,
  validators.userRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, password, role = 'staff' } = req.body;

      // Check if user is admin (only admins can create new users)
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // Validate password strength
      const passwordValidation = authUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet security requirements',
          errors: passwordValidation.errors
        });
      }

      // Check if email already exists
      db.get(
        'SELECT id FROM users WHERE email = ?',
        [email],
        async (err, existingUser) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (existingUser) {
            return res.status(409).json({
              success: false,
              message: 'Email already registered'
            });
          }

          // Hash password
          try {
            const passwordHash = await authUtils.hashPassword(password);

            // Create new user
            db.run(
              `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
              [name, email, passwordHash, role],
              function(err) {
                if (err) {
                  console.error('User creation error:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Failed to create user'
                  });
                }

                // Get created user
                db.get(
                  'SELECT * FROM users WHERE id = ?',
                  [this.lastID],
                  (err, newUser) => {
                    if (err) {
                      console.error('Error fetching new user:', err);
                      return res.status(500).json({
                        success: false,
                        message: 'User created but failed to retrieve data'
                      });
                    }

                    res.status(201).json({
                      success: true,
                      message: 'User created successfully',
                      data: {
                        user: authUtils.sanitizeUser(newUser)
                      }
                    });
                  }
                );
              }
            );
          } catch (error) {
            console.error('Password hashing error:', error);
            res.status(500).json({
              success: false,
              message: 'Failed to process password'
            });
          }
        }
      );
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticateToken, (req, res) => {
  // Get fresh user data from database
  db.get(
    'SELECT * FROM users WHERE id = ? AND active = 1',
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          user: authUtils.sanitizeUser(user)
        }
      });
    }
  );
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with current password
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [req.user.id],
        async (err, user) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Internal server error'
            });
          }

          if (!user) {
            return res.status(404).json({
              success: false,
              message: 'User not found'
            });
          }

          // Verify current password
          try {
            const isValidPassword = await authUtils.verifyPassword(currentPassword, user.password_hash);

            if (!isValidPassword) {
              return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
              });
            }

            // Validate new password strength
            const passwordValidation = authUtils.validatePasswordStrength(newPassword);
            if (!passwordValidation.isValid) {
              return res.status(400).json({
                success: false,
                message: 'New password does not meet security requirements',
                errors: passwordValidation.errors
              });
            }

            // Hash new password
            const newPasswordHash = await authUtils.hashPassword(newPassword);

            // Update password
            db.run(
              'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [newPasswordHash, req.user.id],
              (err) => {
                if (err) {
                  console.error('Password update error:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Failed to update password'
                  });
                }

                res.json({
                  success: true,
                  message: 'Password changed successfully'
                });
              }
            );
          } catch (error) {
            console.error('Password processing error:', error);
            res.status(500).json({
              success: false,
              message: 'Failed to process password'
            });
          }
        }
      );
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', authenticateToken, (req, res) => {
  // In a stateless JWT implementation, logout is handled client-side
  // by removing the token from storage
  // You could implement token blacklisting if needed

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * POST /api/auth/verify-token
 * Verify JWT token validity
 */
router.post('/verify-token', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token is required'
    });
  }

  try {
    const decoded = authUtils.verifyToken(token);

    // Check if user still exists and is active
    db.get(
      'SELECT id FROM users WHERE id = ? AND active = 1',
      [decoded.id],
      (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found or inactive'
          });
        }

        res.json({
          success: true,
          message: 'Token is valid',
          data: {
            user: decoded
          }
        });
      }
    );
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

module.exports = router;