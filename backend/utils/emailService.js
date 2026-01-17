const nodemailer = require('nodemailer');
require('dotenv').config();

// Debug logging for email configuration
console.log('🔍 Checking email configuration...');
console.log('BREVO_SMTP_USER:', process.env.BREVO_SMTP_USER ? '✓ Set' : '✗ Missing');
console.log('BREVO_SMTP_PASS:', process.env.BREVO_SMTP_PASS ? '✓ Set' : '✗ Missing');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ Missing');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✓ Set' : '✗ Missing');

// Create a transporter using Brevo (formerly Sendinblue)
let transporter = null;
let emailProvider = null; // Track which provider we're using

// Initialize transporter function
async function initializeTransporter() {
    // Check if Brevo SMTP credentials are available
    if (process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS) {
        console.log('✅ Brevo SMTP credentials found, creating transporter...');
        console.log('🔍 BREVO_SMTP_USER format check:', process.env.BREVO_SMTP_USER);
        // Validate BREVO_SMTP_USER format (should contain @)
        if (!process.env.BREVO_SMTP_USER.includes('@')) {
            console.warn('⚠️ WARNING: BREVO_SMTP_USER appears to be missing @ symbol');
            console.warn('⚠️ Expected format: username@smtp-brevo.com');
            console.warn('⚠️ Current value:', process.env.BREVO_SMTP_USER);
        }
        transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.BREVO_SMTP_USER,
                pass: process.env.BREVO_SMTP_PASS
            },
            connectionTimeout: 60000, // 60 seconds (increased)
            greetingTimeout: 60000, // 60 seconds (increased)
            socketTimeout: 60000, // 60 seconds (increased)
            debug: true, // Enable debug to see connection details
            logger: true // Enable verbose logging for troubleshooting
        });
        emailProvider = 'brevo';
        console.log('✅ Using Brevo (formerly Sendinblue) SMTP');
        console.log('🔧 Connection timeouts: 60 seconds');

        // Verify transporter configuration
        try {
            await transporter.verify();
            console.log('✅ Brevo SMTP server is ready to send messages');
        } catch (error) {
            console.error('❌ Brevo SMTP configuration error:', error.message);
            console.error('❌ Error details:', {
                code: error.code,
                command: error.command,
                response: error.response,
                responseCode: error.responseCode
            });
            console.log('⚠️ Brevo verification failed, trying Gmail fallback...');
            transporter = null;
            emailProvider = null;
        }
    }

    // Fallback to Gmail if Brevo not configured or failed
    if (!transporter && process.env.EMAIL_USER && (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS)) {
        console.log('✅ Using Gmail as fallback...');
        const gmailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
        // Remove spaces from Gmail App Password if present
        const cleanPass = gmailPass ? gmailPass.replace(/\s/g, '') : gmailPass;

        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: cleanPass
            }
        });
        emailProvider = 'gmail';

        // Verify transporter configuration
        try {
            await transporter.verify();
            console.log('✅ Gmail SMTP server is ready to send messages');
        } catch (error) {
            console.error('❌ Gmail SMTP configuration error:', error.message);
            console.error('❌ Error details:', {
                code: error.code,
                command: error.command,
                response: error.response,
                responseCode: error.responseCode
            });
            console.log('⚠️ Email service disabled - check Gmail credentials');
            console.log('⚠️ Make sure you are using an App Password, not your regular Gmail password');
            transporter = null;
            emailProvider = null;
        }
    }

    if (!transporter) {
        console.log('❌ Email service disabled - no working credentials found');
        console.log('🔍 Checked for: BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD/EMAIL_PASS');
    }
}

// Initialize transporter on module load
initializeTransporter().catch(err => {
    console.error('❌ Error initializing email transporter:', err);
});

