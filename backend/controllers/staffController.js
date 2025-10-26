const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

function staffArea(req, res) {
    res.send('Staff Area');
}

module.exports = {
    staffArea
};