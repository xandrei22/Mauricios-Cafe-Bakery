const db = require('./config/db');
const bcrypt = require('bcrypt');

async function createCustomerAccount() {
    try {
        console.log('🔧 Creating customer account...\n');
        
        // Customer details from the login form
        const customerData = {
            username: 'joshsayat',
            email: 'joshjosh1622he@gmail.com',
            password: '16Josh1010.',
            full_name: 'josh alexandrei Sayat'
        };
        
        // Check if customer already exists
        const [existingCustomer] = await db.query(
            'SELECT id FROM customers WHERE email = ? OR username = ?', 
            [customerData.email, customerData.username]
        );
        
        if (existingCustomer.length > 0) {
            console.log('✅ Customer account already exists!');
            console.log(`   Email: ${customerData.email}`);
            console.log(`   Username: ${customerData.username}`);
            console.log('   You can now log in with these credentials.');
            return;
        }
        
        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(customerData.password, saltRounds);
        
        // Insert new customer
        const [result] = await db.query(`
            INSERT INTO customers (
                username, 
                email, 
                password, 
                full_name, 
                loyalty_points,
                created_at, 
                updated_at
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            customerData.username,
            customerData.email,
            hashedPassword,
            customerData.full_name,
            0 // Start with 0 loyalty points
        ]);
        
        console.log('🎉 Customer account created successfully!');
        console.log(`   ID: ${result.insertId}`);
        console.log(`   Username: ${customerData.username}`);
        console.log(`   Email: ${customerData.email}`);
        console.log(`   Name: ${customerData.full_name}`);
        console.log('\n✅ You can now log in with:');
        console.log(`   Email: ${customerData.email}`);
        console.log(`   Password: ${customerData.password}`);
        
    } catch (error) {
        console.error('❌ Error creating customer account:', error.message);
        console.error('Full error:', error);
    } finally {
        process.exit(0);
    }
}

createCustomerAccount();
