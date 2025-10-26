const bcrypt = require('bcrypt');
const db = require('../config/db');

// Customer signup controller
async function signup(req, res) {
    try {
        const { username, password, email, fullName } = req.body;

        // Validate required fields
        if (!username || !password || !email || !fullName) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if username or email already exists
        const [existingUsers] = await db.query(
            'SELECT * FROM customers WHERE username = ? OR email = ?', [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new customer
        const [result] = await db.query(
            'INSERT INTO customers (username, password, email, full_name, created_at) VALUES (?, ?, ?, ?, NOW())', [username, hashedPassword, email, fullName]
        );

        res.status(201).json({
            message: 'Customer account created successfully',
            customerId: result.insertId
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Error creating account' });
    }
}

// Login controller
async function login(req, res) {
    try {
        const { username, password } = req.body;

        // Validate required fields
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Find user by username
        const [users] = await db.query(
            'SELECT * FROM customers WHERE username = ?', [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = users[0];

        // Compare password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Set user session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name
        };

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error during login' });
    }
}

// Check session controller
function checkSession(req, res) {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
}

// Logout controller
function logout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully' });
    });
}

module.exports = {};