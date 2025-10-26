// Database setup script
const mysql = require('mysql2/promise');

async function setupDatabase() {
    let connection;

    try {
        console.log('🔄 Setting up database...');

        // Connect to MySQL without specifying database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('✅ Connected to MySQL');

        // Create database if it doesn't exist
        await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'cafe_management'}`);
        console.log('✅ Database created/verified');

        // Switch to the database
        await connection.execute(`USE ${process.env.DB_NAME || 'cafe_management'}`);
        console.log('✅ Switched to database');

        // Create feedback table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS feedback (
                id INT PRIMARY KEY AUTO_INCREMENT,
                customer_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(100) NOT NULL,
                order_id VARCHAR(50) DEFAULT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT DEFAULT NULL,
                category VARCHAR(50) DEFAULT 'General',
                feedback_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_customer_email (customer_email),
                INDEX idx_order_id (order_id),
                INDEX idx_rating (rating),
                INDEX idx_feedback_time (feedback_time),
                
                UNIQUE KEY unique_order_feedback (customer_email, order_id)
            )
        `);
        console.log('✅ Feedback table created/verified');

        // Create basic tables if they don't exist
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                role ENUM('admin', 'staff', 'customer') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table created/verified');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS staff (
                id INT PRIMARY KEY AUTO_INCREMENT,
                first_name VARCHAR(50) NOT NULL,
                last_name VARCHAR(50) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20),
                position VARCHAR(50),
                hire_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Staff table created/verified');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_id VARCHAR(50) UNIQUE NOT NULL,
                order_number VARCHAR(50),
                customer_id INT,
                customer_name VARCHAR(100),
                table_number INT,
                items JSON,
                total_price DECIMAL(10,2),
                status ENUM('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'pending_verification') DEFAULT 'pending',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                payment_method VARCHAR(50),
                notes TEXT,
                order_type ENUM('dine_in', 'takeout', 'delivery') DEFAULT 'dine_in',
                queue_position INT DEFAULT 0,
                estimated_ready_time TIMESTAMP NULL,
                order_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                staff_id INT DEFAULT NULL,
                FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ Orders table created/verified');

        // Add staff_id column if it doesn't exist (for existing databases)
        try {
            await connection.execute(`ALTER TABLE orders ADD COLUMN staff_id INT DEFAULT NULL`);
            console.log('✅ Added staff_id column to orders table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('✅ staff_id column already exists');
            } else {
                throw error;
            }
        }

        // Add foreign key constraint for staff_id
        try {
            await connection.execute(`ALTER TABLE orders ADD CONSTRAINT fk_orders_staff_id FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL`);
            console.log('✅ Added foreign key constraint for staff_id');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('✅ Foreign key constraint already exists');
            } else {
                console.log('⚠️  Could not add foreign key constraint (this is OK if staff table doesn\'t exist yet)');
            }
        }

        // Insert sample staff data for testing
        const [existingStaff] = await connection.execute('SELECT COUNT(*) as count FROM staff');
        if (existingStaff[0].count === 0) {
            await connection.execute(`
                INSERT INTO staff (first_name, last_name, email, position, is_active) VALUES
                ('John', 'Doe', 'john.doe@cafe.com', 'Manager', TRUE),
                ('Jane', 'Smith', 'jane.smith@cafe.com', 'Cashier', TRUE),
                ('Mike', 'Johnson', 'mike.johnson@cafe.com', 'Barista', TRUE)
            `);
            console.log('✅ Sample staff data inserted');
        } else {
            console.log('✅ Staff data already exists');
        }

        // Insert sample admin user
        const [existingAdmin] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
        if (existingAdmin[0].count === 0) {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.execute(`
                INSERT INTO users (username, email, password_hash, full_name, role) VALUES
                ('admin', 'admin@cafe.com', ?, 'Administrator', 'admin')
            `, [hashedPassword]);
            console.log('✅ Sample admin user created (username: admin, password: admin123)');
        } else {
            console.log('✅ Admin user already exists');
        }

        console.log('🎉 Database setup completed successfully!');

    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        console.error('Full error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Load environment variables
require('dotenv').config();

// Run the setup
setupDatabase();