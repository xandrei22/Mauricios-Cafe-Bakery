const db = require('./config/db');

async function checkCustomersSchema() {
    try {
        console.log('🔍 Checking customers table schema...\n');
        
        // Check table structure
        const [columns] = await db.query('DESCRIBE customers');
        console.log('📋 Customers table columns:');
        columns.forEach(col => {
            console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
        });
        
        console.log('\n📊 Sample customer data:');
        const [customers] = await db.query('SELECT * FROM customers LIMIT 1');
        if (customers.length > 0) {
            const customer = customers[0];
            Object.keys(customer).forEach(key => {
                console.log(`   ${key}: ${customer[key]}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkCustomersSchema();
