const bcrypt = require('bcrypt');
const db = require('../config/db');

async function initializeAdmin() {
    try {
        const connection = await db.getConnection();

        // Default admin credentials
        const adminData = {
            username: 'admin',
            password: '16josh1010', // This will be hashed
            email: 'alexandrei1628@gmail.com',
            fullName: 'System Administrator'
        };

        // Hash the password
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Check if admin already exists
        const [existingAdmins] = await connection.query(
            'SELECT * FROM admin WHERE username = ?', [adminData.username]
        );

        console.log('Existing Admins found:', existingAdmins);

        if (existingAdmins.length === 0) {
            // Insert admin account
            try {
                await connection.query(
                    'INSERT INTO admin (username, password, email, full_name, created_at) VALUES (?, ?, ?, ?, NOW())', [adminData.username, hashedPassword, adminData.email, adminData.fullName]
                );
                console.log('Admin account created successfully');
            } catch (insertError) {
                console.error('Error inserting admin account:', insertError);
            }
        } else {
            console.log('Admin account already exists');
        }

        connection.release();
    } catch (error) {
        console.error('Error initializing admin account:', error);
        process.exit(1);
    }
}

// Run the initialization
initializeAdmin();