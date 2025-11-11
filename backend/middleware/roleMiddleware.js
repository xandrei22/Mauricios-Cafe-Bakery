function authorizeRoles(...roles) {
    return (req, res, next) => {
        // Safely check session to avoid errors when session is undefined
        const sessionUser = req.session && req.session.user;
        console.log('authorizeRoles: req.session.user:', sessionUser);
        
        if (!sessionUser) {
            return res.status(401).json({ message: 'Unauthorized: No session user' });
        }

        if (!roles.includes(sessionUser.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient role' });
        }

        next();
    };
}

module.exports = {
    authorizeRoles
};