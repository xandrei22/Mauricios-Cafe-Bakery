// Note: ensureAuthenticated removed - all routes now use authenticateJWT (JWT-only)

function dashboard(req, res) {
    res.send(`Hello ${req.user.name}, Role: ${req.user.role}`);
}

module.exports = {
    dashboard
};