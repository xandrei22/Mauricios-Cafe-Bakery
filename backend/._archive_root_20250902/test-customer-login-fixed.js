const http = require('http');

async function testCustomerLogin() {
    console.log('🔍 Testing customer login after route fix...\n');

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

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const responseData = JSON.parse(data);
                    if (res.statusCode === 200 && responseData.success) {
                        console.log('✅ Customer login successful!');
                        console.log(`   User: ${responseData.user.name} (${responseData.user.email})`);
                        console.log(`   Role: ${responseData.user.role}`);
                    } else {
                        console.log('❌ Customer login failed:');
                        console.log(`   Status: ${res.statusCode}`);
                        console.log(`   Message: ${responseData.message || 'Unknown error'}`);
                    }
                } catch (parseError) {
                    console.log('❌ Failed to parse response:', data);
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

