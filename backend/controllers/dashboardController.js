const { ensureAuthenticated } = require('../middleware/authMiddleware');

function dashboard(req, res) {
    res.send(`Hello ${req.user.name}, Role: ${req.user.role}`);
}

module.exports = {
    dashboard
};