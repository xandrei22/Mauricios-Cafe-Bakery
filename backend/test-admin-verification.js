const fetch = require('node-fetch');

async function testAdminVerification() {
    try {
        // Test with one of the orders that has paid payment but pending status
        const orderId = 'ORD-1761387362308-x0nfpdrh4';

        console.log(`Testing admin payment verification for order: ${orderId}`);

        const response = await fetch(`http://localhost:5001/api/admin/orders/${orderId}/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                paymentMethod: 'cash',
                verifiedBy: 'admin',
                reference: 'Test verification',
                transactionId: 'TEST_' + Date.now()
            })
        });

        const result = await response.json();
        console.log('Response status:', response.status);
        console.log('Response body:', result);

        if (response.ok && result.success) {
            console.log('✅ Payment verification successful!');
        } else {
            console.log('❌ Payment verification failed:', result.error || result.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error testing admin verification:', error);
        process.exit(1);
    }
}




