const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'frontend/src/components/admin/AdminMenu.tsx',
  'frontend/src/components/admin/AdminActivityLogs.tsx',
  'frontend/src/components/admin/AdminStaff.tsx',
  'frontend/src/components/customer/CustomerEventForm.tsx',
  'frontend/src/components/customer/CustomerFeedback.tsx',
  'frontend/src/components/customer/CustomerLoyalty.tsx',
  'frontend/src/components/customer/CustomerOrders.tsx',
  'frontend/src/components/customer/CustomerMenu.tsx',
  'frontend/src/components/POS/SimplePOS.tsx',
  'frontend/src/components/staff/StaffLoyalty.tsx',
  'frontend/src/components/admin/AdminLoyalty.tsx',
  'frontend/src/components/POS/WorkingPOS.tsx',
  'frontend/src/components/admin/AdminOrders.tsx',
  'frontend/src/components/admin/AdminSales.tsx',
  'frontend/src/components/admin/AdminDashboard.tsx',
  'frontend/src/components/admin/AdminEvents.tsx',
  'frontend/src/components/customer/CustomerDashboardNavbar.tsx',
  'frontend/src/components/admin/AdminFeedback.tsx',
  'frontend/src/components/admin/EnhancedInventory.tsx',
  'frontend/src/pages/POSPage.tsx',
  'frontend/src/components/staff/StaffOrders.tsx',
  'frontend/src/components/customer/CustomerOrderTracking.tsx',
  'frontend/src/components/staff/StaffPOS.tsx'
];

function fixSocketConnection(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Fix patterns
  const patterns = [
    // Pattern 1: io(API_URL)
    {
      from: /const newSocket = io\(API_URL\);/g,
      to: 'const newSocket = io();'
    },
    // Pattern 2: io(import.meta.env.VITE_API_URL || 'http://localhost:5001')
    {
      from: /const newSocket = io\(import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:5001'\);/g,
      to: 'const newSocket = io();'
    },
    // Pattern 3: io(API_URL) with API_URL defined above
    {
      from: /const API_URL = import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:5001';\s*const newSocket = io\(API_URL\);/g,
      to: 'const newSocket = io();'
    },
    // Pattern 4: io(API_URL) with API_URL defined above (multiline)
    {
      from: /const API_URL = import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:5001';\s*\n\s*const newSocket = io\(API_URL\);/g,
      to: 'const newSocket = io();'
    }
  ];

  let changed = false;
  patterns.forEach(pattern => {
    if (pattern.from.test(content)) {
      content = content.replace(pattern.from, pattern.to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

console.log('Fixing Socket.IO connections...');
filesToFix.forEach(fixSocketConnection);
console.log('Done!');
