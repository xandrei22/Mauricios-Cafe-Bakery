function ensureAdminAuthenticated(req, res, next) {
    // Accept JWT via Authorization header for admin/staff
    try {
        const authHeader = (req.headers && req.headers.authorization) || '';
        const parts = authHeader.split(' ');
        const hasBearer = parts.length === 2 && /^Bearer$/i.test(parts[0]);
        const token = hasBearer ? parts[1] : null;
        if (token) {
            const jwt = require('jsonwebtoken');
            const secret = process.env.JWT_SECRET || 'change-me-in-prod';
            const payload = jwt.verify(token, secret);
            if (payload && (payload.role === 'admin' || payload.role === 'staff')) {
                req.user = payload;
                return next();
            }
        }
    } catch (_) {}
    return res.status(401).json({ message: 'Unauthorized' });
}

module.exports = {
    ensureAdminAuthenticated
};