# 💳 **Actual Payment System Setup - GCash & PayMaya Integration**

## 🎯 **Overview**
This guide will help you set up the actual payment system where customers can scan your real GCash and PayMaya QR codes to automatically process their orders. For cash payments, staff must verify the payment at the counter before processing.

## 🚀 **How It Works**

### **Digital Payments (GCash/PayMaya)**
1. **Customer places order** → Staff generates QR code
2. **Customer scans QR** with mobile app → Payment processed automatically
3. **Order marked as paid** → Real-time updates in POS
4. **Customer sees success page** → Order ready for pickup

### **Cash Payments**
1. **Customer places order** → Staff selects cash payment
2. **Customer pays at counter** → Staff verifies amount received
3. **Staff processes payment** → Order marked as paid
4. **Real-time updates** → Order ready for pickup

## 🔧 **Setup Requirements**

### **1. Payment Provider Accounts**

#### **GCash Business Account**
- Register at [GCash Business Portal](https://business.gcash.com)
- Complete merchant verification
- Get API credentials:
  - Merchant ID
  - API Key
  - Secret Key
  - Webhook Secret

#### **PayMaya Business Account**
- Register at [PayMaya Business Portal](https://business.paymaya.com)
- Complete merchant verification
- Get API credentials:
  - Merchant ID
  - API Key
  - Secret Key
  - Webhook Secret

### **2. Environment Variables**
Add these to your `.env` file:

```env
# GCash Configuration
GCASH_MERCHANT_ID=your_gcash_merchant_id
GCASH_API_KEY=your_gcash_api_key
GCASH_SECRET_KEY=your_gcash_secret_key
GCASH_WEBHOOK_SECRET=your_gcash_webhook_secret
GCASH_API_URL=https://api.gcash.com

# PayMaya Configuration
PAYMAYA_MERCHANT_ID=your_paymaya_merchant_id
PAYMAYA_API_KEY=your_paymaya_api_key
PAYMAYA_SECRET_KEY=your_paymaya_secret_key
PAYMAYA_WEBHOOK_SECRET=your_paymaya_webhook_secret
PAYMAYA_API_URL=https://api.paymaya.com

# Application Configuration
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
API_URL=https://yourdomain.com
```

### **3. Database Schema**
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

-- Staff activities table (for cash payment tracking)
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

## 📱 **API Endpoints**

### **QR Code Generation**
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
  "paymentUrl": "gcash://pay?amount=150.00&reference=GCASH-ORD-123...",
  "orderId": "ORD-1234567890",
  "amount": 150.00,
  "reference": "GCASH-ORD-1234567890-1703123456789",
  "gcashPaymentId": "gcash_payment_123456"
}
```

### **Cash Payment Processing**
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

### **Payment Callbacks (Webhooks)**
```http
POST /api/payment/gcash/callback
POST /api/payment/paymaya/callback
```

## 🔒 **Security Features**

### **1. Payment Verification**
- **Amount validation** against order total
- **Order existence** verification
- **Duplicate payment** prevention
- **Staff authentication** for cash payments

### **2. Webhook Security**
- **Signature verification** for all callbacks
- **HMAC-SHA256** encryption
- **Request validation** and sanitization

### **3. Transaction Logging**
- **Complete audit trail** for all payments
- **Staff activity tracking** for cash payments
- **Payment history** for each order

## 🎨 **Frontend Integration**

### **1. Payment Success Page**
- **Route**: `/payment-success`
- **Features**: Payment confirmation, order details, next steps

### **2. POS Payment Processor**
- **QR code generation** for digital payments
- **Cash payment modal** with staff verification
- **Real-time updates** via Socket.IO

### **3. Staff Authentication**
- **Staff ID required** for cash payments
- **Activity logging** for accountability
- **Payment verification** workflow

## 🚀 **Production Deployment**

### **1. SSL Certificate**
- **HTTPS required** for payment processing
- **Valid SSL certificate** for webhook endpoints
- **Secure cookie settings** for sessions

### **2. Webhook Configuration**
Configure webhook URLs in your payment provider dashboards:

**GCash Webhook URL:**
```
https://yourdomain.com/api/payment/gcash/callback
```

**PayMaya Webhook URL:**
```
https://yourdomain.com/api/payment/paymaya/callback
```

### **3. Environment Setup**
```bash
# Install dependencies
npm install axios crypto uuid qrcode

# Set environment variables
export NODE_ENV=production
export GCASH_MERCHANT_ID=your_merchant_id
export GCASH_API_KEY=your_api_key
# ... (all other environment variables)

# Start the server
npm start
```

## 🧪 **Testing the System**

### **1. Development Testing**
```bash
# Start backend server
cd backend
npm start

# Start frontend
cd frontend
npm run dev

# Test QR code generation
curl -X POST http://localhost:5001/api/payment/gcash/qr/ORD-1234567890 \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 1}'
```

### **2. Payment Flow Testing**

#### **Digital Payment Flow:**
1. **Create test order** with GCash/PayMaya payment method
2. **Generate QR code** from POS
3. **Scan QR code** with mobile app
4. **Verify payment** appears in POS automatically
5. **Check success page** displays correctly

#### **Cash Payment Flow:**
1. **Create test order** with cash payment method
2. **Select cash payment** in POS
3. **Enter amount received** and verify
4. **Process payment** with staff authentication
5. **Verify order** marked as paid

### **3. Real-time Updates Testing**
- **Open POS dashboard** in one browser
- **Process payment** in another
- **Verify real-time updates** appear instantly

## 📊 **Monitoring & Analytics**

### **1. Payment Tracking**
```sql
-- Get payment statistics
SELECT 
    payment_method,
    COUNT(*) as total_payments,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount
FROM payment_transactions 
WHERE status = 'completed'
GROUP BY payment_method;

-- Get staff activity
SELECT 
    staff_id,
    action,
    COUNT(*) as activity_count
FROM staff_activities 
WHERE action = 'cash_payment_verified'
GROUP BY staff_id, action;
```

### **2. Error Monitoring**
- **Payment failures** logging
- **Webhook errors** tracking
- **API response** monitoring
- **Transaction status** alerts

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. QR Code Not Generating**
```bash
# Check API credentials
echo $GCASH_MERCHANT_ID
echo $GCASH_API_KEY

# Check API connectivity
curl -X GET https://api.gcash.com/health
```

#### **2. Payment Not Processing**
```bash
# Check webhook endpoint
curl -X POST https://yourdomain.com/api/payment/gcash/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check database connection
mysql -u root -p -e "SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;"
```

#### **3. Real-time Updates Not Working**
```bash
# Check Socket.IO connection
netstat -an | grep :5001

# Check client connection
# Open browser console and look for Socket.IO errors
```

### **Debug Commands**
```bash
# Check payment service logs
tail -f backend/logs/payment.log

# Monitor webhook requests
tail -f /var/log/nginx/access.log | grep callback

# Check database transactions
mysql -u root -p coffee_shop -e "
SELECT 
    pt.order_id,
    pt.payment_method,
    pt.amount,
    pt.status,
    pt.created_at,
    o.payment_status
FROM payment_transactions pt
JOIN orders o ON pt.order_id = o.order_id
ORDER BY pt.created_at DESC
LIMIT 10;
"
```

## 🎉 **Benefits**

### **✅ For Customers**
- **Quick digital payments** - scan and pay
- **No cash needed** - digital payments only
- **Instant confirmation** of payment
- **Secure transactions** with encryption

### **✅ For Staff**
- **Automatic processing** for digital payments
- **Staff verification** for cash payments
- **Real-time updates** in POS system
- **Activity tracking** for accountability

### **✅ For Business**
- **Faster service** with digital payments
- **Reduced cash handling** and security risks
- **Complete audit trail** for all transactions
- **Better customer experience**

## 🚀 **Next Steps**

1. **Register business accounts** with GCash and PayMaya
2. **Get API credentials** and configure webhooks
3. **Set up SSL certificate** for production
4. **Test payment flows** thoroughly
5. **Train staff** on the new payment system
6. **Monitor performance** and customer feedback

## 📞 **Support**

### **GCash Business Support**
- Email: business@gcash.com
- Phone: +63 2 8888 8888
- Documentation: https://business.gcash.com/docs

### **PayMaya Business Support**
- Email: business@paymaya.com
- Phone: +63 2 8888 9999
- Documentation: https://business.paymaya.com/docs

**Your coffee shop now has a complete payment system that automatically processes orders when customers scan your real GCash and PayMaya QR codes, with staff verification required for cash payments!** 💳☕ 