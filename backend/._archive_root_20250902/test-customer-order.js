const http = require('http');

async function testCustomerOrder() {
    console.log('🔍 Testing customer order placement...\n');
    
    // Step 1: Customer login
    console.log('📋 Step 1: Customer Login');
    const customerLoginData = JSON.stringify({
        email: 'joshjosh1622he@gmail.com',
        password: '16Josh1010.'
    });
    
    const customerLoginOptions = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/customer/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(customerLoginData)
        }
    };
    
    let customerSession = null;
    
    try {
        const customerResponse = await makeRequest(customerLoginOptions, customerLoginData);
        console.log(`   Customer Login Status: ${customerResponse.statusCode}`);
        
        if (customerResponse.statusCode === 200) {
            const customerData = JSON.parse(customerResponse.body);
            if (customerData.success) {
                console.log('   ✅ Customer login successful');
                console.log(`   Customer: ${customerData.user.name} (ID: ${customerData.user.id})`);
                customerSession = customerData.user;
            } else {
                console.log('   ❌ Customer login failed:', customerData.message);
                return;
            }
        }
    } catch (error) {
        console.log('   ❌ Customer login error:', error.message);
        return;
    }
    
    // Step 2: Place order
    console.log('\n📋 Step 2: Place Order');
    const orderData = JSON.stringify({
        customerId: customerSession.id,
        customerName: customerSession.name,
        customerEmail: customerSession.email,
        items: [
            {
                menuItemId: 1,
                name: 'Test Coffee',
                quantity: 1,
                price: 100,
                notes: 'Test order',
                customizations: {}
            }
        ],
        totalAmount: 100,
        paymentMethod: 'cash',
        notes: 'Test order from script',
        tableNumber: 1
    });
    
    const orderOptions = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/customer/checkout',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(orderData)
        }
    };
    
    try {
        const orderResponse = await makeRequest(orderOptions, orderData);
        console.log(`   Order Placement Status: ${orderResponse.statusCode}`);
        
        if (orderResponse.statusCode === 200) {
            const orderResult = JSON.parse(orderResponse.body);
            if (orderResult.success) {
                console.log('   ✅ Order placed successfully!');
                console.log(`   Order ID: ${orderResult.orderId}`);
                console.log(`   Status: ${orderResult.status}`);
            } else {
                console.log('   ❌ Order placement failed:', orderResult.message);
            }
        } else {
            console.log('   ❌ Order placement failed with status:', orderResponse.statusCode);
            console.log('   Response:', orderResponse.body);
        }
    } catch (error) {
        console.log('   ❌ Order placement error:', error.message);
    }
    
    console.log('\n🎯 Summary: Customer Order Test');
    console.log('=====================================');
    console.log('✅ If order is placed successfully, the session fix worked');
    console.log('❌ If order fails, there are still session issues to resolve');
}

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

testCustomerOrder().catch(console.error);
