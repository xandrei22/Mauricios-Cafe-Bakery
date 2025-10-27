require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function debugAdminLogin() {
    try {
        console.log('🔍 Checking admin table...\n');

        // 1. Check if admin table exists and get its structure
        console.log('📋 Checking admin table structure...');
        const [tables] = await db.query("SHOW TABLES LIKE 'admin'");
        if (tables.length === 0) {
            console.log('❌ Admin table does not exist!');
            // Try 'admins' plural
            const [adminsTable] = await db.query("SHOW TABLES LIKE 'admins'");
            if (adminsTable.length > 0) {
                console.log('✓ Found "admins" table (plural)');
            }
        } else {
            console.log('✓ Admin table exists');
        }

        // 2. Get all admin users (without passwords)
        console.log('\n📊 Fetching admin users...');
        const [admins] = await db.query('SELECT id, username, email, full_name, created_at FROM admin LIMIT 10');

        if (admins.length === 0) {
            console.log('❌ No admin users found in the database!');
            console.log('\n💡 You need to create an admin user. Run:');
            console.log('   node scripts/create-admin.js');
        } else {
            console.log(`✓ Found ${admins.length} admin user(s):`);
            admins.forEach(admin => {
                console.log(`   - ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}`);
            });
        }

        // 3. Test with a specific username
        const testUsername = process.argv[2] || '';
        if (testUsername) {
            console.log(`\n🔑 Testing login with username: "${testUsername}"`);

            const [users] = await db.query(
                'SELECT * FROM admin WHERE username = ? OR email = ?', [testUsername, testUsername]
            );

            if (users.length === 0) {
                console.log('❌ User not found in database');
            } else {
                const user = users[0];
                console.log('✓ User found in database:');
                console.log(`   - ID: ${user.id}`);
                console.log(`   - Username: ${user.username}`);
                console.log(`   - Email: ${user.email}`);
                console.log(`   - Has password: ${user.password ? 'Yes' : 'No'}`);

                // Test if password is bcrypt hashed
                if (user.password) {
                    const isBcrypt = user.password.startsWith('$2b$') || user.password.startsWith('$2a$');
                    console.log(`   - Password format: ${isBcrypt ? 'bcrypt (correct)' : 'plain text (needs hashing)'}`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

