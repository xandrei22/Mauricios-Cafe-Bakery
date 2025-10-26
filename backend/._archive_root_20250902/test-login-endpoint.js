const http = require('http');

async function testLoginEndpoint() {
    console.log('🔍 Testing customer login endpoint...\n');
    
    const postData = JSON.stringify({
        email: 'joshjosh1622he@gmail.com',
        password: '16Josh1010.'
    });
    
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
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log(`📡 Response Status: ${res.statusCode}`);
            console.log(`📡 Response Headers:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const responseData = JSON.parse(data);
                    console.log('📡 Response Body:', JSON.stringify(responseData, null, 2));
                    
                    if (res.statusCode === 200 && responseData.success) {
                        console.log('✅ Login successful!');
                    } else {
                        console.log('❌ Login failed!');
                        console.log(`   Error: ${responseData.message || 'Unknown error'}`);
                    }
                } catch (parseError) {
                    console.log('📡 Raw Response:', data);
                    console.log('❌ Failed to parse JSON response');
                }
                resolve();
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Request error:', error.message);
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

testLoginEndpoint().catch(console.error);
