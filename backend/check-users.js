const db = require('./config/db');

async function checkUsers() {
    try {
        const [users] = await db.query(`
      SELECT id, email, full_name, email_verified, verification_token, verification_expires 
      FROM customers 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

        console.log('Recent users:');
        users.forEach(user => {
            console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.full_name}, Verified: ${user.email_verified}, Token: ${user.verification_token ? 'EXISTS' : 'NULL'}, Expires: ${user.verification_expires}`);
        });

        // Check for unverified users
        const [unverifiedUsers] = await db.query(`
      SELECT COUNT(*) as count 
      FROM customers 
      WHERE email_verified = 0 OR email_verified IS NULL
    `);

        console.log(`\nUnverified users: ${unverifiedUsers[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}




