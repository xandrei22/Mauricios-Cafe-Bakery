# 🧪 **Development Payment System Setup - No Business Account Required**

## 🎯 **Perfect for Testing Without Business Accounts!**

This development setup allows you to test the complete payment system using **simulated payments** without needing real GCash or PayMaya business accounts. Perfect for development, testing, and demonstrations!

## 🚀 **How It Works (Development Mode)**

### **Digital Payments (Simulated)**
1. **Customer places order** → Staff generates simulated QR code
2. **Staff simulates payment** → Order automatically marked as paid
3. **Real-time updates** → Order appears as paid in POS
4. **Complete workflow** → Test the entire payment flow

### **Cash Payments (Real)**
1. **Customer places order** → Staff selects cash payment
2. **Customer pays at counter** → Staff verifies amount received
3. **Staff processes payment** → Order marked as paid
4. **Real-time updates** → Order ready for pickup

## 🔧 **Quick Setup (No Business Registration Required!)**

### **1. Environment Variables**
Create `.env` file in your backend directory:

```env
# Development Configuration
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5001

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=coffee_shop

# Session Secret
SESSION_SECRET=your-secret-key-here
```

### **2. Database Setup**
Run these SQL commands to create required tables:

```sql
-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    reference VARCHAR(255),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    staff_id VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Staff activities table
CREATE TABLE IF NOT EXISTS staff_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    order_id VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_staff_activities_staff_id ON staff_activities(staff_id);
```

### **3. Install Dependencies**
```bash
# Backend dependencies
cd backend
npm install qrcode uuid crypto axios

# Frontend dependencies (if not already installed)
cd ../frontend
npm install
```

## 📱 **Development API Endpoints**

### **QR Code Generation (Simulated)**
```http
POST /api/payment/gcash/qr/:orderId
POST /api/payment/paymaya/qr/:orderId
```

**Request Body:**
```json
{
  "tableNumber": 1
}
```

**Response:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "paymentUrl": "gcash://pay?amount=150.00&reference=GCASH-DEV-ORD-123...",
  "orderId": "ORD-1234567890",
  "amount": 150.00,
  "reference": "GCASH-DEV-ORD-1234567890-1703123456789",
  "gcashPaymentId": "gcash_dev_123456",
  "devMode": true,
  "message": "DEV MODE: This is a simulated QR code for testing"
}
```

### **Simulate Payment Processing**
```http
POST /api/payment/simulate/:orderId/:method
```

**Example:**
```bash
curl -X POST http://localhost:5001/api/payment/simulate/ORD-1234567890/gcash \
  -H "Content-Type: application/json" \
  -d '{"amount": 150.00}'
```

### **Cash Payment Processing (Real)**
```http
POST /api/payment/cash/:orderId
```

**Request Body:**
```json
{
  "amount": 150.00,
  "staffId": "staff_123",
  "notes": "Customer paid with exact amount"
}
```

### **Development Info**
```http
GET /api/payment/dev-info
```

## 🎮 **Testing the System**

### **1. Start the Servers**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **2. Test Digital Payment Flow**

#### **Step 1: Create Test Order**
```bash
curl -X POST http://localhost:5001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test Customer",
    "tableNumber": 1,
    "items": [
      {
        "menuItemId": 1,
        "quantity": 2,
        "customizations": ["extra shot", "almond milk"]
      }
    ],
    "paymentMethod": "gcash",
    "totalPrice": 150.00
  }'
```

#### **Step 2: Generate QR Code**
```bash
curl -X POST http://localhost:5001/api/payment/gcash/qr/ORD-1234567890 \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 1}'
```

#### **Step 3: Simulate Payment**
```bash
curl -X POST http://localhost:5001/api/payment/simulate/ORD-1234567890/gcash \
  -H "Content-Type: application/json" \
  -d '{"amount": 150.00}'
```

### **3. Test Cash Payment Flow**

#### **Step 1: Create Cash Order**
```bash
curl -X POST http://localhost:5001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Cash Customer",
    "tableNumber": 2,
    "items": [
      {
        "menuItemId": 2,
        "quantity": 1,
        "customizations": ["no sugar"]
      }
    ],
    "paymentMethod": "cash",
    "totalPrice": 120.00
  }'
```

#### **Step 2: Process Cash Payment**
```bash
curl -X POST http://localhost:5001/api/payment/cash/ORD-1234567891 \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 120.00,
    "staffId": "staff_123",
    "notes": "Customer paid with exact amount"
  }'
