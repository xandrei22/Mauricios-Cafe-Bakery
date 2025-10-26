const db = require('./config/db');

async function testEmailVerification() {
    try {
        // Get an unverified user
        const [unverifiedUsers] = await db.query(`
      SELECT id, email, full_name, email_verified, verification_token, verification_expires 
      FROM customers 
      WHERE email_verified = 0 OR email_verified IS NULL
      LIMIT 1
    `);

        if (unverifiedUsers.length === 0) {
            console.log('No unverified users found');
            process.exit(0);
        }

        const user = unverifiedUsers[0];
        console.log('Found unverified user:', {
            id: user.id,
            email: user.email,
            name: user.full_name,
            verified: user.email_verified,
            token: user.verification_token,
            expires: user.verification_expires
        });

        // Generate a new verification token for testing
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

        // Update the user with a new verification token
        await db.query(`
      UPDATE customers 
      SET verification_token = ?, verification_expires = ? 
      WHERE id = ?
    `, [verificationToken, verificationExpires, user.id]);

        console.log('Generated new verification token:', verificationToken);
        console.log('Token expires at:', verificationExpires);

        // Test the verification endpoint
        const fetch = require('node-fetch');
        const response = await fetch('http://localhost:5001/api/customer/verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: verificationToken })
        });

        const result = await response.json();
        console.log('Verification response:', {
            status: response.status,
            success: result.success,
            message: result.message
        });

        // Check if user is now verified
        const [updatedUser] = await db.query(`
      SELECT email_verified, verification_token 
      FROM customers 
      WHERE id = ?
    `, [user.id]);

        console.log('User after verification:', {
            verified: updatedUser[0].email_verified,
            token: updatedUser[0].verification_token
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}




