# 💳 **QR Payment System - GCash & PayMaya Integration**

## 🎯 **Overview**
This system allows customers to scan QR codes to pay for their orders using GCash or PayMaya. When customers scan the QR code, their order is automatically processed and marked as paid in real-time.

## 🚀 **How It Works**

### **1. Order Creation Flow**
1. **Customer places order** through the menu system
2. **Staff generates QR code** for payment (GCash or PayMaya)
3. **Customer scans QR code** with their mobile app
4. **Payment is processed** automatically
5. **Order status updates** in real-time
6. **Customer sees success page** with confirmation

### **2. QR Code Generation**
- **GCash QR**: Green-themed QR code with GCash payment data
- **PayMaya QR**: Blue-themed QR code with PayMaya payment data
- **Payment URL**: Contains order details, amount, and reference number
- **Security**: Signed with merchant credentials for verification

### **3. Payment Processing**
- **Automatic verification** of payment amount
- **Real-time status updates** via Socket.IO
- **Database updates** for order and payment records
- **Webhook support** for production payment confirmations

## 🔧 **Setup Instructions**

### **1. Environment Variables**
Add these to your `.env` file:

```env
# Payment Provider Configuration
GCASH_MERCHANT_ID=your_gcash_merchant_id
GCASH_API_KEY=your_gcash_api_key
GCASH_WEBHOOK_SECRET=your_gcash_webhook_secret

PAYMAYA_MERCHANT_ID=your_paymaya_merchant_id
PAYMAYA_API_KEY=your_paymaya_api_key
PAYMAYA_WEBHOOK_SECRET=your_paymaya_webhook_secret

# Application URLs
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:5001
```

### **2. Database Schema**
The system uses these tables:

```sql
-- Orders table (already exists)
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) UNIQUE NOT NULL,
    customer_id INT,
    customer_name VARCHAR(255),
    table_number INT,
    items JSON,
    total_price DECIMAL(10,2),
    payment_method ENUM('cash', 'gcash', 'paymaya'),
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_time TIMESTAMP NULL
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    reference VARCHAR(255),
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
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
  "paymentUrl": "http://localhost:5001/api/payment/gcash/process?...",
  "orderId": "ORD-1234567890",
  "amount": 150.00,
  "reference": "GCASH-ORD-1234567890-1703123456789"
}
```

### **Payment Processing**
```http
GET /api/payment/gcash/process
GET /api/payment/paymaya/process
```

**Query Parameters:**
- `orderId`: Order ID
- `amount`: Payment amount
- `reference`: Payment reference
- `tableNumber`: Table number (optional)
- `timestamp`: Payment timestamp

### **Payment Status**
```http
GET /api/payment/status/:orderId
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORD-1234567890",
  "paymentStatus": "paid",
  "paymentMethod": "gcash",
  "amount": 150.00,
  "createdAt": "2023-12-21T10:30:00Z",
  "completedAt": "2023-12-21T10:32:15Z"
}
```

### **Webhooks (Production)**
```http
POST /api/payment/gcash/webhook
POST /api/payment/paymaya/webhook
```

## 🎨 **Frontend Integration**

### **1. Payment Success Page**
- **Route**: `/payment-success`
- **Features**: 
  - Payment confirmation display
  - Order details
  - Next steps information
  - Navigation to menu/home

### **2. POS Payment Processor**
- **Enhanced QR generation** for GCash and PayMaya
- **Real-time payment updates**
- **Automatic order status changes**

### **3. Customer Experience**
- **QR code scanning** with mobile apps
- **Automatic redirect** to success page
- **Real-time order tracking**

## 🔒 **Security Features**

### **1. Payment Verification**
- **Amount validation** against order total
- **Order existence** verification
- **Duplicate payment** prevention
- **Signature verification** for webhooks

### **2. Data Protection**
- **Encrypted payment data** in QR codes
- **Secure webhook signatures**
- **Transaction logging** for audit trails

### **3. Error Handling**
- **Invalid payment** rejection
- **Network error** recovery
- **Timeout handling** for payments

## 🧪 **Testing the System**

### **1. Development Testing**
```bash
# Start the backend server
cd backend
npm start

# Start the frontend
cd frontend
npm run dev

# Test QR code generation
curl -X POST http://localhost:5001/api/payment/gcash/qr/ORD-1234567890 \
  -H "Content-Type: application/json" \
  -d '{"tableNumber": 1}'
```

### **2. Payment Simulation**
1. **Generate QR code** for an order
2. **Scan QR code** with mobile app (or simulate)
3. **Verify payment** appears in POS
4. **Check order status** updates
5. **Confirm success page** displays correctly

### **3. Real-time Updates**
- **Open POS dashboard** in one browser
- **Process payment** in another
- **Verify real-time updates** appear instantly

## 🚀 **Production Deployment**

### **1. Payment Provider Setup**
- **Register merchant account** with GCash/PayMaya
- **Get API credentials** and webhook URLs
- **Configure webhook endpoints** in your server
- **Test payment flows** in sandbox environment

### **2. SSL Certificate**
- **HTTPS required** for payment processing
- **Valid SSL certificate** for webhook endpoints
- **Secure cookie settings** for sessions

### **3. Environment Configuration**
```env
# Production environment variables
NODE_ENV=production
GCASH_MERCHANT_ID=prod_merchant_id
GCASH_API_KEY=prod_api_key
GCASH_WEBHOOK_SECRET=prod_webhook_secret
PAYMAYA_MERCHANT_ID=prod_merchant_id
PAYMAYA_API_KEY=prod_api_key
PAYMAYA_WEBHOOK_SECRET=prod_webhook_secret
FRONTEND_URL=https://yourdomain.com
API_URL=https://yourdomain.com
```

## 📊 **Monitoring & Analytics**

### **1. Payment Tracking**
- **Transaction logs** in database
- **Payment success rates**
- **Average processing times**
- **Error rate monitoring**

### **2. Real-time Dashboard**
- **Live payment status**
- **Order completion rates**
- **Revenue tracking**
- **Customer satisfaction**

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. QR Code Not Generating**
- Check API endpoint availability
- Verify order exists in database
- Check payment provider credentials

#### **2. Payment Not Processing**
- Verify payment amount matches order
- Check webhook signature validation
- Ensure order is not already paid

#### **3. Real-time Updates Not Working**
- Check Socket.IO connection
- Verify room joining logic
- Check network connectivity

### **Debug Commands**
```bash
# Check payment service logs
tail -f backend/logs/payment.log

# Test webhook endpoint
curl -X POST http://localhost:5001/api/payment/gcash/webhook \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test", "status": "success"}'

# Verify database records
mysql -u root -p coffee_shop -e "SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;"
```

## 🎉 **Benefits**

### **✅ For Customers**
- **Quick and easy** payment process
- **No cash needed** - digital payments only
- **Instant confirmation** of payment
- **Secure transactions** with encryption

### **✅ For Staff**
- **Automatic order processing** when payment received
- **Real-time updates** in POS system
- **Reduced manual work** for payment handling
- **Better customer experience**

### **✅ For Business**
- **Faster service** with digital payments
- **Reduced cash handling** and security risks
- **Better tracking** of transactions
- **Improved customer satisfaction**

## 🚀 **Next Steps**

1. **Test the system** thoroughly in development
2. **Set up production** payment provider accounts
3. **Configure webhooks** for live payment confirmations
4. **Train staff** on the new payment system
5. **Monitor performance** and customer feedback

**Your coffee shop now has a complete QR payment system that automatically processes orders when customers scan GCash or PayMaya QR codes!** 💳☕ 