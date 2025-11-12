// Test script to verify the staff performance API endpoint
// Run this with: node test-staff-performance-api.js

const http = require('http');

// Test the API endpoint directly
// NOTE: You'll need to replace with your actual JWT token
const testEndpoint = (period = 'day') => {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: `/api/admin/dashboard/staff-performance?period=${period}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Add your JWT token here if needed
      // 'Authorization': 'Bearer YOUR_JWT_TOKEN'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`\n=== Response for period=${period} ===`);
      console.log('Status:', res.statusCode);
      console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
      
      const parsed = JSON.parse(data);
      if (parsed.staff_performance && parsed.staff_performance.length > 0) {
        console.log('\n✅ Staff performance data found!');
        parsed.staff_performance.forEach((staff, idx) => {
          console.log(`\nStaff ${idx + 1}:`);
          console.log(`  Name: ${staff.staff_name}`);
          console.log(`  Total Sales: ₱${staff.total_sales}`);
          console.log(`  Total Orders: ${staff.total_orders}`);
        });
      } else {
        console.log('\n❌ No staff performance data in response');
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.end();
};

console.log('Testing Staff Performance API...');
console.log('NOTE: You may need to add JWT authentication token');
testEndpoint('day');
setTimeout(() => testEndpoint('month'), 1000);




