// Note: ensureAuthenticated removed - all routes now use authenticateJWT (JWT-only)
const { authorizeRoles } = require('../middleware/roleMiddleware');

function staffArea(req, res) {
    res.send('Staff Area');
}

module.exports = {
    staffArea
};