// Function to send welcome email
const sendWelcomeEmail = async(email, fullName) => {
    try {
        // Re-initialize transporter if it's null
        if (!transporter) {
            console.log('⚠️ Transporter is null, attempting to re-initialize...');
            await initializeTransporter();
        }

        if (!transporter) {
            console.log('Email service not available - skipping welcome email to:', email);
            return;
        }

        console.log('Attempting to send welcome email to:', email);

        // Determine FROM address - use verified sender email
        // For Brevo, use a verified sender email (not the SMTP user)
        // For Gmail, use the EMAIL_USER
        let fromAddress;
        if (emailProvider === 'brevo') {
            // Brevo requires a verified sender email - try to extract from SMTP user or use a default
            // The SMTP user is typically like "username@smtp-brevo.com", but we need a real email
            fromAddress = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        } else {
            fromAddress = process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        }

        const mailOptions = {
            from: fromAddress,
            to: email,
            subject: 'Welcome to Mauricio\'s Cafe and Bakery - Your Journey Begins! 🎉',
            html: `
                <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
          <!-- Header with Logo -->
          <div style="text-align: center; padding: 20px 0; background-color: #a87437; border-radius: 8px 8px 0 0;">
            <div style="margin-bottom: 15px;">
              <img src="https://your-domain.com/images/mau-removebg-preview.png" alt="Mauricio's Cafe and Bakery Logo" style="height: 60px; width: 60px; object-fit: contain;" />
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Our Restaurant!</h1>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">We're absolutely thrilled to welcome you to Mauricio's Cafe and Bakery family! ☕</p>

            <!-- Features Section -->
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #a87437; margin-top: 0;">Your Account Benefits</h2>
              <ul style="list-style-type: none; padding: 0;">
                <li style="margin: 15px 0; padding-left: 25px; position: relative;">
                  <span style="color: #a87437; position: absolute; left: 0;">✓</span>
                  <strong>QR Code Menu Access</strong> - Scan table QR codes for instant menu access
                </li>
                <li style="margin: 15px 0; padding-left: 25px; position: relative;">
                  <span style="color: #a87437; position: absolute; left: 0;">✓</span>
                  <strong>AI-Powered Recommendations</strong> - Get personalized drink suggestions
                </li>
                <li style="margin: 15px 0; padding-left: 25px; position: relative;">
                  <span style="color: #a87437; position: absolute; left: 0;">✓</span>
                  <strong>Loyalty Rewards</strong> - Earn points with every purchase
                </li>
                <li style="margin: 15px 0; padding-left: 25px; position: relative;">
                  <span style="color: #a87437; position: absolute; left: 0;">✓</span>
                  <strong>Real-time Order Tracking</strong> - Track your order status live
                </li>
              </ul>
            </div>


            <!-- Contact Information -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">Need help? We're here for you!</p>
              <p style="color: #666; font-size: 14px;">
                📞 Phone: (0917) 503-9974<br>
                ✉️ Email: maurioscb23@gmail.com<br>
                📍 Address: 98 Poblacion west, Alitagtag, Philippines, 4205
              </p>
            </div>
          </div>

          <!-- Social Media -->
          <div style="text-align: center; padding: 20px; color: #666; font-size: 14px; border-top: 1px solid #eee;">
            <p style="margin-bottom: 15px;">Follow us on social media for updates and special offers:</p>
            <div style="margin-bottom: 20px;">
              <a href="https://www.facebook.com/share/1JzrLtpuwg/?mibextid=wwXIfr" style="display: inline-block; background-color: #a87437; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Facebook</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee;">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© 2024 Mauricio's Cafe and Bakery. All rights reserved.</p>
          </div>
        </div>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
        });
    } catch (error) {
        console.error('Error sending welcome email:', error.message);
        // Don't throw error - just log it so it doesn't crash the application
    }
};

// Function to send reset password email
const sendResetPasswordEmail = async(email, fullName, resetLink) => {
    try {
        // Re-initialize transporter if it's null
        if (!transporter) {
            console.log('⚠️ Transporter is null, attempting to re-initialize...');
            await initializeTransporter();
        }

        if (!transporter) {
            console.error('❌ Email service not available - transporter is null');
            console.error('❌ Skipping password reset email to:', email);
            console.error('❌ Please check your email configuration (BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD)');
            throw new Error('Email service not configured. Please set BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD environment variables.');
        }

        // Determine FROM address - use verified sender email
        let fromAddress;
        if (emailProvider === 'brevo') {
            fromAddress = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        } else {
            fromAddress = process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        }

        const mailOptions = {
            from: fromAddress,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                  <div style="text-align: center; padding: 20px 0; background-color: #8B4513; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset Request</h1>
                  </div>
                  <div style="padding: 30px 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${fullName},</p>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to reset it. This link will expire in 1 hour.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" 
                         style="display: inline-block; background-color: #8B4513; color: white; padding: 15px 30px; 
                                border-radius: 6px; text-decoration: none; font-size: 18px; font-weight: bold;">
                        Reset Password
                      </a>
                    </div>
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                      If the button doesn't work, you can also copy and paste this link into your browser:<br>
                      <a href="${resetLink}" style="color: #8B4513; word-break: break-all;">${resetLink}</a>
                    </p>
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">If you did not request a password reset, you can safely ignore this email.</p>
                  </div>
                  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee;">
                    <p>This is an automated message, please do not reply to this email.</p>
                    <p>© 2024 Mauricio's Cafe and Bakery. All rights reserved.</p>
                  </div>
                </div>
            `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset email sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
            to: email
        });
    } catch (error) {
        console.error('❌ Error sending reset password email:', error.message);
        console.error('❌ Error details:', error);
        // Re-throw error so caller can handle it
        throw error;
    }
};

