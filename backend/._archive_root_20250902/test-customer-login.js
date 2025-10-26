const db = require('./config/db');

async function testCustomerLogin() {
    try {
        console.log('🔍 Testing customer login system...\n');
        
        // 1. Check if customers table exists
        console.log('1. Checking customers table...');
        const [tables] = await db.query('SHOW TABLES LIKE "customers"');
        if (tables.length === 0) {
            console.log('❌ Customers table does not exist!');
            return;
        }
        console.log('✅ Customers table exists');
        
        // 2. Check if there are any customer accounts
        console.log('\n2. Checking customer accounts...');
        const [customers] = await db.query('SELECT COUNT(*) as count FROM customers');
        console.log(`Found ${customers[0].count} customer accounts`);
        
        if (customers[0].count === 0) {
            console.log('❌ No customer accounts found! This is why login fails.');
            console.log('💡 Need to create at least one customer account');
            return;
        }
        
        // 3. Show sample customer data (without passwords)
        console.log('\n3. Sample customer accounts:');
        const [customerList] = await db.query('SELECT id, username, email, full_name FROM customers LIMIT 3');
        customerList.forEach(customer => {
            console.log(`   - ID: ${customer.id}, Username: ${customer.username}, Email: ${customer.email}, Name: ${customer.full_name}`);
        });
        
        // 4. Test database connection for customer login
        console.log('\n4. Testing customer login query...');
        const testEmail = 'joshjosh1622he@gmail.com';
        const [testCustomer] = await db.query('SELECT * FROM customers WHERE email = ?', [testEmail]);
        
        if (testCustomer.length === 0) {
            console.log(`❌ Customer with email "${testEmail}" not found`);
            console.log('💡 This email needs to be registered first');
        } else {
            console.log(`✅ Customer found: ${testCustomer[0].full_name}`);
            console.log('✅ Database query for customer login is working');
        }
        
        // 5. Check sessions table
        console.log('\n5. Checking sessions table...');
        const [sessions] = await db.query('SHOW TABLES LIKE "sessions"');
        if (sessions.length === 0) {
            console.log('❌ Sessions table does not exist! This will cause login failures.');
        } else {
            console.log('✅ Sessions table exists');
        }
        
        console.log('\n🎯 Summary: Customer login system status');
        console.log('=====================================');
        
    } catch (error) {
        console.error('❌ Error testing customer login:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit(0);
    }
}

testCustomerLogin();
