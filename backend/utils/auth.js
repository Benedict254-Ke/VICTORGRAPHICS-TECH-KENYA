const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthUtils {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
    this.saltRounds = 12;
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Error hashing password: ' + error.message);
    }
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('Error verifying password: ' + error.message);
    }
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user) {
    try {
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      return jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiry,
        issuer: 'victorgraphics-kenya',
        audience: 'victorgraphics-users'
      });
    } catch (error) {
      throw new Error('Error generating token: ' + error.message);
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'victorgraphics-kenya',
        audience: 'victorgraphics-users'
      });
    } catch (error) {
      throw new Error('Invalid token: ' + error.message);
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Sanitize user data for public response
   */
  sanitizeUser(user) {
    const { password_hash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create password reset token
   */
  createPasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return {
      resetToken,
      resetTokenExpiry
    };
  }
}

module.exports = new AuthUtils();