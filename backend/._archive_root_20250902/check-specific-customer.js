const db = require('./config/db');

async function checkSpecificCustomer() {
    try {
        console.log('🔍 Checking for specific customer account...\n');
        
        const email = 'joshjosh1622he@gmail.com';
        
        // Check if customer exists with this email
        const [customers] = await db.query('SELECT * FROM customers WHERE email = ?', [email]);
        
        if (customers.length === 0) {
            console.log(`❌ No customer found with email: ${email}`);
            console.log('💡 Need to create a new customer account');
        } else {
            console.log(`✅ Found ${customers.length} customer(s) with email: ${email}`);
            customers.forEach((customer, index) => {
                console.log(`\n📋 Customer ${index + 1}:`);
                console.log(`   ID: ${customer.id}`);
                console.log(`   Username: ${customer.username}`);
                console.log(`   Email: ${customer.email}`);
                console.log(`   Name: ${customer.full_name}`);
                console.log(`   Password: ${customer.password}`);
                console.log(`   Google ID: ${customer.google_id || 'None'}`);
                console.log(`   Created: ${customer.created_at}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkSpecificCustomer();
