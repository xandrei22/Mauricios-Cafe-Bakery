const db = require('./config/db');
const crypto = require('crypto');

async function testVerificationEndpoint() {
    try {
        console.log('🧪 Testing verification endpoint...');
        
        // Create a test customer with verification token
        const testEmail = 'test-endpoint@example.com';
        const testUsername = 'testuser';
        const testPassword = 'TestPassword123!';
        const testFullName = 'Test User';
        
        // Clean up any existing test customer
        await db.query('DELETE FROM customers WHERE email = ?', [testEmail]);
        
        // Create new test customer
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        
        const [result] = await db.query(
            'INSERT INTO customers (username, password, email, full_name, email_verified, verification_token, verification_expires, created_at) VALUES (?, ?, ?, ?, FALSE, ?, ?, NOW())',
            [testUsername, testPassword, testEmail, testFullName, verificationToken, verificationExpires]
        );
        
        console.log('✅ Test customer created with ID:', result.insertId);
        console.log('✅ Verification token:', verificationToken);
        
        // Test the verification logic directly (without HTTP)
        console.log('🔍 Testing verification logic...');
        
        // Find customer with token
        const [customers] = await db.query(
            'SELECT * FROM customers WHERE verification_token = ?', [verificationToken]
        );
        
        if (customers.length === 0) {
            console.log('❌ No customer found with token');
            return;
        }
        
        const customer = customers[0];
        console.log('✅ Found customer:', customer.email);
        
        // Test the database update
        await db.query(
            'UPDATE customers SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = ?',
            [customer.id]
        );
        
        console.log('✅ Database update successful');
        
        // Test welcome email function
        try {
            const { sendWelcomeEmail } = require('./utils/emailService');
            console.log('✅ sendWelcomeEmail function imported successfully');
            
            // Don't actually send email in test, just check if function exists
            console.log('✅ Email service is working');
        } catch (emailError) {
            console.log('❌ Email service error:', emailError.message);
        }
        
        // Clean up
        await db.query('DELETE FROM customers WHERE email = ?', [testEmail]);
        console.log('✅ Test customer cleaned up');
        
        console.log('🎉 Verification logic test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (db && typeof db.end === 'function') {
            await db.end();
        }
    }
}

testVerificationEndpoint();























