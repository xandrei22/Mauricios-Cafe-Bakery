// Update staff account to admin role
const db = require('../config/db');

async function updateStaffToAdmin() {
    try {
        console.log('🔧 Updating staff account to admin role...');

        const email = 'joshjosh1622he@gmail.com';

        // Update the role from 'staff' to 'admin'
        const [result] = await db.query(
            'UPDATE users SET role = ? WHERE email = ?', ['admin', email]
        );

        if (result.affectedRows > 0) {
            console.log('✅ Successfully updated account role to admin');
            console.log(`   Email: ${email}`);
            console.log(`   New Role: admin`);
            console.log('\n🎉 You can now login to the Admin Portal!');
        } else {
            console.log('⚠️  No account found with that email');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

// Run the script













