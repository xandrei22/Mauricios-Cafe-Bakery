const http = require('http');

function testCustomerOrdersAPI() {
  console.log('🧪 TESTING CUSTOMER ORDERS API DIRECTLY...\n');
  
  const customerEmail = 'joshjosh1622he@gmail.com';
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: `/api/customer/orders/${encodeURIComponent(customerEmail)}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('\nResponse:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.success && response.orders) {
          console.log(`\n✅ API is working! Found ${response.orders.length} orders`);
          console.log('The two-column layout should now be visible in the frontend!');
        } else {
          console.log('\n❌ API returned error:', response.message);
        }
      } catch (e) {
        console.log('\n❌ Failed to parse response:', e.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.end();
}

testCustomerOrdersAPI();

