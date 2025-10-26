// Final fix for staff_id foreign key constraint issue
const db = require('./config/db');

async function fixConstraintFinal() {
    let connection;
    try {
        console.log('🔧 Final fix for staff_id foreign key constraint...');
        
        connection = await db.getConnection();
        
        // First, check current table structure
        const [tableInfo] = await connection.query('SHOW CREATE TABLE orders');
        console.log('📋 Current orders table structure:');
        console.log(tableInfo[0]['Create Table']);
        
        // Check if constraint exists
        const [constraints] = await connection.query(`
            SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'orders' AND CONSTRAINT_NAME = 'fk_orders_staff_id'
        `);
        
        console.log('🔍 Current constraints:', constraints);
        
        // Drop the constraint if it exists
        if (constraints.length > 0) {
            console.log('🗑️  Dropping existing constraint...');
            await connection.query('ALTER TABLE orders DROP FOREIGN KEY fk_orders_staff_id');
            console.log('✅ Constraint dropped');
        }
        
        // Check if staff_id column exists and is nullable
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT 
            FROM information_schema.COLUMNS 
            WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'staff_id'
        `);
        
        console.log('📊 staff_id column info:', columns);
        
        // Ensure staff_id column is properly configured
        if (columns.length === 0) {
            console.log('➕ Adding staff_id column...');
            await connection.query('ALTER TABLE orders ADD COLUMN staff_id INT DEFAULT NULL');
        } else {
            console.log('🔧 Ensuring staff_id is nullable...');
            await connection.query('ALTER TABLE orders MODIFY COLUMN staff_id INT DEFAULT NULL');
        }
        
        // Add the constraint back with proper NULL handling
        console.log('➕ Adding foreign key constraint with NULL support...');
        await connection.query(`
            ALTER TABLE orders 
            ADD CONSTRAINT fk_orders_staff_id 
            FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
        `);
        console.log('✅ Foreign key constraint added');
        
        // Test the constraint with a NULL value
        console.log('🧪 Testing constraint with NULL value...');
        try {
            await connection.query(`
                INSERT INTO orders 
                (order_id, order_number, customer_name, items, total_price, status, payment_status, staff_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                `TEST-${Date.now()}`,
                `TEST-${Date.now()}`,
                'Test Customer',
                '[]',
                0.00,
                'pending',
                'pending',
                null
            ]);
            console.log('✅ NULL staff_id test passed');
            
            // Clean up test record
            await connection.query('DELETE FROM orders WHERE order_id LIKE "TEST-%"');
            console.log('🧹 Test record cleaned up');
            
        } catch (testError) {
            console.error('❌ NULL staff_id test failed:', testError.message);
        }
        
        // Verify final structure
        const [finalConstraints] = await connection.query(`
            SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_NAME = 'orders' AND CONSTRAINT_NAME = 'fk_orders_staff_id'
        `);
        
        console.log('✅ Final constraint status:', finalConstraints);
        console.log('🎉 Constraint fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error fixing constraint:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Run the fix
fixConstraintFinal().catch(console.error);







