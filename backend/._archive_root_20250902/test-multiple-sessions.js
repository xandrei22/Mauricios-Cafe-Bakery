const http = require('http');

async function testMultipleSessions() {
    console.log('🔍 Testing multiple user sessions...\n');

    // Test 1: Customer login
    console.log('📋 Test 1: Customer Login');
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

    try {
        const customerResponse = await makeRequest(customerLoginOptions, customerLoginData);
        console.log(`   Customer Login Status: ${customerResponse.statusCode}`);

        if (customerResponse.statusCode === 200) {
            const customerData = JSON.parse(customerResponse.body);
            if (customerData.success) {
                console.log('   ✅ Customer login successful');
                console.log(`   Customer: ${customerData.user.name} (${customerData.user.email})`);
            } else {
                console.log('   ❌ Customer login failed:', customerData.message);
            }
        }
    } catch (error) {
        console.log('   ❌ Customer login error:', error.message);
    }

    console.log('\n📋 Test 2: Admin Login (while customer is logged in)');
    const adminLoginData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });

    const adminLoginOptions = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/admin/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(adminLoginData)
        }
    };

    try {
        const adminResponse = await makeRequest(adminLoginOptions, adminLoginData);
        console.log(`   Admin Login Status: ${adminResponse.statusCode}`);

        if (adminResponse.statusCode === 200) {
            const adminData = JSON.parse(adminResponse.body);
            if (adminData.success) {
                console.log('   ✅ Admin login successful');
                console.log(`   Admin: ${adminData.user.fullName} (${adminData.user.email})`);
            } else {
                console.log('   ❌ Admin login failed:', adminData.message);
            }
        }
    } catch (error) {
        console.log('   ❌ Admin login error:', error.message);
    }

    console.log('\n📋 Test 3: Check Customer Session (after admin login)');
    const customerCheckOptions = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/customer/check-session',
        method: 'GET'
    };

    try {
        const customerCheckResponse = await makeRequest(customerCheckOptions);
        console.log(`   Customer Session Check Status: ${customerCheckResponse.statusCode}`);

        if (customerCheckResponse.statusCode === 200) {
            const customerCheckData = JSON.parse(customerCheckResponse.body);
            if (customerCheckData.authenticated) {
                console.log('   ✅ Customer session still valid after admin login');
                console.log(`   Customer: ${customerCheckData.user.name} (${customerCheckData.user.email})`);
            } else {
                console.log('   ❌ Customer session lost after admin login');
            }
        }
    } catch (error) {
        console.log('   ❌ Customer session check error:', error.message);
    }

    console.log('\n🎯 Summary: Multiple Session Test');
    console.log('=====================================');
    console.log('✅ If all tests pass, multiple user types can coexist');
    console.log('❌ If customer session is lost, there is still a session conflict');
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

