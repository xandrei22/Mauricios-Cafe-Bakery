const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const saltRounds = 10; // For bcrypt hashing
const { sendResetPasswordEmail } = require('../utils/emailService');
const crypto = require('crypto');

// Password reset policy
const RESET_TOKEN_MINUTES = 30; // token validity
const PASSWORD_COOLDOWN_DAYS = 3; // days between successful changes

async function ensurePasswordPolicyColumns() {
    // Ensure columns exist for cooldown tracking
    try {
        await db.query('ALTER TABLE admin ADD COLUMN last_password_change_at DATETIME NULL');
    } catch (err) {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            // ignore duplicate, rethrow others
            console.error('Error ensuring admin.last_password_change_at column:', err.code || err);
        }
    }
    try {
        await db.query('ALTER TABLE users ADD COLUMN last_password_change_at DATETIME NULL');
    } catch (err) {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error ensuring users.last_password_change_at column:', err.code || err);
        }
    }
}

function adminArea(req, res) {
    res.send('Welcome Admin');
}

// Admin login controller
async function login(req, res) {
    try {
        const { username, password } = req.body;

        // Find admin by username or email
        const [admins] = await db.query(
            'SELECT * FROM admin WHERE username = ? OR email = ?', [username, username]
        );

        if (admins.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const admin = admins[0];

        // Compare password
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            console.log('Admin login failed: Invalid password for user', username);
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Set admin session with unique key
        req.session.adminUser = {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            fullName: admin.full_name,
            role: 'admin'
        };
        console.log('Admin login successful. Session adminUser set:', req.session.adminUser);

        res.json({
            success: true,
            user: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                fullName: admin.full_name,
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
}

// Admin session check controller
function checkSession(req, res) {
    if (req.session.adminUser && req.session.adminUser.role === 'admin') {
        res.json({ authenticated: true, user: req.session.adminUser });
    } else {
        res.json({ authenticated: false });
    }
}

// Admin logout controller
function logout(req, res) {
    // Only destroy admin session, preserve other user sessions
    delete req.session.adminUser;
    res.json({ message: 'Logged out successfully' });
}

// Staff login controller (can be used by both admin and staff)
async function staffLogin(req, res) {
    try {
        const { username, password } = req.body;

        // Find user by username or email in the users table
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ? OR email = ?', [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = users[0];

        // Check if user is active
        if (user.status !== 'active') {
            return res.status(401).json({ message: 'Account is not active. Please contact administrator.' });
        }

        // Compare password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            console.log('Staff login failed: Invalid password for user', username);
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Set staff session with unique key
        req.session.staffUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            role: user.role
        };
        console.log('Staff login successful. Session staffUser set:', req.session.staffUser);

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Staff login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
}

// Staff session check controller
function checkStaffSession(req, res) {
    if (req.session.staffUser && (req.session.staffUser.role === 'admin' || req.session.staffUser.role === 'staff')) {
        res.json({ authenticated: true, user: req.session.staffUser });
    } else {
        res.json({ authenticated: false });
    }
}

// Staff logout controller
function staffLogout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
}

// Create new staff account
async function createStaff(req, res) {
    console.log('createStaff: req.session.user:', req.session.user);
    console.log('createStaff: req.body:', req.body);
    try {
        const {
            username,
            email,
            password,
            role,
            first_name,
            last_name,
            age,
            phone,
            address,
            position,
            work_schedule,
            date_hired,
            employee_id,
            emergency_contact,
            emergency_phone,
            birthday,
            gender
        } = req.body;

        // Check if username or email already exists
        const [existingUsers] = await db.query(
            'SELECT * FROM users WHERE username = ? OR email = ?', [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Username or Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const [result] = await db.query(
            `INSERT INTO users (
                username, email, password, role, first_name, last_name, full_name, age,
                phone, address, position, work_schedule, date_hired, employee_id,
                emergency_contact, emergency_phone, birthday, gender, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
                username, email, hashedPassword, role, first_name, last_name, `${first_name} ${last_name}`, age,
                phone || null, address || null, position || null, work_schedule || 'flexible',
                date_hired || null, employee_id || null, emergency_contact || null,
                emergency_phone || null, birthday || null, gender || null
            ]
        );
        console.log('createStaff: Insert result:', result);

        res.status(201).json({ message: 'Staff account created successfully', userId: result.insertId });
    } catch (error) {
        console.error('Error creating staff account:', error);
        res.status(500).json({ message: 'Error creating staff account' });
    }
}

// Edit staff account
async function editStaff(req, res) {
    console.log('editStaff: req.session.user:', req.session.user);
    console.log('editStaff: req.body:', req.body);
    try {
        const { id } = req.params; // Staff ID from URL
        const {
            username,
            password,
            first_name,
            last_name,
            age,
            email,
            role,
            phone,
            address,
            position,
            work_schedule,
            date_hired,
            employee_id,
            status,
            emergency_contact,
            emergency_phone,
            birthday,
            gender
        } = req.body; // Updated fields

        let updateFields = [];
        let queryParams = [];

        if (username) {
            updateFields.push('username = ?');
            queryParams.push(username);
        }

        if (email) {
            updateFields.push('email = ?');
            queryParams.push(email);
        }

        if (first_name || last_name) {
            // Get current values to construct full_name
            const [currentUser] = await db.query('SELECT first_name, last_name FROM users WHERE id = ?', [id]);
            const newFirstName = first_name || currentUser[0].first_name;
            const newLastName = last_name || currentUser[0].last_name;
            const newFullName = `${newFirstName} ${newLastName}`;

            if (first_name) {
                updateFields.push('first_name = ?');
                queryParams.push(first_name);
            }
            if (last_name) {
                updateFields.push('last_name = ?');
                queryParams.push(last_name);
            }
            // Always update full_name when first_name or last_name changes
            updateFields.push('full_name = ?');
            queryParams.push(newFullName);
        }

        if (age) {
            updateFields.push('age = ?');
            queryParams.push(age);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            updateFields.push('password = ?');
            queryParams.push(hashedPassword);
        }

        if (role) {
            updateFields.push('role = ?');
            queryParams.push(role);
        }

        // Handle new HR fields
        if (phone !== undefined) {
            updateFields.push('phone = ?');
            queryParams.push(phone);
        }

        if (address !== undefined) {
            updateFields.push('address = ?');
            queryParams.push(address);
        }

        if (position !== undefined) {
            updateFields.push('position = ?');
            queryParams.push(position);
        }

        if (work_schedule !== undefined) {
            updateFields.push('work_schedule = ?');
            queryParams.push(work_schedule);
        }

        if (date_hired !== undefined) {
            updateFields.push('date_hired = ?');
            queryParams.push(date_hired);
        }

        if (employee_id !== undefined) {
            updateFields.push('employee_id = ?');
            queryParams.push(employee_id);
        }

        if (status !== undefined) {
            updateFields.push('status = ?');
            queryParams.push(status);
        }

        if (emergency_contact !== undefined) {
            updateFields.push('emergency_contact = ?');
            queryParams.push(emergency_contact);
        }

        if (emergency_phone !== undefined) {
            updateFields.push('emergency_phone = ?');
            queryParams.push(emergency_phone);
        }

        if (birthday !== undefined) {
            updateFields.push('birthday = ?');
            queryParams.push(birthday);
        }

        if (gender !== undefined) {
            updateFields.push('gender = ?');
            queryParams.push(gender);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        queryParams.push(id);
        console.log('editStaff: SQL Query:', query);
        console.log('editStaff: Query Params:', queryParams);

        const [result] = await db.query(query, queryParams);
        console.log('editStaff: Update result:', result);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Staff account not found or no changes made' });
        }

        res.json({ message: 'Staff account updated successfully' });
    } catch (error) {
        console.error('Error updating staff account:', error);
        res.status(500).json({ message: 'Error updating staff account' });
    }
}

// Get all staff accounts
async function getAllStaff(req, res) {
    try {
        const [staff] = await db.query(`
            SELECT id, username, email, first_name, last_name, full_name, age, role,
                   phone, address, position, work_schedule, date_hired, employee_id,
                   status, last_login, emergency_contact, emergency_phone, birthday, gender,
                   profile_picture, created_at
            FROM users WHERE role = ?`, ['staff']);
        res.json(staff);
    } catch (error) {
        console.error('Error fetching staff accounts:', error);
        res.status(500).json({ message: 'Error fetching staff accounts' });
    }
}

// Get total staff count
async function countStaff(req, res) {
    try {
        const [result] = await db.query('SELECT COUNT(*) AS count FROM users WHERE role = ?', ['staff']);
        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching staff count:', error);
        res.status(500).json({ message: 'Error fetching staff count' });
    }
}

// Get total admin count
async function countAdmins(req, res) {
    try {
        const [result] = await db.query('SELECT COUNT(*) AS count FROM admin');
        res.json({ count: result[0].count });
    } catch (error) {
        console.error('Error fetching admin count:', error);
        res.status(500).json({ message: 'Error fetching admin count' });
    }
}

// Delete staff account
async function deleteStaff(req, res) {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Staff account not found' });
        }
        res.json({ message: 'Staff account deleted successfully' });
    } catch (error) {
        console.error('Error deleting staff account:', error);
        res.status(500).json({ message: 'Error deleting staff account' });
    }
}

// Get revenue metrics for dashboard
async function getRevenueMetrics(req, res) {
    try {
        const [result] = await db.query('SELECT SUM(total_price) AS totalRevenue FROM orders');
        res.json({ totalRevenue: result[0].totalRevenue || 0 });
    } catch (error) {
        console.error('Error fetching revenue metrics:', error);
        res.status(500).json({ message: 'Error fetching revenue metrics' });
    }
}

// Get order metrics for dashboard
async function getOrderMetrics(req, res) {
    try {
        const [result] = await db.query('SELECT COUNT(*) AS totalOrders FROM orders');
        res.json({ totalOrders: result[0].totalOrders || 0 });
    } catch (error) {
        console.error('Error fetching order metrics:', error);
        res.status(500).json({ message: 'Error fetching order metrics' });
    }
}

// Get inventory metrics for dashboard
async function getInventoryMetrics(req, res) {
    try {
        // Placeholder: Replace with actual inventory logic
        res.json({ totalItems: 0 });
    } catch (error) {
        console.error('Error fetching inventory metrics:', error);
        res.status(500).json({ message: 'Error fetching inventory metrics' });
    }
}

// Admin forgot password
async function forgotPassword(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    try {
        await ensurePasswordPolicyColumns();
        // First check if the email exists in admin table
        const [admins] = await db.query('SELECT * FROM admin WHERE email = ?', [email]);
        if (admins.length === 0) {
            // Check if email exists in other user tables (customers, staff, etc.)
            const [customers] = await db.query('SELECT * FROM customers WHERE email = ?', [email]);
            const [staff] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

            // If email exists but not in admin table, return unauthorized message
            if (customers.length > 0 || staff.length > 0) {
                return res.status(401).json({ message: 'Email is unauthorized.' });
            }

            // If email doesn't exist anywhere, return generic message for security
            return res.json({ message: 'If this is a registered admin email, a reset link will be sent.' });
        }

        const admin = admins[0];

        // Enforce cooldown: prevent requests if last change was recent
        if (admin.last_password_change_at) {
            const lastChange = new Date(admin.last_password_change_at);
            const diffDays = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < PASSWORD_COOLDOWN_DAYS) {
                const remaining = Math.ceil(PASSWORD_COOLDOWN_DAYS - diffDays);
                return res.status(429).json({ message: `You recently changed your password. Please try again in ${remaining} day(s).` });
            }
        }

        // Rate limit: if there's already a valid token not expired, block another request
        if (admin.reset_password_token && admin.reset_password_expires && new Date(admin.reset_password_expires) > new Date()) {
            return res.status(429).json({ message: 'A reset link was already sent recently. Please check your email or try again later.' });
        }

        // Generate token (30 minutes)
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
        // Save token and expiry
        await db.query('UPDATE admin SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?', [token, expires, admin.id]);
        // Send reset email
        const resetLink = `http://localhost:5173/admin/reset-password/${token}`;
        await sendResetPasswordEmail(email, admin.full_name || admin.username, resetLink);
        return res.json({ message: 'If this is a registered admin email, a reset link will be sent.' });
    } catch (error) {
        console.error('Admin forgot password error:', error);
        res.status(500).json({ message: 'Error processing request' });
    }
}

// Admin reset password
async function resetPassword(req, res) {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
    try {
        // Find admin by token and check expiry
        const [admins] = await db.query('SELECT * FROM admin WHERE reset_password_token = ? AND reset_password_expires > NOW()', [token]);
        if (admins.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        const admin = admins[0];

        // Enforce cooldown at reset time as well
        if (admin.last_password_change_at) {
            const lastChange = new Date(admin.last_password_change_at);
            const diffDays = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < PASSWORD_COOLDOWN_DAYS) {
                const remaining = Math.ceil(PASSWORD_COOLDOWN_DAYS - diffDays);
                return res.status(429).json({ message: `You recently changed your password. Please try again in ${remaining} day(s).` });
            }
        }
        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Update password and clear token
        await db.query('UPDATE admin SET password = ?, reset_password_token = NULL, reset_password_expires = NULL, last_password_change_at = NOW() WHERE id = ?', [hashedPassword, admin.id]);
        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Admin reset password error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
}

// Staff forgot password
async function staffForgotPassword(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    try {
        await ensurePasswordPolicyColumns();
        // Check if the email exists in users table with staff role
        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = "staff"', [email]);
        if (users.length === 0) {
            // Check if email exists in other tables
            const [admins] = await db.query('SELECT * FROM admin WHERE email = ?', [email]);
            const [customers] = await db.query('SELECT * FROM customers WHERE email = ?', [email]);

            // If email exists but not as staff, return unauthorized message
            if (admins.length > 0 || customers.length > 0) {
                return res.status(401).json({ message: 'Email is not associated with a staff account.' });
            }

            // If email doesn't exist anywhere, return generic message for security
            return res.json({ message: 'If this is a registered staff email, a reset link will be sent.' });
        }

        const user = users[0];

        // Enforce cooldown since last change
        if (user.last_password_change_at) {
            const lastChange = new Date(user.last_password_change_at);
            const diffDays = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < PASSWORD_COOLDOWN_DAYS) {
                const remaining = Math.ceil(PASSWORD_COOLDOWN_DAYS - diffDays);
                return res.status(429).json({ message: `You recently changed your password. Please try again in ${remaining} day(s).` });
            }
        }

        // Rate limit: existing active token blocks a new one
        if (user.reset_password_token && user.reset_password_expires && new Date(user.reset_password_expires) > new Date()) {
            return res.status(429).json({ message: 'A reset link was already sent recently. Please check your email or try again later.' });
        }

        // Generate token (30 minutes)
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
        // Save token and expiry
        await db.query('UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?', [token, expires, user.id]);
        // Send reset email
        const resetLink = `http://localhost:5173/staff/reset-password/${token}`;
        await sendResetPasswordEmail(email, user.full_name || user.username, resetLink);
        return res.json({ message: 'If this is a registered staff email, a reset link will be sent.' });
    } catch (error) {
        console.error('Staff forgot password error:', error);
        res.status(500).json({ message: 'Error processing request' });
    }
}

// Staff reset password
async function staffResetPassword(req, res) {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required' });
    try {
        // Find user by token and check expiry
        const [users] = await db.query('SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW() AND role = "staff"', [token]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        const user = users[0];

        // Enforce cooldown at reset time as well
        if (user.last_password_change_at) {
            const lastChange = new Date(user.last_password_change_at);
            const diffDays = (Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < PASSWORD_COOLDOWN_DAYS) {
                const remaining = Math.ceil(PASSWORD_COOLDOWN_DAYS - diffDays);
                return res.status(429).json({ message: `You recently changed your password. Please try again in ${remaining} day(s).` });
            }
        }
        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Update password and clear token
        await db.query('UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL, last_password_change_at = NOW() WHERE id = ?', [hashedPassword, user.id]);
        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Staff reset password error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
}

module.exports = {
    adminArea,
    login,
    checkSession,
    logout,
    staffLogin,
    checkStaffSession,
    staffLogout,
    createStaff,
    editStaff,
    getAllStaff,
    countStaff,
    countAdmins,
    deleteStaff,
    getRevenueMetrics,
    getOrderMetrics,
    getInventoryMetrics,
    forgotPassword,
    resetPassword,
    staffForgotPassword,
    staffResetPassword
};