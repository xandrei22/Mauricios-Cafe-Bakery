function authorizeRoles(...roles) {
    return (req, res, next) => {
        console.log('authorizeRoles: req.session.user:', req.session.user);
        if (!req.session.user) {
            return res.status(401).json({ message: 'Unauthorized: No session user' });
        }

        if (!roles.includes(req.session.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient role' });
        }

        next();
    };
}

module.exports = {
    authorizeRoles
};