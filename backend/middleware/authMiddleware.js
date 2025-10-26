function ensureAuthenticated(req, res, next) {
    try {
        // Accept passport or our manual session users
        if ((req.isAuthenticated && req.isAuthenticated()) ||
            req.session.adminUser || req.session.staffUser || req.session.customerUser) {
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