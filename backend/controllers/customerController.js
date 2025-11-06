const { ensureAuthenticated } = require('../middleware/authMiddleware');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendWelcomeEmail, sendResetPasswordEmail } = require('../utils/emailService');
const crypto = require('crypto');

// Customer login controller
async function login(req, res) {
    try {
        console.log('🔐 CUSTOMER LOGIN REQUEST RECEIVED');
        console.log('🔐 Request origin:', req.headers.origin);
        console.log('🔐 Request cookies:', req.headers.cookie || 'NONE');
        console.log('🔐 Request body received:', {
            email: req.body && typeof req.body.email !== 'undefined' ? '***' : 'MISSING',
            password: req.body && typeof req.body.password !== 'undefined' ? '***' : 'MISSING',
            hasTable: !!(req.body && req.body.table),
            hasRedirect: !!(req.body && req.body.redirect)
        });

        const { email, password, table, redirect } = req.body;

        // Find customer by email
        const [customers] = await db.query(
            'SELECT * FROM customers WHERE email = ?', [email]
        );

        if (customers.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const customer = customers[0];

        // If account is Google-only, prevent password login
        if (customer.password === 'GOOGLE_AUTH') {
            return res.status(403).json({ message: 'This account was created using Google sign-in. Please use "Sign in with Google" to log in.' });
        }

        // Compare password
        const isValidPassword = await bcrypt.compare(password, customer.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Email verification check disabled temporarily
        // if (!customer.email_verified) {
        //     return res.status(403).json({
        //         message: 'Please verify your email address before logging in. Check your email for the verification link.',
        //         requiresVerification: true
        //     });
        // }
        console.log('⚠️ Email verification check disabled - allowing login');

        // Set customer session with unique key
        req.session.customerUser = {
            id: customer.id,
            username: customer.username,
            email: customer.email,
            name: customer.full_name,
            role: 'customer'
        };

        // Optionally set a post-login redirect when coming from a QR/table link
        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
        let postLoginRedirect = undefined;
        if (redirect) {
            postLoginRedirect = `${frontendBase}${String(redirect).startsWith('/') ? '' : '/'}${redirect}`;
        } else if (table) {
            req.session.tableNumber = String(table);
            postLoginRedirect = `${frontendBase}/customer/dashboard?table=${encodeURIComponent(String(table))}`;
        }

        if (postLoginRedirect) {
            req.session.postLoginRedirect = postLoginRedirect;
        }

        // Persist the session cookie before responding (improves reliability on mobile browsers)
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ message: 'Error saving session' });
            }

            // Explicitly set cookie for mobile Safari - express-session might not be setting it
            const cookieValue = req.sessionID;
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none',
                maxAge: 1000 * 60 * 60 * 24, // 24 hours
                path: '/'
            };

            // NEVER set domain for cross-origin cookies - mobile Safari rejects them
            // Even if COOKIE_DOMAIN is set, don't use it for mobile Safari compatibility

            res.cookie('connect.sid', cookieValue, cookieOptions);

            // Log session and cookie info for debugging
            try {
                // Get ALL set-cookie headers (res.cookie adds to array)
                const setCookieHeaders = res.getHeader('set-cookie') || [];
                const setCookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

                console.log('🔒 Login Set-Cookie headers:', setCookieArray);
                console.log('🔒 Number of Set-Cookie headers:', setCookieArray.length);
                console.log('🔒 Session ID:', req.sessionID);
                console.log('🔒 Session customerUser set:', !!req.session.customerUser);
                console.log('🔒 Cookie secure:', process.env.NODE_ENV === 'production');
                console.log('🔒 Cookie sameSite: none');
                console.log('🔒 Response headers before sending:', {
                    'Access-Control-Allow-Origin': res.getHeader('access-control-allow-origin'),
                    'Access-Control-Allow-Credentials': res.getHeader('access-control-allow-credentials'),
                    'Set-Cookie': setCookieArray.length
                });
            } catch (logErr) {
                console.error('Error logging cookie info:', logErr);
            }

            // Ensure response headers allow cookie setting
            res.setHeader('Access-Control-Allow-Credentials', 'true');

            // Issue JWT for clients that prefer localStorage (iOS Safari compatibility)
            let token = null;
            try {
                const secret = process.env.JWT_SECRET || 'change-me-in-prod';
                token = jwt.sign({
                    id: customer.id,
                    username: customer.username,
                    email: customer.email,
                    name: customer.full_name,
                    role: 'customer'
                }, secret, { expiresIn: '1d' });
            } catch (signErr) {
                console.error('Error signing JWT:', signErr);
            }

            res.json({
                success: true,
                user: {
                    id: customer.id,
                    username: customer.username,
                    email: customer.email,
                    name: customer.full_name,
                    role: 'customer'
                },
                redirect: postLoginRedirect || null,
                token: token
            });
        });

    } catch (error) {
        console.error('Customer login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
}

// Customer session check controller
function checkSession(req, res) {
    console.log('Session check - req.session:', req.session);
    console.log('Session check - req.session.customerUser:', req.session.customerUser);
    if (req.session.customerUser && req.session.customerUser.role === 'customer') {
        console.log('Session check - returning authenticated user:', req.session.customerUser);
        res.json({ authenticated: true, user: req.session.customerUser });
    } else {
        // Fallback: validate Bearer token for clients using localStorage (iOS Safari cookie workaround)
        try {
            // Check both lowercase and uppercase header (Express normalizes to lowercase, but be safe)
            const authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
            console.log('🔑 Session check - Authorization header:', authHeader ? 'PRESENT' : 'MISSING', authHeader ? authHeader.substring(0, 30) + '...' : '');
            console.log('🔑 Session check - All headers keys:', Object.keys(req.headers || {}).filter(k => k.toLowerCase().includes('auth')));

            if (authHeader) {
                const parts = authHeader.split(' ');
                const hasBearer = parts.length === 2 && /^Bearer$/i.test(parts[0]);
                const token = hasBearer ? parts[1] : null;
                console.log('🔑 Session check - Token extracted:', token ? 'YES' : 'NO', token ? `(${token.substring(0, 20)}...)` : '');

                if (token) {
                    const secret = process.env.JWT_SECRET || 'change-me-in-prod';
                    try {
                        const payload = jwt.verify(token, secret);
                        console.log('🔑 Session check - JWT verified successfully, user:', payload.email || payload.id);
                        // Return payload with same structure as session user
                        return res.json({
                            authenticated: true,
                            user: {
                                id: payload.id,
                                username: payload.username,
                                email: payload.email,
                                name: payload.name,
                                role: payload.role || 'customer'
                            }
                        });
                    } catch (verifyErr) {
                        console.log('🔑 Session check - JWT verification failed:', verifyErr.message);
                        console.log('🔑 Session check - Token might be expired or invalid');
                        // Continue to fall through to unauthenticated
                    }
                }
            }
        } catch (e) {
            console.log('🔑 Session check - Error processing Authorization header:', e.message);
            // ignore and fall through to unauthenticated
        }
        console.log('Session check - not authenticated');
        res.json({ authenticated: false });
    }
}

// Customer logout controller
function logout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        try {
            res.clearCookie('connect.sid', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'none'
            });
        } catch (_) {}
        res.json({ message: 'Logged out successfully' });
    });
}

