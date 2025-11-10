const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Create transporter based on environment variables
    const config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

    this.transporter = nodemailer.createTransporter(config);

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.log('Email server connection failed:', error);
      } else {
        console.log('Email server is ready to send messages');
      }
    });
  }

  /**
   * Send contact form submission email
   */
  async sendContactForm(data) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: process.env.EMAIL_TO || process.env.EMAIL_USER,
        subject: `New Contact Form Submission: ${data.subject}`,
        html: this.generateContactEmailTemplate(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Contact email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending contact email:', error);
      throw new Error('Failed to send contact email');
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(data) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: data.email,
        subject: 'Booking Confirmation - VictorGraphics Kenya',
        html: this.generateBookingConfirmationTemplate(data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Booking confirmation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      throw new Error('Failed to send booking confirmation email');
    }
  }

  /**
   * Send newsletter welcome email
   */
  async sendNewsletterWelcome(email) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to VictorGraphics Newsletter',
        html: this.generateNewsletterWelcomeTemplate()
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Newsletter welcome email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending newsletter welcome email:', error);
      throw new Error('Failed to send newsletter welcome email');
    }
  }

  /**
   * Generate contact form email template
   */
  generateContactEmailTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .field { margin-bottom: 20px; }
          .label { font-weight: bold; color: #1f2937; margin-bottom: 5px; }
          .value { background: white; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📧 New Contact Form Submission</h1>
          <p>Victor and Sons Computers & Tech Solutions Kenya</p>
        </div>

        <div class="content">
          <div class="field">
            <div class="label">👤 Name:</div>
            <div class="value">${data.name}</div>
          </div>

          <div class="field">
            <div class="label">📧 Email:</div>
            <div class="value">${data.email}</div>
          </div>

          ${data.phone ? `
          <div class="field">
            <div class="label">📞 Phone:</div>
            <div class="value">${data.phone}</div>
          </div>
          ` : ''}

          <div class="field">
            <div class="label">📝 Subject:</div>
            <div class="value">${data.subject}</div>
          </div>

          <div class="field">
            <div class="label">💬 Message:</div>
            <div class="value">${data.message}</div>
          </div>

          ${data.serviceInterest ? `
          <div class="field">
            <div class="label">🎯 Service Interest:</div>
            <div class="value">${data.serviceInterest}</div>
          </div>
          ` : ''}

          ${data.preferredDate ? `
          <div class="field">
            <div class="label">📅 Preferred Date:</div>
            <div class="value">${new Date(data.preferredDate).toLocaleDateString()}</div>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>This message was sent from the VictorGraphics website contact form.</p>
          <p>Visit us at: California next to Oasis Korumba shop</p>
          <p>Call: +254 717 379 145 / +254 732 928 67</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate booking confirmation email template
   */
  generateBookingConfirmationTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .booking-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #1f2937; margin-bottom: 5px; }
          .value { color: #4b5563; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
          .cta { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Booking Confirmed!</h1>
          <p>Victor and Sons Computers & Tech Solutions Kenya</p>
        </div>

        <div class="content">
          <p>Dear ${data.name},</p>

          <p>Thank you for booking with us! Your service request has been received and we'll contact you shortly to confirm the details.</p>

          <div class="booking-details">
            <h3>📋 Booking Details</h3>
            <div class="field">
              <div class="label">Booking ID:</div>
              <div class="value">#${Date.now()}</div>
            </div>

            <div class="field">
              <div class="label">Name:</div>
              <div class="value">${data.name}</div>
            </div>

            <div class="field">
              <div class="label">Email:</div>
              <div class="value">${data.email}</div>
            </div>

            <div class="field">
              <div class="label">Phone:</div>
              <div class="value">${data.phone}</div>
            </div>

            ${data.serviceName ? `
            <div class="field">
              <div class="label">Service:</div>
              <div class="value">${data.serviceName}</div>
            </div>
            ` : ''}

            ${data.courseName ? `
            <div class="field">
              <div class="label">Course:</div>
              <div class="value">${data.courseName}</div>
            </div>
            ` : ''}

            ${data.preferredDate ? `
            <div class="field">
              <div class="label">Preferred Date:</div>
              <div class="value">${new Date(data.preferredDate).toLocaleDateString()}</div>
            </div>
            ` : ''}

            ${data.message ? `
            <div class="field">
              <div class="label">Additional Notes:</div>
              <div class="value">${data.message}</div>
            </div>
            ` : ''}
          </div>

          <h3>📞 What happens next?</h3>
          <ul>
            <li>Our team will review your booking request</li>
            <li>We'll contact you within 24 hours to confirm details</li>
            <li>You can reach us at +254 717 379 145 for urgent queries</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:+254717379145" class="cta">📞 Call Us Now</a>
          </div>
        </div>

        <div class="footer">
          <p>Victor and Sons Computers & Tech Solutions Kenya</p>
          <p>📍 California next to Oasis Korumba shop</p>
          <p>📧 victorcomputerservices254@gmail.com</p>
          <p>🕒 Mon–Sat: 8:00–18:00, Sun: Closed</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate newsletter welcome email template
   */
  generateNewsletterWelcomeTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to VictorGraphics Newsletter</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .welcome-offer { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .services { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
          .cta { background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .service-list { list-style: none; padding: 0; }
          .service-list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .service-list li:last-child { border-bottom: none; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome to VictorGraphics!</h1>
          <p>Your trusted partner for cyber and digital services</p>
        </div>

        <div class="content">
          <p>Thank you for subscribing to our newsletter! You're now part of the VictorGraphics community.</p>

          <div class="welcome-offer">
            <h3>🎁 Special Welcome Offer!</h3>
            <p>As a new subscriber, get <strong>10% OFF</strong> your first service with us. Mention this email when you visit!</p>
          </div>

          <h3>🚀 What We Offer</h3>
          <div class="services">
            <ul class="service-list">
              <li>🖨️ Printing & Design Services</li>
              <li>🏛️ E-Citizen & Government Services</li>
              <li>📋 Document Applications & Processing</li>
              <li>💻 Computer Training Courses</li>
              <li>📸 Scanning & Digital Services</li>
              <li>🎨 Custom Design & Printing</li>
            </ul>
          </div>

          <h3>📞 Need Help Right Now?</h3>
          <p>Our team is ready to assist you with any digital or cyber services you need.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="tel:+254717379145" class="cta">📞 Call Us Now</a>
            <a href="https://wa.me/254717379145" class="cta" style="background: #25d366;">💬 Chat on WhatsApp</a>
          </div>

          <h3>📍 Visit Us</h3>
          <p><strong>Address:</strong> California next to Oasis Korumba shop</p>
          <p><strong>Hours:</strong> Mon–Sat: 8:00–18:00, Sunday: Closed</p>
        </div>

        <div class="footer">
          <p>Victor and Sons Computers & Tech Solutions Kenya</p>
          <p>📧 victorcomputerservices254@gmail.com</p>
          <p>📱 +254 717 379 145 / +254 732 928 67</p>
          <p><a href="#" style="color: #9ca3af;">Unsubscribe</a> | <a href="#" style="color: #9ca3af;">Privacy Policy</a></p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();