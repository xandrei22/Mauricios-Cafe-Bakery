const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsersTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'capstone_db'
    });

    console.log('✅ Connected to database');

    // Check if users table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "users"');
    if (tables.length === 0) {
      console.log('❌ Users table does not exist');
      return;
    }

    console.log('✅ Users table exists');

    // Check table structure
    console.log('\n📋 Users table structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });

    // Check if there are any users
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Total users: ${users[0].count}`);

    if (users[0].count > 0) {
      // Show sample users
      console.log('\n📋 Sample users:');
      const [sampleUsers] = await connection.execute(`
        SELECT id, username, email, role, created_at 
        FROM users 
        ORDER BY id 
        LIMIT 10
      `);
      
      sampleUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}, Created: ${user.created_at}`);
      });

      // Check specific user ID 1
      console.log('\n🔍 Checking user ID 1:');
      const [user1] = await connection.execute('SELECT * FROM users WHERE id = 1');
      if (user1.length > 0) {
        const user = user1[0];
        console.log(`  ✅ User ID 1 exists:`);
        console.log(`     - Username: ${user.username}`);
        console.log(`     - Email: ${user.email}`);
        console.log(`     - Role: ${user.role}`);
        console.log(`     - Created: ${user.created_at}`);
      } else {
        console.log('  ❌ User ID 1 does not exist');
      }

      // Check for admin/staff users
      console.log('\n👑 Admin/Staff users:');
      const [adminUsers] = await connection.execute(`
        SELECT id, username, email, role 
        FROM users 
        WHERE role IN ('admin', 'staff', 'manager') 
        ORDER BY role, id
      `);
      
      if (adminUsers.length > 0) {
        adminUsers.forEach(user => {
          console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
        });
      } else {
        console.log('  ❌ No admin/staff users found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkUsersTable();

