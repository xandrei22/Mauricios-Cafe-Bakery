const http = require('http');

async function debugCustomerLogin() {
    console.log('🔍 Debugging customer login process...\n');
    
    const testData = {
        email: 'joshjosh1622he@gmail.com',
        password: '16Josh1010.'
    };
    
    console.log('📋 Test credentials:');
    console.log(`   Email: ${testData.email}`);
    console.log(`   Password: ${testData.password}`);
    
    const postData = JSON.stringify(testData);
    
    const options = {
        hostname: 'localhost',
        port: 5001,
        path: '/api/customer/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    console.log('\n📡 Making request to:', `http://${options.hostname}:${options.port}${options.path}`);
    console.log('📡 Request method:', options.method);
    console.log('📡 Request headers:', options.headers);
    console.log('📡 Request body:', postData);
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log('\n📡 Response received:');
            console.log(`   Status: ${res.statusCode}`);
            console.log(`   Status Message: ${res.statusMessage}`);
            console.log(`   Headers:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log('\n📡 Response body:');
                try {
                    const responseData = JSON.parse(data);
                    console.log('   Parsed JSON:', JSON.stringify(responseData, null, 2));
                    
                    if (res.statusCode === 200 && responseData.success) {
                        console.log('\n✅ Login successful!');
                        console.log(`   User ID: ${responseData.user.id}`);
                        console.log(`   Username: ${responseData.user.username}`);
                        console.log(`   Role: ${responseData.user.role}`);
                    } else {
                        console.log('\n❌ Login failed!');
                        console.log(`   Error: ${responseData.message || 'Unknown error'}`);
                        console.log(`   Success: ${responseData.success}`);
                    }
                } catch (parseError) {
                    console.log('   Raw response:', data);
                    console.log('   Parse error:', parseError.message);
                }
                
                console.log('\n🎯 Analysis:');
                if (res.statusCode === 200) {
                    console.log('   ✅ HTTP 200 OK - Server responded successfully');
                } else if (res.statusCode === 401) {
                    console.log('   ❌ HTTP 401 Unauthorized - Authentication failed');
                } else if (res.statusCode === 500) {
                    console.log('   ❌ HTTP 500 Internal Server Error - Server error');
                } else {
                    console.log(`   ❓ HTTP ${res.statusCode} - Unexpected status`);
                }
                
                resolve();
            });
        });
        
        req.on('error', (error) => {
            console.error('\n❌ Request error:', error.message);
            console.log('\n🎯 Analysis:');
            console.log('   ❌ Network/connection error - Server might be down');
            reject(error);
        });
        
        req.on('timeout', () => {
            console.log('\n⏰ Request timeout');
            console.log('\n🎯 Analysis:');
            console.log('   ⏰ Server not responding - might be overloaded or down');
        });
        
        req.setTimeout(10000); // 10 second timeout
        
        console.log('\n📤 Sending request...');
        req.write(postData);
        req.end();
    });
}

debugCustomerLogin().catch(console.error);
