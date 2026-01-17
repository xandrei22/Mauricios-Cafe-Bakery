function ensureStaffAuthenticated(req, res, next) {
    // JWT-based staff/admin authentication
    try {
        const authHeader = (req.headers && req.headers.authorization) || '';
        const parts = authHeader.split(' ');
        const hasBearer = parts.length === 2 && /^Bearer$/i.test(parts[0]);
        const token = hasBearer ? parts[1] : null;
        if (token) {
            const jwt = require('jsonwebtoken');
            const secret = process.env.JWT_SECRET || 'change-me-in-prod';
            const payload = jwt.verify(token, secret);
            if (payload && (payload.role === 'staff' || payload.role === 'admin')) {
                req.user = payload;
                return next();
            }
        }
    } catch (_) {}
    return res.status(401).json({ success: false, error: 'Staff authentication required' });
}

module.exports = {
    ensureStaffAuthenticated
};