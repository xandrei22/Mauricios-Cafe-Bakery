const jwt = require('jsonwebtoken');

function ensureAuthenticated(req, res, next) {
    try {
        // Accept passport or our manual session users
        if ((req.isAuthenticated && req.isAuthenticated()) ||
            req.session.adminUser || req.session.staffUser || req.session.customerUser) {
            return next();
        }

        // Fallback: Accept Authorization: Bearer <token>
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
            } catch (_) {
                // invalid token -> fall through to 401/redirect below
            }
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