```

## 🎨 **Frontend Testing**

### **1. Access POS Dashboard**
- Go to: `http://localhost:5173/admin/pos`
- You'll see the POS dashboard with simulated payment options

### **2. Test Payment Processing**
1. **Create an order** with GCash or PayMaya payment method
2. **Generate QR code** - you'll see a simulated QR code
3. **Simulate payment** - use the simulate endpoint or frontend button
4. **Verify real-time updates** - order status changes instantly

### **3. Test Cash Payments**
1. **Create an order** with cash payment method
2. **Select cash payment** in POS
3. **Enter amount received** and verify
4. **Process payment** with staff authentication

## 🔍 **Development Features**

### **✅ What Works in Development Mode:**
- **Simulated QR codes** for GCash and PayMaya
- **Payment simulation** with realistic delays
- **Real cash payments** with staff verification
- **Real-time updates** via Socket.IO
- **Complete transaction logging**
- **Staff activity tracking**
- **Payment history** and status checking

### **✅ What's Different from Production:**
- **No real money** involved
- **Simulated payment processing**
- **DEV MODE indicators** in responses
- **No actual payment provider APIs**
- **No webhook callbacks** from real providers

## 🧪 **Testing Scenarios**

### **Scenario 1: Digital Payment Success**
1. Create order with GCash payment
2. Generate QR code
3. Simulate successful payment
4. Verify order marked as paid
5. Check real-time updates

### **Scenario 2: Cash Payment with Change**
1. Create order with cash payment
2. Process cash payment with amount > total
3. Verify change calculation
4. Check staff activity log

### **Scenario 3: Payment Failure**
1. Create order with PayMaya payment
2. Generate QR code
3. Simulate payment failure
4. Verify error handling

### **Scenario 4: Multiple Orders**
1. Create multiple orders
2. Process payments simultaneously
3. Verify real-time updates for all orders
4. Check transaction history

## 📊 **Monitoring & Debugging**

### **1. Check Payment Status**
```bash
curl http://localhost:5001/api/payment/status/ORD-1234567890
```

### **2. View Payment History**
```bash
curl http://localhost:5001/api/payment/history/ORD-1234567890
```

### **3. Check Development Info**
```bash
curl http://localhost:5001/api/payment/dev-info
```

### **4. Monitor Real-time Updates**
- Open browser console
- Watch for Socket.IO events
- Check for payment-updated events

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **1. QR Code Not Generating**
```bash
# Check if server is running
curl http://localhost:5001/api/health

# Check order exists
curl http://localhost:5001/api/orders/ORD-1234567890
```

#### **2. Payment Not Processing**
```bash
# Check database connection
mysql -u root -p coffee_shop -e "SELECT * FROM orders WHERE order_id = 'ORD-1234567890';"

# Check payment transactions
mysql -u root -p coffee_shop -e "SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;"
```

#### **3. Real-time Updates Not Working**
```bash
# Check Socket.IO connection
netstat -an | grep :5001

# Check browser console for Socket.IO errors
```

## 🎉 **Benefits of Development Mode**

### **✅ For Development:**
- **No business registration** required
- **Instant setup** and testing
- **No real money** involved
- **Complete workflow** testing
- **Real-time updates** working

### **✅ For Testing:**
- **Multiple scenarios** testing
- **Error handling** verification
- **Performance testing** possible
- **UI/UX testing** complete

### **✅ For Demonstration:**
- **Full system showcase** without costs
- **Client presentations** ready
- **Training sessions** possible
- **Proof of concept** complete

## 🚀 **Next Steps**

### **For Development:**
1. **Test all payment flows** thoroughly
2. **Verify real-time updates** work correctly
3. **Test error scenarios** and edge cases
4. **Document any issues** found

### **For Production:**
1. **Register business accounts** with GCash and PayMaya
2. **Get API credentials** and configure webhooks
3. **Set NODE_ENV=production** in environment
4. **Test with real payment providers**

## 📞 **Support**

### **Development Issues:**
- Check the console logs for errors
- Verify database tables are created
- Ensure all dependencies are installed
- Check environment variables are set

### **Getting Help:**
- Review the API responses for error messages
- Check the development info endpoint
- Monitor the server logs for detailed errors

**🎉 You now have a complete payment system for development and testing without needing real business accounts! The simulated system provides the full experience while keeping costs at zero.** 💳☕ 