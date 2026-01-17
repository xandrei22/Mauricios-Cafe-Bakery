const jwt = require('jsonwebtoken');

function ensureAuthenticated(req, res, next) {
    try {
        // ⭐ CRITICAL: Prioritize JWT token authentication (primary method)
        // Check Authorization: Bearer <token> header FIRST
        const authHeader = (req.headers && req.headers.authorization) || '';
        const parts = authHeader.split(' ');
        const hasBearer = parts.length === 2 && /^Bearer$/i.test(parts[0]);
        const token = hasBearer ? parts[1] : null;

        if (token) {
            try {
                const secret = process.env.JWT_SECRET || 'change-me-in-prod';
                const payload = jwt.verify(token, secret);
                req.user = payload;
                return next();
            } catch (verifyError) {
                // Token invalid or expired - log but continue to check sessions (for Google OAuth compatibility)
                console.warn('JWT verification failed:', verifyError.name);
            }
        }

        // Fallback: Accept passport or our manual session users (for Google OAuth only)
        // This is kept for backward compatibility with Google OAuth which uses sessions
        // Safely check session to avoid errors when session is undefined
        if ((req.isAuthenticated && req.isAuthenticated()) ||
            (req.session && (req.session.adminUser || req.session.staffUser || req.session.customerUser))) {
            return next();
        }
    } catch (e) {
        // If session is corrupted, clean up to avoid loops
        try { req.logout && req.logout(() => {}); } catch {}
        try { req.session && req.session.destroy(() => {}); } catch {}
    }

    const url = (req.originalUrl || req.url || req.path || '').toString();
    if (url.startsWith('/api/')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    return res.redirect('/login');
}

module.exports = {
    ensureAuthenticated
};