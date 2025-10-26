const { ensureAuthenticated, authorizeRoles } = require('../middleware/middleware');

function home(req, res) {
    res.send('Welcome to CafeIQ');
}

function dashboard(req, res) {
    res.send(`Hello ${req.user.name}, Role: ${req.user.role}`);
}

module.exports = {
    home,
    dashboard
};