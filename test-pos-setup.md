# 🎯 POS System Testing Guide

## ✅ **You Already Have Complete Backend Logic!**

Your backend already includes:
- ✅ Order management with table numbers
- ✅ Payment processing (cash, GCash, PayMaya)
- ✅ QR code generation
- ✅ Real-time updates via Socket.IO
- ✅ Inventory management
- ✅ Order statistics

## 🚀 **How to Test the POS System:**

### **Step 1: Start the Backend Server**
```bash
cd backend
npm start
```

### **Step 2: Create Test Data**
```bash
cd backend
node test-pos.js
```

This will create:
- 3 test customers
- 4 test orders (different statuses)
- Updated ingredient stock levels

### **Step 3: Install Frontend Dependencies**
```bash
cd frontend
npm install
```

### **Step 4: Start the Frontend**
```bash
cd frontend
npm run dev
```

### **Step 5: Access the POS System**
1. Go to: `http://localhost:5173/admin/pos`
2. Or navigate through: Admin Portal → POS System

## 🎮 **What You Can Test:**

### **Order Management:**
- ✅ View all orders with different statuses
- ✅ Update order status (pending → preparing → ready → completed)
- ✅ Cancel orders
- ✅ Filter orders by status

### **Table Management:**
- ✅ View all tables (1-10)
- ✅ See table status (available/occupied)
- ✅ View current orders per table
- ✅ Track table revenue and duration

### **Payment Processing:**
- ✅ Process cash payments
- ✅ Generate QR codes for GCash/PayMaya
- ✅ Mark payments as completed
- ✅ View payment statistics

### **Inventory Management:**
- ✅ View all ingredients
- ✅ See low stock alerts
- ✅ Adjust stock levels
- ✅ Monitor inventory status

### **Real-time Features:**
- ✅ Live order notifications
- ✅ Instant status updates
- ✅ Payment confirmations

## 📊 **Test Data Created:**

### **Orders:**
- **ORD-TEST-001**: Table 1, Pending, Cash payment
- **ORD-TEST-002**: Table 3, Preparing, GCash (paid)
- **ORD-TEST-003**: Table 5, Ready, PayMaya (pending)
- **ORD-TEST-004**: Table 2, Completed, Cash (paid)

### **Customers:**
- Test Customer 1 (50 points, vegetarian)
- Test Customer 2 (25 points, gluten-free)
- Test Customer 3 (100 points)

### **Inventory:**
- Coffee Beans: 50 units
- Milk: 3 units (low stock alert)
- Sugar: 100 units
- Vanilla Syrup: 5 units (low stock alert)

## 🎯 **Quick Test Scenarios:**

1. **Process a Pending Order:**
   - Go to Orders tab
   - Click "Start Preparing" on ORD-TEST-001
   - Watch status change to "Preparing"

2. **Process Payment:**
   - Go to Payments tab
   - Select ORD-TEST-003
   - Click "Generate Payment QR Code"
   - Click "Mark as Paid"

3. **Check Table Status:**
   - Go to Tables tab
   - Click on Table 1 to see order details
   - View order history

4. **Manage Inventory:**
   - Go to Inventory tab
   - See low stock alerts for Milk and Vanilla Syrup
   - Click on an item to adjust stock

## 🔧 **Environment Setup:**

Create `frontend/.env` file:
```
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
```

## 🎉 **You're Ready to Test!**

The POS system is fully functional with:
- ✅ Complete backend API
- ✅ Real-time updates
- ✅ Table-based ordering
- ✅ Payment processing
- ✅ Inventory management
- ✅ Beautiful UI components

Just follow the steps above and you'll have a working POS system to test! 