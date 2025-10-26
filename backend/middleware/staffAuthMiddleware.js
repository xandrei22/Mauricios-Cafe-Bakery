function ensureStaffAuthenticated(req, res, next) {
    // Check specifically for staff authentication
    if (req.session.staffUser && (req.session.staffUser.role === 'staff' || req.session.staffUser.role === 'admin')) {
        return next();
    }

    // For API routes, return JSON error instead of redirect
    // Use originalUrl to reliably detect API prefix when router is mounted (req.path is relative)
    const isApiRequest = (req.originalUrl && req.originalUrl.startsWith('/api/'));
    if (isApiRequest) {
        return res.status(401).json({
            success: false,
            error: 'Staff authentication required'
        });
    }

    res.redirect('/staff/login');
}

module.exports = {
    ensureStaffAuthenticated
};