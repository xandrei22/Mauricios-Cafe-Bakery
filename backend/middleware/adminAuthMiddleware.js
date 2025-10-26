function ensureAdminAuthenticated(req, res, next) {
    console.log('ensureAdminAuthenticated: Session data:', {
        sessionID: req.sessionID,
        adminUser: req.session.adminUser,
        user: req.session.user,
        allSessionKeys: Object.keys(req.session || {})
    });

    // Check if admin user exists in session
    if (req.session.adminUser && req.session.adminUser.role === 'admin') {
        console.log('Admin authenticated successfully:', req.session.adminUser);
        return next();
    }

    // Check if staff user exists in session (allow staff to access orders too)
    if (req.session.user && (req.session.user.role === 'staff' || req.session.user.role === 'admin')) {
        console.log('Staff/Admin authenticated successfully:', req.session.user);
        return next();
    }

    console.log('No valid admin or staff session found');
    return res.status(401).json({
        message: 'Unauthorized: No admin or staff session',
        sessionInfo: {
            hasAdminUser: !!req.session.adminUser,
            hasUser: !!req.session.user,
            adminRole: req.session.adminUser && req.session.adminUser.role,
            userRole: req.session.user && req.session.user.role
        }
    });
}

module.exports = {
    ensureAdminAuthenticated
};