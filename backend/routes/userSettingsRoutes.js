const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendEmail } = require('../utils/emailService');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { ensureAdminAuthenticated } = require('../middleware/adminAuthMiddleware');

// ===== CUSTOMER SETTINGS ROUTES =====

// Get customer settings
router.get('/customer/settings', ensureAuthenticated, async(req, res) => {
    try {
        const customerId = req.session.customerUser && req.session.customerUser.id;

        const [customer] = await db.query(`
            SELECT id, email, username, created_at, last_username_change
            FROM customers WHERE id = ?
        `, [customerId]);

        if (customer.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const customerData = customer[0];

        // Check if username change is allowed (7-day cooldown)
        const canChangeUsername = !customerData.last_username_change ||
            (new Date() - new Date(customerData.last_username_change)) > (7 * 24 * 60 * 60 * 1000);

        res.json({
            success: true,
            settings: {
                email: customerData.email,
                username: customerData.username,
                canChangeUsername,
                lastUsernameChange: customerData.last_username_change
            }
        });

    } catch (error) {
        console.error('Error fetching customer settings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
});

// Update customer username (with 7-day cooldown)
router.put('/customer/username', ensureAuthenticated, async(req, res) => {
    try {
        const { newUsername, currentPassword } = req.body;
        const customerId = req.session.customerUser && req.session.customerUser.id;

        if (!newUsername || !currentPassword) {
            return res.status(400).json({ success: false, error: 'New username and current password are required' });
        }

        // Get customer data
        const [customer] = await db.query(`
            SELECT username, password, last_username_change 
            FROM customers WHERE id = ?
        `, [customerId]);

        if (customer.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const customerData = customer[0];

        // Check current password
        const isValidPassword = await bcrypt.compare(currentPassword, customerData.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Check 7-day cooldown
        if (customerData.last_username_change) {
            const daysSinceLastChange = (new Date() - new Date(customerData.last_username_change)) / (24 * 60 * 60 * 1000);
            if (daysSinceLastChange < 7) {
                const remainingDays = Math.ceil(7 - daysSinceLastChange);
                return res.status(400).json({
                    success: false,
                    error: `Username can only be changed once every 7 days. Please wait ${remainingDays} more days.`
                });
            }
        }

        // Check if username is already taken
        const [existingUser] = await db.query(`
            SELECT id FROM customers WHERE username = ? AND id != ?
        `, [newUsername, customerId]);

        if (existingUser.length > 0) {
            return res.status(400).json({ success: false, error: 'Username is already taken' });
        }

        // Update username
        await db.query(`
            UPDATE customers 
            SET username = ?, last_username_change = NOW() 
            WHERE id = ?
        `, [newUsername, customerId]);

        // Send email notification
        const [customerEmail] = await db.query('SELECT email FROM customers WHERE id = ?', [customerId]);
        if (customerEmail.length > 0) {
            await sendEmail({
                to: customerEmail[0].email,
                subject: 'Username Updated - Security Alert',
                html: `
                    <h2>Username Update Notification</h2>
                    <p>Your username has been successfully updated to: <strong>${newUsername}</strong></p>
                    <p>If you did not make this change, please contact support immediately.</p>
                    <p>This change was made on: ${new Date().toLocaleString()}</p>
                `
            });
        }

        res.json({ success: true, message: 'Username updated successfully' });

    } catch (error) {
        console.error('Error updating customer username:', error);
        res.status(500).json({ success: false, error: 'Failed to update username' });
    }
});

// Request customer password change
router.post('/customer/password/request', ensureAuthenticated, async(req, res) => {
    try {
        const customerId = req.session.customerUser && req.session.customerUser.id;

        // Get customer data with rate limiting fields
        const [customer] = await db.query(`
            SELECT email, last_password_change, password_change_request_count, password_change_request_window 
            FROM customers WHERE id = ?
        `, [customerId]);

        if (customer.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        const customerData = customer[0];

        // Check cooldown period (3 days)
        if (customerData.last_password_change && new Date(customerData.last_password_change) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
            return res.status(429).json({
                success: false,
                error: 'You have recently changed your password. Please wait 3 days before requesting another change.'
            });
        }

        // Handle rate limiting: 3 requests per 24 hours
        const now = new Date();
        let requestCount = customerData.password_change_request_count || 0;
        let windowStart = customerData.password_change_request_window ? new Date(customerData.password_change_request_window) : null;

        if (!windowStart || windowStart < now) {
            // New window
            requestCount = 0;
            windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        }

        if (requestCount >= 3) {
            return res.status(429).json({
                success: false,
                error: 'You have reached the maximum number of password change requests. Please try again later.'
            });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Save verification token and update request count
        await db.query(`
            UPDATE customers
            SET password_verification_token = ?, password_verification_expires = ?, 
                password_change_request_count = ?, password_change_request_window = ?
            WHERE id = ?
        `, [verificationToken, expiresAt, requestCount + 1, windowStart, customerId]);

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer/verify-password?token=${verificationToken}`;

        await sendEmail({
            to: customerData.email,
            subject: 'Password Change Request',
            html: `
                <h2>Password Change Request</h2>
                <p>You have requested to change your password.</p>
                <p>Click the link below to proceed with the password change:</p>
                <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Change Password
                </a>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not request this change, please ignore this email.</p>
            `
        });

        res.json({ success: true, message: 'Password change verification email sent' });

    } catch (error) {
        console.error('Error requesting customer password change:', error);
        res.status(500).json({ success: false, error: 'Failed to request password change' });
    }
});

// Verify and update customer password
router.post('/customer/password/verify', async(req, res) => {
    try {
        const { token, currentPassword, newPassword, confirmPassword } = req.body;

        if (!token || !currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, error: 'New passwords do not match' });
        }

        // Find customer with this token
        const [customer] = await db.query(`
            SELECT id, password, email, password_verification_expires
            FROM customers
            WHERE password_verification_token = ?
        `, [token]);

        if (customer.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid verification token' });
        }

        const customerData = customer[0];

        // Check if token is expired
        if (new Date() > new Date(customerData.password_verification_expires)) {
            return res.status(400).json({ success: false, error: 'Verification token has expired' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, customerData.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Check if new password is the same as current password
        const isSamePassword = await bcrypt.compare(newPassword, customerData.password);
        if (isSamePassword) {
            return res.status(400).json({ success: false, error: 'New password must be different from current password' });
        }

        // Check password history (prevent reuse of last 5 passwords)
        const [passwordHistory] = await db.query(`
            SELECT password_hash FROM customer_password_history 
            WHERE customer_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        `, [customerData.id]);

        for (const historyEntry of passwordHistory) {
            const isReusedPassword = await bcrypt.compare(newPassword, historyEntry.password_hash);
            if (isReusedPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'New password cannot be the same as any of your previous 5 passwords'
                });
            }
        }

        // Update password, clear token, and set last password change
        await db.query(`
            UPDATE customers
            SET password = ?, password_verification_token = NULL, password_verification_expires = NULL,
                last_password_change = NOW()
            WHERE id = ?
        `, [hashedPassword, customerData.id]);

        // Save current password to history
        await db.query(`
            INSERT INTO customer_password_history (customer_id, password_hash)
            VALUES (?, ?)
        `, [customerData.id, customerData.password]);

        // Send confirmation email
        await sendEmail({
            to: customerData.email,
            subject: 'Password Changed Successfully',
            html: `
                <h2>Password Change Confirmation</h2>
                <p>Your password has been successfully changed.</p>
                <p>If you did not make this change, please contact support immediately.</p>
                <p>This change was made on: ${new Date().toLocaleString()}</p>
            `
        });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Error verifying customer password change:', error);
        res.status(500).json({ success: false, error: 'Failed to update password' });
    }
});

// ===== STAFF SETTINGS ROUTES =====

// Get staff settings
router.get('/staff/settings', ensureAuthenticated, async(req, res) => {
    try {
        const staffId = req.session.staffUser && req.session.staffUser.id;

        const [staff] = await db.query(`
            SELECT id, email, username, role, status, created_at
            FROM users WHERE id = ? AND role = 'staff'
        `, [staffId]);

        if (staff.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff not found' });
        }

        const staffData = staff[0];

        res.json({
            success: true,
            settings: {
                email: staffData.email,
                username: staffData.username,
                role: staffData.role,
                status: staffData.status,
                canChangeEmail: false, // Staff cannot change email
                canChangeUsername: false // Staff cannot change username
            }
        });

    } catch (error) {
        console.error('Error fetching staff settings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
});

// Request staff password change
router.post('/staff/password/request', ensureAuthenticated, async(req, res) => {
    try {
        const staffId = req.session.staffUser && req.session.staffUser.id;

        // Get staff data with rate limiting fields
        const [staff] = await db.query(`
            SELECT email, last_password_change, password_change_request_count, password_change_request_window 
            FROM users WHERE id = ? AND role = "staff"
        `, [staffId]);

        if (staff.length === 0) {
            return res.status(404).json({ success: false, error: 'Staff not found' });
        }

        const staffData = staff[0];

        // Check cooldown period (3 days)
        if (staffData.last_password_change && new Date(staffData.last_password_change) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
            return res.status(429).json({
                success: false,
                error: 'You have recently changed your password. Please wait 3 days before requesting another change.'
            });
        }

        // Handle rate limiting: 3 requests per 24 hours
        const now = new Date();
        let requestCount = staffData.password_change_request_count || 0;
        let windowStart = staffData.password_change_request_window ? new Date(staffData.password_change_request_window) : null;

        if (!windowStart || windowStart < now) {
            // New window
            requestCount = 0;
            windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        }

        if (requestCount >= 3) {
            return res.status(429).json({
                success: false,
                error: 'You have reached the maximum number of password change requests. Please try again later.'
            });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Save verification token and update request count
        await db.query(`
            UPDATE users
            SET password_verification_token = ?, password_verification_expires = ?, 
                password_change_request_count = ?, password_change_request_window = ?
            WHERE id = ?
        `, [verificationToken, expiresAt, requestCount + 1, windowStart, staffId]);

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/staff/verify-password?token=${verificationToken}`;

        await sendEmail({
            to: staffData.email,
            subject: 'Password Change Request',
            html: `
                <h2>Password Change Request</h2>
                <p>You have requested to change your password.</p>
                <p>Click the link below to proceed with the password change:</p>
                <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Change Password
                </a>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not request this change, please ignore this email.</p>
            `
        });

        res.json({ success: true, message: 'Password change verification email sent' });

    } catch (error) {
        console.error('Error requesting staff password change:', error);
        res.status(500).json({ success: false, error: 'Failed to request password change' });
    }
});

// Verify and update staff password
router.post('/staff/password/verify', async(req, res) => {
    try {
        const { token, currentPassword, newPassword, confirmPassword } = req.body;

        if (!token || !currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, error: 'New passwords do not match' });
        }

        // Find staff with this token
        const [staff] = await db.query(`
            SELECT id, password, email, password_verification_expires
            FROM users
            WHERE password_verification_token = ? AND role = 'staff'
        `, [token]);

        if (staff.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid verification token' });
        }

        const staffData = staff[0];

        // Check if token is expired
        if (new Date() > new Date(staffData.password_verification_expires)) {
            return res.status(400).json({ success: false, error: 'Verification token has expired' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, staffData.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Check if new password is the same as current password
        const isSamePassword = await bcrypt.compare(newPassword, staffData.password);
        if (isSamePassword) {
            return res.status(400).json({ success: false, error: 'New password must be different from current password' });
        }

        // Check password history (prevent reuse of last 5 passwords)
        const [passwordHistory] = await db.query(`
            SELECT password_hash FROM staff_password_history 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        `, [staffData.id]);

        for (const historyEntry of passwordHistory) {
            const isReusedPassword = await bcrypt.compare(newPassword, historyEntry.password_hash);
            if (isReusedPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'New password cannot be the same as any of your previous 5 passwords'
                });
            }
        }

        // Update password, clear token, and set last password change
        await db.query(`
            UPDATE users
            SET password = ?, password_verification_token = NULL, password_verification_expires = NULL,
                last_password_change = NOW()
            WHERE id = ?
        `, [hashedPassword, staffData.id]);

        // Save current password to history
        await db.query(`
            INSERT INTO staff_password_history (user_id, password_hash)
            VALUES (?, ?)
        `, [staffData.id, staffData.password]);

        // Send confirmation email
        await sendEmail({
            to: staffData.email,
            subject: 'Password Changed Successfully',
            html: `
                <h2>Password Change Confirmation</h2>
                <p>Your password has been successfully changed.</p>
                <p>If you did not make this change, please contact support immediately.</p>
                <p>This change was made on: ${new Date().toLocaleString()}</p>
            `
        });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Error verifying staff password change:', error);
        res.status(500).json({ success: false, error: 'Failed to update password' });
    }
});

// ===== ADMIN SETTINGS ROUTES =====

// Get admin settings
router.get('/admin/settings', ensureAdminAuthenticated, async(req, res) => {
    try {
        const adminId = req.session.adminUser && req.session.adminUser.id;

        const [admin] = await db.query(`
            SELECT id, email, username, full_name, last_username_change
            FROM admin WHERE id = ?
        `, [adminId]);

        if (admin.length === 0) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }

        const adminData = admin[0];

        // Check if username change is allowed (3-day cooldown)
        const canChangeUsername = !adminData.last_username_change ||
            (new Date() - new Date(adminData.last_username_change)) > (3 * 24 * 60 * 60 * 1000);

        res.json({
            success: true,
            settings: {
                email: adminData.email,
                username: adminData.username,
                fullName: adminData.full_name,
                canChangeEmail: true,
                canChangeUsername,
                lastUsernameChange: adminData.last_username_change
            }
        });

    } catch (error) {
        console.error('Error fetching admin settings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
});

// Request admin email change
router.post('/admin/email/request', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { newEmail, currentPassword } = req.body;
        const adminId = req.session.adminUser && req.session.adminUser.id;

        if (!newEmail || !currentPassword) {
            return res.status(400).json({ success: false, error: 'New email and current password are required' });
        }

        // Get admin data
        const [admin] = await db.query('SELECT email, password FROM admin WHERE id = ?', [adminId]);
        if (admin.length === 0) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, admin[0].password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Check if email is already taken
        const [existingAdmin] = await db.query('SELECT id FROM admin WHERE email = ? AND id != ?', [newEmail, adminId]);
        if (existingAdmin.length > 0) {
            return res.status(400).json({ success: false, error: 'Email is already taken' });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Save pending email and token
        await db.query(`
            UPDATE admin 
            SET pending_email = ?, email_verification_token = ?, email_verification_expires = ?
            WHERE id = ?
        `, [newEmail, verificationToken, expiresAt, adminId]);

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/verify-email?token=${verificationToken}`;

        await sendEmail({
            to: newEmail,
            subject: 'Verify Your New Email Address',
            html: `
                <h2>Email Change Verification</h2>
                <p>You have requested to change your email address to: <strong>${newEmail}</strong></p>
                <p>Click the link below to verify this change:</p>
                <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Verify Email Change
                </a>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not request this change, please ignore this email.</p>
            `
        });

        res.json({ success: true, message: 'Verification email sent to new email address' });

    } catch (error) {
        console.error('Error requesting admin email change:', error);
        res.status(500).json({ success: false, error: 'Failed to request email change' });
    }
});

// Verify admin email change
router.post('/admin/email/verify', async(req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Verification token is required' });
        }

        // Find admin with this token
        const [admin] = await db.query(`
            SELECT id, pending_email, email_verification_expires 
            FROM admin 
            WHERE email_verification_token = ?
        `, [token]);

        if (admin.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid verification token' });
        }

        const adminData = admin[0];

        // Check if token is expired
        if (new Date() > new Date(adminData.email_verification_expires)) {
            return res.status(400).json({ success: false, error: 'Verification token has expired' });
        }

        // Update email
        await db.query(`
            UPDATE admin 
            SET email = ?, pending_email = NULL, email_verification_token = NULL, email_verification_expires = NULL
            WHERE id = ?
        `, [adminData.pending_email, adminData.id]);

        // Send confirmation email to old email
        const [oldEmail] = await db.query('SELECT email FROM admin WHERE id = ?', [adminData.id]);
        if (oldEmail.length > 0) {
            await sendEmail({
                to: oldEmail[0].email,
                subject: 'Email Address Changed',
                html: `
                    <h2>Email Address Updated</h2>
                    <p>Your email address has been successfully changed to: <strong>${adminData.pending_email}</strong></p>
                    <p>This change was made on: ${new Date().toLocaleString()}</p>
                `
            });
        }

        res.json({ success: true, message: 'Email address updated successfully' });

    } catch (error) {
        console.error('Error verifying admin email change:', error);
        res.status(500).json({ success: false, error: 'Failed to verify email change' });
    }
});

// Request admin username change
router.post('/admin/username/request', ensureAdminAuthenticated, async(req, res) => {
    try {
        const { newUsername, currentPassword } = req.body;
        const adminId = req.session.adminUser && req.session.adminUser.id;

        if (!newUsername || !currentPassword) {
            return res.status(400).json({ success: false, error: 'New username and current password are required' });
        }

        // Get admin data
        const [admin] = await db.query(`
            SELECT username, password, email, last_username_change 
            FROM admin WHERE id = ?
        `, [adminId]);

        if (admin.length === 0) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }

        const adminData = admin[0];

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, adminData.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Check 3-day cooldown
        if (adminData.last_username_change) {
            const daysSinceLastChange = (new Date() - new Date(adminData.last_username_change)) / (24 * 60 * 60 * 1000);
            if (daysSinceLastChange < 3) {
                const remainingDays = Math.ceil(3 - daysSinceLastChange);
                return res.status(400).json({
                    success: false,
                    error: `Username can only be changed once every 3 days. Please wait ${remainingDays} more days.`
                });
            }
        }

        // Check if username is already taken
        const [existingAdmin] = await db.query('SELECT id FROM admin WHERE username = ? AND id != ?', [newUsername, adminId]);
        if (existingAdmin.length > 0) {
            return res.status(400).json({ success: false, error: 'Username is already taken' });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Save pending username and token
        await db.query(`
            UPDATE admin 
            SET pending_username = ?, username_verification_token = ?, username_verification_expires = ?
            WHERE id = ?
        `, [newUsername, verificationToken, expiresAt, adminId]);

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/verify-username?token=${verificationToken}`;

        await sendEmail({
            to: adminData.email,
            subject: 'Verify Your New Username',
            html: `
                <h2>Username Change Verification</h2>
                <p>You have requested to change your username to: <strong>${newUsername}</strong></p>
                <p>Click the link below to verify this change:</p>
                <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Verify Username Change
                </a>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not request this change, please ignore this email.</p>
            `
        });

        res.json({ success: true, message: 'Verification email sent to your registered email' });

    } catch (error) {
        console.error('Error requesting admin username change:', error);
        res.status(500).json({ success: false, error: 'Failed to request username change' });
    }
});

// Verify admin username change
router.post('/admin/username/verify', async(req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'Verification token is required' });
        }

        // Find admin with this token
        const [admin] = await db.query(`
            SELECT id, pending_username, username_verification_expires, email
            FROM admin 
            WHERE username_verification_token = ?
        `, [token]);

        if (admin.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid verification token' });
        }

        const adminData = admin[0];

        // Check if token is expired
        if (new Date() > new Date(adminData.username_verification_expires)) {
            return res.status(400).json({ success: false, error: 'Verification token has expired' });
        }

        // Update username
        await db.query(`
            UPDATE admin 
            SET username = ?, pending_username = NULL, username_verification_token = NULL, 
                username_verification_expires = NULL, last_username_change = NOW()
            WHERE id = ?
        `, [adminData.pending_username, adminData.id]);

        // Send confirmation email
        await sendEmail({
            to: adminData.email,
            subject: 'Username Updated Successfully',
            html: `
                <h2>Username Update Confirmation</h2>
                <p>Your username has been successfully updated to: <strong>${adminData.pending_username}</strong></p>
                <p>This change was made on: ${new Date().toLocaleString()}</p>
                <p>You can now log in with your new username.</p>
            `
        });

        res.json({ success: true, message: 'Username updated successfully' });

    } catch (error) {
        console.error('Error verifying admin username change:', error);
        res.status(500).json({ success: false, error: 'Failed to verify username change' });
    }
});

// Request admin password change
router.post('/admin/password/request', ensureAdminAuthenticated, async(req, res) => {
    try {
        const adminId = req.session.adminUser && req.session.adminUser.id;

        // Get admin data with rate limiting fields
        const [admin] = await db.query(`
            SELECT email, last_password_change, password_change_request_count, password_change_request_window 
            FROM admin WHERE id = ?
        `, [adminId]);

        if (admin.length === 0) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }

        const adminData = admin[0];

        // Check cooldown period (3 days)
        if (adminData.last_password_change && new Date(adminData.last_password_change) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
            return res.status(429).json({
                success: false,
                error: 'You have recently changed your password. Please wait 3 days before requesting another change.'
            });
        }

        // Handle rate limiting: 3 requests per 24 hours
        const now = new Date();
        let requestCount = adminData.password_change_request_count || 0;
        let windowStart = adminData.password_change_request_window ? new Date(adminData.password_change_request_window) : null;

        if (!windowStart || windowStart < now) {
            // New window
            requestCount = 0;
            windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        }

        if (requestCount >= 3) {
            return res.status(429).json({
                success: false,
                error: 'You have reached the maximum number of password change requests. Please try again later.'
            });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Save verification token and update request count
        await db.query(`
            UPDATE admin
            SET password_verification_token = ?, password_verification_expires = ?, 
                password_change_request_count = ?, password_change_request_window = ?
            WHERE id = ?
        `, [verificationToken, expiresAt, requestCount + 1, windowStart, adminId]);

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/verify-password?token=${verificationToken}`;

        await sendEmail({
            to: adminData.email,
            subject: 'Password Change Request',
            html: `
                <h2>Password Change Request</h2>
                <p>You have requested to change your password.</p>
                <p>Click the link below to proceed with the password change:</p>
                <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Change Password
                </a>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not request this change, please ignore this email.</p>
            `
        });

        res.json({ success: true, message: 'Password change verification email sent' });

    } catch (error) {
        console.error('Error requesting admin password change:', error);
        res.status(500).json({ success: false, error: 'Failed to request password change' });
    }
});

// Verify and update admin password
router.post('/admin/password/verify', async(req, res) => {
    try {
        const { token, currentPassword, newPassword, confirmPassword } = req.body;

        if (!token || !currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, error: 'New passwords do not match' });
        }

        // Find admin with this token
        const [admin] = await db.query(`
            SELECT id, password, email, password_verification_expires
            FROM admin
            WHERE password_verification_token = ?
        `, [token]);

        if (admin.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid verification token' });
        }

        const adminData = admin[0];

        // Check if token is expired
        if (new Date() > new Date(adminData.password_verification_expires)) {
            return res.status(400).json({ success: false, error: 'Verification token has expired' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, adminData.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Check if new password is the same as current password
        const isSamePassword = await bcrypt.compare(newPassword, adminData.password);
        if (isSamePassword) {
            return res.status(400).json({ success: false, error: 'New password must be different from current password' });
        }

        // Check password history (prevent reuse of last 5 passwords)
        const [passwordHistory] = await db.query(`
            SELECT password_hash FROM admin_password_history 
            WHERE admin_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        `, [adminData.id]);

        for (const historyEntry of passwordHistory) {
            const isReusedPassword = await bcrypt.compare(newPassword, historyEntry.password_hash);
            if (isReusedPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'New password cannot be the same as any of your previous 5 passwords'
                });
            }
        }

        // Update password, clear token, and set last password change
        await db.query(`
            UPDATE admin
            SET password = ?, password_verification_token = NULL, password_verification_expires = NULL,
                last_password_change = NOW()
            WHERE id = ?
        `, [hashedPassword, adminData.id]);

        // Save current password to history
        await db.query(`
            INSERT INTO admin_password_history (admin_id, password_hash)
            VALUES (?, ?)
        `, [adminData.id, adminData.password]);

        // Send confirmation email
        await sendEmail({
            to: adminData.email,
            subject: 'Password Changed Successfully',
            html: `
                <h2>Password Change Confirmation</h2>
                <p>Your password has been successfully changed.</p>
                <p>If you did not make this change, please contact support immediately.</p>
                <p>This change was made on: ${new Date().toLocaleString()}</p>
            `
        });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Error verifying admin password change:', error);
        res.status(500).json({ success: false, error: 'Failed to update password' });
    }
});

module.exports = router;