// Customer signup controller
async function signup(req, res) {
    try {
        const { username, password, email, fullName } = req.body;

        // Validate required fields
        if (!username || !password || !email || !fullName) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if username or email already exists
        const [existingUsers] = await db.query(
            'SELECT * FROM customers WHERE username = ? OR email = ?', [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new customer WITHOUT email verification (disabled temporarily)
        const [result] = await db.query(
            'INSERT INTO customers (username, password, email, full_name, email_verified, created_at) VALUES (?, ?, ?, ?, TRUE, NOW())', [username, hashedPassword, email, fullName]
        );

        console.log('✅ Customer account created (email verification disabled)');

        res.status(201).json({
            success: true,
            message: 'Account created successfully. You can now log in.',
            customerId: result.insertId,
            requiresVerification: false
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating account' });
    }
}

// Forgot Password controller
async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    try {
        // Find customer by email
        const [customers] = await db.query('SELECT * FROM customers WHERE email = ?', [email]);
        if (customers.length === 0) {
            // For security, do not reveal if email is not registered
            return res.json({ message: 'If that email is registered, a reset link has been sent.' });
        }
        const customer = customers[0];
        // If account is Google-only, do not allow password reset
        if (customer.password === 'GOOGLE_AUTH') {
            return res.json({ code: 'GOOGLE_SIGNIN', message: 'This account was created using Google sign-in. Please use "Sign in with Google" to access your account.' });
        }
        // If last_password_reset is within 3 days, block reset
        if (customer.last_password_reset && new Date(customer.last_password_reset) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)) {
            return res.json({ code: 'COOLDOWN', message: 'You have recently changed your password. Please wait 3 days before requesting another reset.' });
        }
        // Handle rate limiting: 3 requests per 24 hours
        const now = new Date();
        let resetCount = customer.reset_request_count || 0;
        let windowStart = customer.reset_request_window ? new Date(customer.reset_request_window) : null;
        if (!windowStart || windowStart < now) {
            // New window
            resetCount = 0;
            windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        }
        if (resetCount >= 3) {
            return res.json({ code: 'RATE_LIMIT', message: 'You have reached the maximum number of reset requests. Please try again later.' });
        }
        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        // Save token, expiry, and update request count/window
        await db.query('UPDATE customers SET reset_password_token = ?, reset_password_expires = ?, reset_request_count = ?, reset_request_window = ? WHERE id = ?', [token, expires, resetCount + 1, windowStart, customer.id]);
        // Send reset email
        const resetLink = `http://localhost:5173/reset-password/${token}`;
        await sendResetPasswordEmail(email, customer.full_name || customer.name || customer.username, resetLink);
        // Specific message for registered accounts
        return res.json({ message: 'A reset link has been sent to your registered email address.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error processing request' });
    }
}

// Reset Password controller
async function resetPassword(req, res) {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
    try {
        // Find customer by token and check expiry
        const [customers] = await db.query('SELECT * FROM customers WHERE reset_password_token = ? AND reset_password_expires > NOW()', [token]);
        if (customers.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        const customer = customers[0];

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check password history (prevent reuse of last 5 passwords)
        const [passwordHistory] = await db.query(`
            SELECT password_hash FROM customer_password_history 
            WHERE customer_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
        `, [customer.id]);

        for (const historyEntry of passwordHistory) {
            const isReusedPassword = await bcrypt.compare(password, historyEntry.password_hash);
            if (isReusedPassword) {
                return res.status(400).json({
                    message: 'New password cannot be the same as any of your previous 5 passwords'
                });
            }
        }

        // Update password, clear token, and set last_password_reset
        await db.query('UPDATE customers SET password = ?, reset_password_token = NULL, reset_password_expires = NULL, last_password_reset = NOW() WHERE id = ?', [hashedPassword, customer.id]);

        // Save current password to history
        await db.query(`
            INSERT INTO customer_password_history (customer_id, password_hash)
            VALUES (?, ?)
        `, [customer.id, customer.password]);
        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
}

// Email verification controller
async function verifyEmail(req, res) {
    try {
        console.log('🔍 Email verification endpoint hit');
        console.log('🔍 Request body:', req.body);
        console.log('🔍 Request headers:', req.headers);

        const { token } = req.body;
        console.log('🔍 Email verification request received for token:', token);

        if (!token) {
            console.log('❌ No token provided');
            return res.status(400).json({ message: 'Verification token is required' });
        }

        // Test database connection first
        try {
            const [testResult] = await db.query('SELECT 1 as test');
            console.log('🔍 Database connection test:', testResult);
        } catch (dbError) {
            console.error('❌ Database connection error:', dbError);
            return res.status(500).json({ message: 'Database connection error' });
        }

        // Check table structure first
        try {
            const [tableInfo] = await db.query('DESCRIBE customers');
            console.log('🔍 Customers table structure:', tableInfo);
        } catch (tableError) {
            console.error('❌ Error checking table structure:', tableError);
        }

        // Find customer with this token (including already verified ones)
        console.log('🔍 Executing database query for token:', token);
        const [customers] = await db.query(
            'SELECT * FROM customers WHERE verification_token = ?', [token]
        );

        console.log('🔍 Found customers with token:', customers.length);
        console.log('🔍 Customer data:', customers);

        if (customers.length === 0) {
            console.log('❌ No customer found with this token');
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        const customer = customers[0];
        console.log('✅ Found customer:', { id: customer.id, email: customer.email, name: customer.full_name, verified: customer.email_verified });

        // Check if already verified
        if (customer.email_verified) {
            console.log('✅ Customer already verified');
            return res.json({
                message: 'Email already verified! You can now log in.',
                success: true
            });
        }

        // Check if token has expired
        if (customer.verification_expires && new Date(customer.verification_expires) < new Date()) {
            console.log('❌ Verification token has expired');
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        // Update customer to verified
        await db.query(
            'UPDATE customers SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = ?', [customer.id]
        );

        console.log('✅ Customer email verified successfully');

        // Award welcome points if enabled (since they're now verified)
        try {
            const { awardWelcomePoints } = require('../utils/welcomePointsService');
            const welcomeResult = await awardWelcomePoints(customer.id, customer.email, customer.full_name);
            console.log('Welcome points result:', welcomeResult);
        } catch (welcomeError) {
            console.log('Welcome points service not available, skipping:', welcomeError.message);
        }

        // Send welcome email now that they're verified
        try {
            await sendWelcomeEmail(customer.email, customer.full_name);
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
        }

        console.log('✅ Sending success response');
        res.json({
            message: 'Email verified successfully! You can now log in.',
            success: true
        });

    } catch (error) {
        console.error('❌ Email verification error:', error);
        res.status(500).json({ message: 'Error verifying email' });
    }
}

// Resend verification email
async function resendVerification(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find customer
        const [customers] = await db.query(
            'SELECT * FROM customers WHERE email = ?', [email]
        );

        if (customers.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        const customer = customers[0];

        // Check if already verified
        if (customer.email_verified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Check resend attempt limits
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

        // Get resend attempts in the last minute
        const [recentAttempts] = await db.query(
            'SELECT COUNT(*) as attempt_count FROM verification_resend_logs WHERE customer_id = ? AND created_at > ?', [customer.id, oneMinuteAgo]
        );

        const attemptCount = recentAttempts[0].attempt_count;

        // Check if exceeded 3 attempts in the last minute
        if (attemptCount >= 3) {
            return res.status(429).json({
                message: 'Too many verification email requests. Please wait 1 minute before trying again.',
                cooldown: true,
                remainingTime: 60
            });
        }

        // Check if last resend was less than 1 minute ago
        const [lastAttempt] = await db.query(
            'SELECT created_at FROM verification_resend_logs WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1', [customer.id]
        );

        if (lastAttempt.length > 0) {
            const lastAttemptTime = new Date(lastAttempt[0].created_at);
            const timeSinceLastAttempt = now.getTime() - lastAttemptTime.getTime();
            const remainingCooldown = Math.max(0, 60000 - timeSinceLastAttempt); // 1 minute in milliseconds

            if (remainingCooldown > 0) {
                return res.status(429).json({
                    message: `Please wait ${Math.ceil(remainingCooldown / 1000)} seconds before requesting another verification email.`,
                    cooldown: true,
                    remainingTime: Math.ceil(remainingCooldown / 1000)
                });
            }
        }

        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // Update customer with new token
        await db.query(
            'UPDATE customers SET verification_token = ?, verification_expires = ? WHERE id = ?', [verificationToken, verificationExpires, customer.id]
        );

        // Log the resend attempt
        await db.query(
            'INSERT INTO verification_resend_logs (customer_id, created_at) VALUES (?, NOW())', [customer.id]
        );

        // Send verification email
        try {
            const { sendVerificationEmail } = require('../utils/emailService');
            const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer/verify-email?token=${verificationToken}`;
            await sendVerificationEmail(email, customer.full_name, verificationUrl);
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            return res.status(500).json({ message: 'Error sending verification email' });
        }

        res.json({
            message: 'Verification email sent successfully',
            success: true,
            attemptsRemaining: 3 - (attemptCount + 1)
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ message: 'Error resending verification email' });
    }
}

module.exports = {
    login,
    checkSession,
    logout,
    signup,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification
};