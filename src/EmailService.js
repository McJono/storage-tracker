const nodemailer = require('nodemailer');

/**
 * EmailService handles sending emails via SMTP
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.configured = false;
  }

  /**
   * Configure the email service with SMTP settings
   */
  configure(options) {
    const {
      host = process.env.SMTP_HOST,
      port = process.env.SMTP_PORT || 587,
      secure = process.env.SMTP_SECURE === 'true',
      user = process.env.SMTP_USER,
      pass = process.env.SMTP_PASS,
      from = process.env.SMTP_FROM || process.env.SMTP_USER
    } = options || {};

    // Check if SMTP is configured
    if (!host || !user || !pass) {
      console.warn('SMTP not configured. Email functionality will be disabled.');
      this.configured = false;
      return false;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure,
      auth: {
        user,
        pass
      }
    });

    this.from = from;
    this.configured = true;
    return true;
  }

  /**
   * Check if email service is configured
   */
  isConfigured() {
    return this.configured;
  }

  /**
   * Send a magic link email
   */
  async sendMagicLink(email, token, appUrl = process.env.APP_URL || 'http://localhost:3000') {
    if (!this.configured) {
      throw new Error('Email service not configured. Please set SMTP environment variables.');
    }

    const magicLink = `${appUrl}/auth/verify?token=${token}`;
    
    const mailOptions = {
      from: this.from,
      to: email,
      subject: 'Storage Tracker - Login Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Storage Tracker Login</h2>
          <p>Click the link below to log in to your Storage Tracker account:</p>
          <p style="margin: 30px 0;">
            <a href="${magicLink}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Log In to Storage Tracker
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${magicLink}</p>
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This link will expire in 14 days. If you didn't request this login link, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `
Storage Tracker Login

Click the link below to log in to your Storage Tracker account:

${magicLink}

This link will expire in 14 days. If you didn't request this login link, you can safely ignore this email.
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(to) {
    if (!this.configured) {
      throw new Error('Email service not configured. Please set SMTP environment variables.');
    }

    const mailOptions = {
      from: this.from,
      to,
      subject: 'Storage Tracker - Test Email',
      html: '<h2>SMTP Configuration Test</h2><p>If you receive this email, your SMTP configuration is working correctly!</p>',
      text: 'SMTP Configuration Test\n\nIf you receive this email, your SMTP configuration is working correctly!'
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending test email:', error);
      throw new Error(`Failed to send test email: ${error.message}`);
    }
  }
}

module.exports = EmailService;