/**
 * Send a low-stock alert email
 * @param {string} to - Recipient email address
 * @param {Array} items - Array of low-stock inventory items
 */
async function sendLowStockAlert(to, items) {
    try {
        // Re-initialize transporter if it's null
        if (!transporter) {
            console.log('⚠️ Transporter is null, attempting to re-initialize...');
            await initializeTransporter();
        }

        if (!transporter) {
            console.error('❌ Email service not available - transporter is null');
            console.error('❌ Skipping low stock alert to:', to);
            console.error('❌ Please check your email configuration (BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD)');
            throw new Error('Email service not configured. Please set BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD environment variables.');
        }

        const itemList = items.map(item => `${item.name} (${item.quantity} ${item.unit})`).join('<br>');
        // Determine FROM address - use verified sender email
        let fromAddress;
        if (emailProvider === 'brevo') {
            fromAddress = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        } else {
            fromAddress = process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        }
        const mailOptions = {
            from: fromAddress,
            to,
            subject: 'Low Stock Alert',
            html: `<h3>Low Stock Alert</h3><p>The following items are low in stock:</p><p>${itemList}</p>`
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending low stock alert:', error.message);
    }
}

/**
 * Send event status email to customer
 * @param {string} to - Customer email
 * @param {string} status - 'accepted' or 'rejected'
 * @param {object} event - Event details
 */
async function sendEventStatusEmail(to, status, event) {
    try {
        // Re-initialize transporter if it's null
        if (!transporter) {
            console.log('⚠️ Transporter is null, attempting to re-initialize...');
            await initializeTransporter();
        }

        if (!transporter) {
            console.log('Email service not available - skipping event status email');
            return;
        }

        const subject = `Your Coffee Shop Event Request has been ${status}`;
        const statusText = status === 'accepted' ? 'accepted' : 'rejected';
        const html = `
            <h2>Event Request ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</h2>
            <p>Dear Customer,</p>
            <p>Your event request for <b>${event.event_date}</b> at <b>${event.address}</b> for <b>${event.cups}</b> cups of coffee has been <b>${statusText}</b> by the admin.</p>
            <p>Contact Number: ${event.contact_number}</p>
            ${status === 'accepted' ? '<p><b>You will be contacted for further details regarding your event.</b></p>' : ''}
            <p>Thank you for choosing our Coffee Shop!</p>
        `;
        // Determine FROM address - use verified sender email
        let fromAddress;
        if (emailProvider === 'brevo') {
            fromAddress = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        } else {
            fromAddress = process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        }
        await transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            html,
        });
    } catch (error) {
        console.error('Error sending event status email:', error.message);
    }
}

