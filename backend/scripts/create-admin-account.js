// Create proper admin account for joshjosh1622he@gmail.com
const db = require('../config/db');
const bcrypt = require('bcrypt');

async function createAdminAccount() {
    try {
        console.log('🔧 Creating proper admin account...');

        const email = 'joshjosh1622he@gmail.com';
        const password = '16Josh1010.';
        const username = 'joshjosh1622he';
        const fullName = 'Josh Admin';

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('✓ Password hashed');

        // Check if admin already exists
        const [existing] = await db.query(
            'SELECT * FROM admin WHERE email = ? OR username = ?', [email, username]
        );

        if (existing.length > 0) {
            console.log('⚠️  Admin account already exists! Updating password...');
            await db.query(
                'UPDATE admin SET password = ?, full_name = ?, updated_at = NOW() WHERE email = ?', [hashedPassword, fullName, email]
            );
            console.log('✓ Admin account updated successfully');
        } else {
            // Insert new admin
            const [result] = await db.query(
                'INSERT INTO admin (username, email, password, full_name) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, fullName]
            );
            console.log('✓ Admin account created successfully');
            console.log(`   Admin ID: ${result.insertId}`);
        }

        console.log('\n✅ Done! You can now login with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log('   Portal: Admin Portal (not Staff Portal)');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

// Run the script

