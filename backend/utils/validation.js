const { body, param, query } = require('express-validator');

/**
 * Validation utility functions
 */
class ValidationUtils {
  /**
   * Validate Kenyan phone number
   */
  static validateKenyanPhone(phone) {
    const kenyanPhoneRegex = /^(?:\+254|0)?[17]\d{8}$/;
    return kenyanPhoneRegex.test(phone);
  }

  /**
   * Validate and format phone number to international format
   */
  static formatKenyanPhone(phone) {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Convert to international format
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }

    return phone;
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate strong password
   */
  static validateStrongPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas,
      errors: [
        ...(password.length < minLength ? ['Password must be at least 8 characters long'] : []),
        ...(!hasUpperCase ? ['Password must contain at least one uppercase letter'] : []),
        ...(!hasLowerCase ? ['Password must contain at least one lowercase letter'] : []),
        ...(!hasNumbers ? ['Password must contain at least one number'] : []),
        ...(!hasNonalphas ? ['Password must contain at least one special character'] : [])
      ]
    };
  }

  /**
   * Validate KRA PIN format (Kenya Revenue Authority)
   */
  static validateKraPin(pin) {
    // KRA PIN format: A11-digit alphanumeric number
    const kraPinRegex = /^[A-Za-z]\d{11}$/;
    return kraPinRegex.test(pin);
  }

  /**
   * Validate ID number format (Kenya)
   */
  static validateIdNumber(idNumber) {
    // Kenyan ID number: 8 digits
    const idRegex = /^\d{8}$/;
    return idRegex.test(idNumber);
  }

  /**
   * Validate Kenyan company registration number
   */
  static validateCompanyRegistration(regNumber) {
    // Company registration can be various formats
    const companyRegex = /^([A-Z]{4}\/\d{5}\/\d{4}|C\/\d{4}\/\d{4})$/;
    return companyRegex.test(regNumber);
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(content) {
    if (!content) return '';

    // Basic HTML sanitization - remove potentially dangerous content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const allowedExtensions = allowedTypes.map(type => {
      switch (type) {
        case 'image/jpeg': return ['.jpg', '.jpeg'];
        case 'image/png': return ['.png'];
        case 'image/gif': return ['.gif'];
        case 'image/webp': return ['.webp'];
        case 'application/pdf': return ['.pdf'];
        default: return [];
      }
    }).flat();

    if (allowedExtensions.length > 0) {
      const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (!allowedExtensions.includes(fileExtension)) {
        errors.push(`File extension must be one of: ${allowedExtensions.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate URL
   */
  static validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate date format and range
   */
  static validateDate(dateString, minDate = null, maxDate = null) {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date format' };
    }

    const now = new Date();

    if (minDate && date < new Date(minDate)) {
      return { isValid: false, error: `Date must be after ${minDate}` };
    }

    if (maxDate && date > new Date(maxDate)) {
      return { isValid: false, error: `Date must be before ${maxDate}` };
    }

    // Don't allow dates too far in the past
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    if (date < oneYearAgo) {
      return { isValid: false, error: 'Date cannot be more than one year in the past' };
    }

    // Don't allow dates too far in the future
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    if (date > oneYearFromNow) {
      return { isValid: false, error: 'Date cannot be more than one year in the future' };
    }

    return { isValid: true };
  }

  /**
   * Validate service interest selection
   */
  static validateServiceInterest(services, availableServices = []) {
    if (!Array.isArray(services)) {
      return { isValid: false, error: 'Services must be an array' };
    }

    if (services.length === 0) {
      return { isValid: false, error: 'At least one service must be selected' };
    }

    if (availableServices.length > 0) {
      const validServices = availableServices.map(service => service.id);
      const invalidServices = services.filter(serviceId => !validServices.includes(serviceId));

      if (invalidServices.length > 0) {
        return {
          isValid: false,
          error: `Invalid service IDs: ${invalidServices.join(', ')}`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Generate validation error response
   */
  static generateValidationError(errors) {
    return {
      success: false,
      message: 'Validation failed',
      errors: Array.isArray(errors) ? errors : [errors]
    };
  }
}

module.exports = ValidationUtils;