/**
 * Generic email sending function
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 */
async function sendEmail(options) {
    try {
        // Re-initialize transporter if it's null (in case verification failed initially)
        if (!transporter) {
            console.log('⚠️ Transporter is null, attempting to re-initialize...');
            await initializeTransporter();
        }

        if (!transporter) {
            console.error('❌ Email service not available - transporter is null');
            console.error('❌ Skipping email to:', options.to);
            console.error('❌ Please check your email configuration (BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD)');
            throw new Error('Email service not configured. Please set BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD environment variables.');
        }

        // Determine FROM address - use verified sender email
        let fromAddress;
        if (emailProvider === 'brevo') {
            fromAddress = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        } else {
            fromAddress = process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        }
        const mailOptions = {
            from: fromAddress,
            to: options.to,
            subject: options.subject,
            html: options.html
        };

        console.log('📧 Attempting to send email:', {
            from: fromAddress,
            to: options.to,
            subject: options.subject
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
            to: options.to
        });
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        console.error('❌ Error details:', {
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
            stack: error.stack
        });
        throw error;
    }
}

// Function to send email verification
const sendVerificationEmail = async(email, fullName, verificationUrl) => {
    try {
        // Re-initialize transporter if it's null
        if (!transporter) {
            console.log('⚠️ Transporter is null, attempting to re-initialize...');
            await initializeTransporter();
        }

        if (!transporter) {
            console.error('❌ Email service not available - transporter is null');
            console.error('❌ Skipping verification email to:', email);
            console.error('❌ Please check your email configuration (BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD)');
            throw new Error('Email service not configured. Please set BREVO_SMTP_USER/BREVO_SMTP_PASS or EMAIL_USER/EMAIL_PASSWORD environment variables.');
        }

        console.log('Attempting to send verification email to:', email);

        // Determine FROM address - use verified sender email
        let fromAddress;
        if (emailProvider === 'brevo') {
            fromAddress = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        } else {
            fromAddress = process.env.EMAIL_USER || 'noreply@mauricioscafe.com';
        }

        const mailOptions = {
            from: fromAddress,
            to: email,
            subject: 'Verify Your Email Address - Mauricio\'s Cafe and Bakery',
            html: `
                <div style="font-family: 'Poppins', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                    <!-- Header -->
                    <div style="text-align: center; padding: 20px 0; background-color: #8B4513; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email Address</h1>
                    </div>

                    <!-- Content -->
                    <div style="padding: 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
                        <h2 style="color: #8B4513; margin-top: 0;">Hello ${fullName}!</h2>
                        
                        <p style="color: #333; font-size: 16px; line-height: 1.6;">
                            Thank you for creating an account with us! To complete your registration and start enjoying our services, 
                            please verify your email address by clicking the button below:
                        </p>

                        <!-- Verification Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="display: inline-block; background-color: #8B4513; color: white; padding: 15px 30px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                                Verify Email Address
                            </a>
                        </div>

                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            If the button doesn't work, you can also copy and paste this link into your browser:<br>
                            <a href="${verificationUrl}" style="color: #8B4513; word-break: break-all;">${verificationUrl}</a>
                        </p>

                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                            <p style="color: #856404; margin: 0; font-size: 14px;">
                                <strong>Important:</strong> This verification link will expire in 30 minutes. 
                                If you don't verify your email within this time, you'll need to request a new verification email.
                            </p>
                        </div>

                        <p style="color: #333; font-size: 14px;">
                            If you didn't create an account with us, please ignore this email.
                        </p>

                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        
                        <p style="color: #666; font-size: 12px; text-align: center;">
                            This email was sent by Mauricio's Cafe and Bakery. If you have any questions, please contact us.
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Verification email sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected,
            to: email
        });
    } catch (error) {
        console.error('❌ Error sending verification email:', error.message);
        console.error('❌ Error details:', {
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
            stack: error.stack
        });
        throw error;
    }
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendResetPasswordEmail,
    sendLowStockAlert,
    sendEventStatusEmail,
    sendVerificationEmail
};