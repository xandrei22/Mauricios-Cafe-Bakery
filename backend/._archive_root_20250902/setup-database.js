const mysql = require('mysql2/promise');

async function setupDatabase() {
    // First, connect without specifying a database
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: ''
    });

    try {
        console.log('🔧 Setting up database...');

        // Create database if it doesn't exist
        await connection.execute('CREATE DATABASE IF NOT EXISTS cafe_management');
        console.log('✅ Database "cafe_management" created/verified');

        // Use the database
        await connection.execute('USE cafe_management');

        // Create users table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                full_name VARCHAR(100),
                age INT,
                phone VARCHAR(20),
                address TEXT,
                position VARCHAR(100),
                work_schedule VARCHAR(100) DEFAULT 'flexible',
                date_hired DATE,
                employee_id VARCHAR(50),
                emergency_contact VARCHAR(100),
                emergency_phone VARCHAR(20),
                birthday DATE,
                gender ENUM('male', 'female', 'other'),
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table created/verified');

        // Create admin table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS admin (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Admin table created/verified');

        // Create customers table if it doesn't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                phone VARCHAR(20),
                address TEXT,
                birthday DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Customers table created/verified');

        // Check if there are any users
        const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
        const [admins] = await connection.execute('SELECT COUNT(*) as count FROM admin');
        const [customers] = await connection.execute('SELECT COUNT(*) as count FROM customers');

        console.log(`\n📊 Current user counts:`);
        console.log(`- Users (staff/admin): ${users[0].count}`);
        console.log(`- Admins: ${admins[0].count}`);
        console.log(`- Customers: ${customers[0].count}`);

        if (users[0].count === 0) {
            console.log('\n⚠️  No users found. You may need to create staff/admin accounts.');
        }

        console.log('\n✅ Database setup completed successfully!');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
    } finally {
        await connection.end();
    }
}

setupDatabase();
