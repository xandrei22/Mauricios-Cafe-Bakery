require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcrypt');

async function createAdmin() {
    try {
        const username = process.argv[2] || 'admin';
        const password = process.argv[3] || 'admin123';
        const email = process.argv[4] || `${username}@example.com`;
        const fullName = process.argv[5] || 'Admin User';

        console.log('🔧 Creating admin user...');
        console.log(`   Username: ${username}`);
        console.log(`   Email: ${email}`);
        console.log(`   Full Name: ${fullName}`);
        console.log(`   Password: ${'*'.repeat(password.length)} (will be hashed)\n`);

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('✓ Password hashed');

        // Check if user already exists
        const [existing] = await db.query(
            'SELECT * FROM admin WHERE username = ? OR email = ?', [username, email]
        );

        if (existing.length > 0) {
            console.log('⚠️  Admin user already exists! Updating password...');
            await db.query(
                'UPDATE admin SET password = ?, updated_at = NOW() WHERE username = ?', [hashedPassword, username]
            );
            console.log('✓ Admin password updated successfully');
        } else {
            // Insert new admin
            const [result] = await db.query(
                'INSERT INTO admin (username, email, password, full_name) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, fullName]
            );
            console.log('✓ Admin user created successfully');
            console.log(`   Admin ID: ${result.insertId}`);
        }

        console.log('\n✅ Done! You can now login with:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

