const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const customerController = require('../controllers/customerController');
// Note: ensureAuthenticated removed - all routes now use authenticateJWT (JWT-only)
const { authenticateJWT } = require('../middleware/jwtAuth');
const passport = require('passport');

// Admin routes
router.post('/admin/login', adminController.login);
router.get('/admin/check-session', authenticateJWT, adminController.checkSession);
router.post('/admin/logout', adminController.logout);

// Staff routes (can be used by both admin and staff)
router.post('/staff/login', adminController.staffLogin);
router.get('/staff/check-session', authenticateJWT, adminController.checkStaffSession);
router.post('/staff/logout', adminController.staffLogout);
router.post('/staff/forgot-password', adminController.staffForgotPassword);
router.post('/staff/reset-password', adminController.staffResetPassword);

// Customer routes
router.post('/customer/signup', customerController.signup);
router.post('/customer/login', customerController.login);
router.get('/customer/check-session', authenticateJWT, customerController.checkSession);
router.post('/customer/logout', customerController.logout);

// Forgot password and reset password routes
router.post('/customer/forgot-password', customerController.forgotPassword);
router.post('/customer/reset-password', customerController.resetPassword);

// Email verification routes
router.post('/customer/verify-email', customerController.verifyEmail);
router.post('/customer/resend-verification', customerController.resendVerification);

// Google OAuth - Start authentication
// Preserve optional table and redirect params through session/state so we can
// send customers back to the right place after logging in from a QR link.
router.get('/auth/google', (req, res, next) => {
    try {
        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Check if Google OAuth is configured
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            console.error('Google OAuth not configured - missing credentials');
            return res.redirect(`${frontendBase}/login?error=GOOGLE_AUTH_NOT_CONFIGURED`);
        }

        const { redirect, table } = req.query;

        // Stash desired redirect in the session before starting OAuth
        if (redirect) {
            // Absolute or relative path support; only allow same-origin frontend
            req.session.postLoginRedirect = `${frontendBase}${String(redirect).startsWith('/') ? '' : '/'}${redirect}`;
        } else if (table) {
            // If table provided, send back to dashboard with table preserved
            req.session.postLoginRedirect = `${frontendBase}/customer/dashboard?table=${encodeURIComponent(String(table))}`;
        }

        // Also store table separately for potential downstream usage
        if (table) {
            req.session.tableNumber = String(table);
        }

        // Kick off Google auth and pass table in OAuth state for redundancy
        return passport.authenticate('google', {
            scope: ['profile', 'email'],
            state: table ? String(table) : undefined,
            failWithError: true // This makes passport return errors instead of redirecting
        })(req, res, next);
    } catch (err) {
        console.error('Error initializing Google OAuth:', err);
        return res.redirect((process.env.FRONTEND_URL || 'http://localhost:5173') + '/login?error=GOOGLE_AUTH_ERROR');
    }
});

// Google OAuth - Callback
router.get('/auth/google/callback', async(req, res, next) => {
    try {
        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';

        // Check if Google OAuth is configured
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            console.error('Google OAuth not configured - missing credentials');
            return res.redirect(`${frontendBase}/login?error=GOOGLE_AUTH_NOT_CONFIGURED`);
        }

        // Use Passport middleware
        passport.authenticate('google', {
            session: true
        }, (err, user, info) => {
            if (err) {
                // If the error is about email already registered, redirect with a message
                if (err.code === 'EMAIL_REGISTERED_PASSWORD') {
                    return res.redirect(`${frontendBase}/login?error=EMAIL_REGISTERED_PASSWORD`);
                }
                // For other errors, redirect with a generic error
                console.error('Google OAuth error:', err);
                return res.redirect(`${frontendBase}/login?error=GOOGLE_AUTH_ERROR`);
            }
            if (!user) {
                console.error('Google OAuth: No user returned');
                return res.redirect(`${frontendBase}/login?error=GOOGLE_AUTH_ERROR`);
            }
            // Check if email verification is required for Google OAuth users
            if (user.requiresVerification && !user.email_verified) {
                return res.redirect(`${frontendBase}/login?error=EMAIL_VERIFICATION_REQUIRED&message=Please verify your email address before logging in. Check your email for the verification link.`);
            }

            req.logIn(user, (loginErr) => {
                if (loginErr) {
                    console.error('Google login error:', loginErr);
                    return res.redirect(`${frontendBase}/login?error=GOOGLE_AUTH_ERROR`);
                }

                // Set customer session with correct key
                req.session.customerUser = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: 'customer'
                };

                console.log('Google OAuth successful - Session set:', req.session.customerUser);

                req.session.save(() => {
                    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
                    const isNew = user && user.isNewGoogleUser;
                    console.log('Redirecting user - isNew:', isNew);

                    // Prefer explicit redirect captured prior to OAuth
                    let redirectUrl = req.session.postLoginRedirect;

                    // Fallbacks: use OAuth state (table), or default dashboard
                    if (!redirectUrl) {
                        const oauthStateTable = req.query && req.query.state;
                        if (oauthStateTable) {
                            redirectUrl = `${frontendBase}/customer/dashboard?table=${encodeURIComponent(String(oauthStateTable))}`;
                        }
                    }

                    if (!redirectUrl) {
                        redirectUrl = isNew ? `${frontendBase}/customer/dashboard?google=new` : `${frontendBase}/customer/dashboard`;
                    }

                    // Cleanup transient session keys
                    delete req.session.postLoginRedirect;

                    res.redirect(redirectUrl);
                });
            });
        })(req, res, next);
    } catch (err) {
        console.error('Error in Google OAuth callback wrapper:', err);
        const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendBase}/login?error=GOOGLE_AUTH_ERROR`);
    }
});

// Error handling for routes
router.use((err, req, res, next) => {
    console.error('Route error:', err);
    res.status(500).json({ error: 'Route error occurred' });
});

module.exports = router;