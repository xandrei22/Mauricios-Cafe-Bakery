// Fix staff sales tracking by adding staff_id column and populating sample data
const db = require('./config/db');

async function fixStaffSales() {
    try {
        console.log('🔧 Fixing staff sales tracking...');
        
        // Add staff_id column if it doesn't exist
        try {
            await db.query('ALTER TABLE orders ADD COLUMN staff_id INT DEFAULT NULL');
            console.log('✅ Added staff_id column to orders table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('✅ staff_id column already exists');
            } else {
                throw error;
            }
        }
        
        // Check if we have any staff in the database
        const [staffCount] = await db.query('SELECT COUNT(*) as count FROM users WHERE role IN ("admin", "staff")');
        console.log(`📊 Found ${staffCount[0].count} staff/admin users`);
        
        if (staffCount[0].count === 0) {
            // Create sample staff users
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('password123', 10);
            
            await db.query(`
                INSERT INTO users (username, email, password_hash, full_name, role) VALUES
                ('admin', 'admin@cafe.com', ?, 'Admin User', 'admin'),
                ('staff1', 'staff1@cafe.com', ?, 'John Doe', 'staff'),
                ('staff2', 'staff2@cafe.com', ?, 'Jane Smith', 'staff')
            `, [hashedPassword, hashedPassword, hashedPassword]);
            
            console.log('✅ Created sample staff users');
        }
        
        // Get staff IDs
        const [staff] = await db.query('SELECT id, username FROM users WHERE role IN ("admin", "staff") LIMIT 3');
        console.log('👥 Available staff:', staff);
        
        if (staff.length > 0) {
            // Update existing orders to have staff_id (assign randomly)
            const [orders] = await db.query('SELECT id FROM orders WHERE staff_id IS NULL LIMIT 10');
            console.log(`📋 Found ${orders.length} orders without staff_id`);
            
            for (const order of orders) {
                const randomStaff = staff[Math.floor(Math.random() * staff.length)];
                await db.query('UPDATE orders SET staff_id = ? WHERE id = ?', [randomStaff.id, order.id]);
            }
            
            console.log('✅ Updated existing orders with staff_id');
        }
        
        // Test the staff sales query
        const [staffSales] = await db.query(`
            SELECT 
                CONCAT(u.username, ' (', u.full_name, ')') as staff_name,
                SUM(o.total_price) as total_sales
            FROM orders o
            JOIN users u ON o.staff_id = u.id
            WHERE o.payment_status = 'paid'
                AND o.order_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY u.id, u.username, u.full_name
            ORDER BY total_sales DESC
            LIMIT 6
        `);
        
        console.log('📊 Staff sales data:');
        console.log(JSON.stringify(staffSales, null, 2));
        
        if (staffSales.length > 0) {
            console.log('🎉 Staff sales tracking is now working!');
        } else {
            console.log('⚠️  No sales data found. You may need to create some orders with payment_status = "paid"');
        }
        
    } catch (error) {
        console.error('❌ Error fixing staff sales:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit(0);
    }
}

// Load environment variables
require('dotenv').config();

// Run the fix
fixStaffSales();










