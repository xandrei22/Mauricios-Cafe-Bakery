# 🍳 Ingredient Deduction System Setup Guide

## Overview

The **Ingredient Deduction System** automatically deducts ingredients from inventory whenever a payment is completed, regardless of the payment method used. This ensures accurate stock levels and prevents overselling.

## ✨ What's Been Fixed

### 1. **Payment Integration**
- ✅ **Actual Payment Service** - GCash, PayMaya callbacks now trigger ingredient deduction
- ✅ **Development Payment Service** - Simulated payments trigger ingredient deduction  
- ✅ **Payment QR Service** - QR code payments trigger ingredient deduction
- ✅ **Order Routes** - Manual payment verification triggers ingredient deduction
- ✅ **Admin/Staff Routes** - Cash payment verification triggers ingredient deduction

### 2. **Database Trigger System**
- ✅ **Automatic Trigger** - Database trigger fires when `payment_status` changes to 'paid'
- ✅ **Queue System** - Failed deductions are queued and retried automatically
- ✅ **Logging** - All deduction activities are logged for audit purposes

### 3. **Background Processing**
- ✅ **Queue Service** - Processes ingredient deductions in the background
- ✅ **Retry Logic** - Failed deductions are retried up to 3 times
- ✅ **Error Handling** - Graceful handling of deduction failures

## 🚀 Setup Instructions

### Step 1: Database Setup

Run the database trigger setup script:

```bash
cd backend
node scripts/setup-ingredient-deduction-trigger.js
```

This will create:
- Database trigger on `orders` table
- `ingredient_deduction_queue` table
- `system_logs` table

### Step 2: Start the System

#### Option A: Automatic (Recommended)
The ingredient deduction queue service will start automatically when you start your main server:

```bash
cd backend
npm start
# or
node server.js
```

#### Option B: Manual
If you want to run the queue service separately:

```bash
cd backend
node scripts/init-ingredient-deduction.js
```

### Step 3: Verify Setup

Check that the system is running:

```bash
# Check if tables exist
mysql -u your_user -p your_database -e "SHOW TABLES LIKE 'ingredient_deduction_queue';"

# Check if trigger exists
mysql -u your_user -p your_database -e "SHOW TRIGGERS LIKE 'orders';"
```

## 🧪 Testing the System

### Test 1: Complete a Payment

1. **Create an order** with menu items that have ingredients
2. **Complete payment** using any method:
   - GCash/PayMaya QR payment
   - Cash payment (staff verification)
   - Development payment simulation
3. **Check inventory** - ingredients should be deducted automatically

### Test 2: Monitor the Queue

Check the ingredient deduction queue:

```sql
SELECT * FROM ingredient_deduction_queue ORDER BY created_at DESC LIMIT 5;
```

Expected statuses:
- `pending` - Waiting to be processed
- `processing` - Currently being processed
- `completed` - Successfully processed
- `failed` - Failed after max retries

### Test 3: Check System Logs

Monitor system activity:

```sql
SELECT * FROM system_logs WHERE action LIKE '%ingredient%' ORDER BY created_at DESC LIMIT 10;
```

## 📊 Monitoring and Debugging

### Queue Service Status

The queue service processes items every 10 seconds. You'll see logs like:

```
🍳 Ingredient deduction queue service started
Processing 2 pending ingredient deductions...
✅ Ingredient deduction completed for order 123
✅ Ingredient deduction completed for order 124
```

### Common Issues and Solutions

#### Issue: "No ingredients found for menu item"
**Cause**: Menu item doesn't have ingredient recipes configured
**Solution**: Add ingredient recipes in `menu_item_ingredients` table

#### Issue: "Insufficient stock"
**Cause**: Not enough inventory for the order
**Solution**: Restock ingredients or reduce order quantity

#### Issue: "Unit conversion failed"
**Cause**: Mismatched units between recipe and inventory
**Solution**: Check ingredient units in `ingredients` table

### Manual Queue Management

#### Retry Failed Items
```javascript
const queueService = require('./services/ingredientDeductionQueueService');
await queueService.retryFailedItems();
```

#### Check Queue Status
```javascript
const status = await queueService.getQueueStatus();
console.log(status);
```

#### Clean Up Old Items
```javascript
await queueService.cleanupOldItems(7); // Keep last 7 days
```

## 🔧 Configuration

### Queue Processing Settings

Edit `backend/services/ingredientDeductionQueueService.js`:

```javascript
this.retryDelay = 5000;        // 5 seconds between retries
this.maxRetries = 3;           // Max retry attempts
// Check every 10 seconds
this.processingInterval = setInterval(() => {
    this.processQueue();
}, 10000);
```

### Database Trigger

The trigger automatically fires when:
- `payment_status` changes from anything to `'paid'`
- This covers ALL payment methods automatically

## 📈 Performance Considerations

### Queue Processing
- Processes up to 10 items per cycle
- Runs every 10 seconds
- Non-blocking (doesn't affect payment processing)

### Database Impact
- Trigger adds minimal overhead to payment updates
- Queue processing uses separate connections
- Failed deductions don't block successful payments

### Scaling
- Queue service can be run on separate processes
- Multiple queue workers can be added
- Database trigger ensures no deductions are missed

## 🚨 Troubleshooting

### Queue Service Not Starting

1. **Check database connection**
2. **Verify tables exist**
3. **Check for JavaScript errors**
4. **Run manually**: `node scripts/init-ingredient-deduction.js`

### Deductions Not Happening

1. **Check queue service logs**
2. **Verify database trigger exists**
3. **Check ingredient recipes exist**
4. **Verify payment status is 'paid'**

### Performance Issues

1. **Reduce queue processing frequency**
2. **Increase items processed per cycle**
3. **Add database indexes**
4. **Monitor database performance**

## 📝 Log Files

### System Logs
All ingredient deduction activities are logged to `system_logs` table:
- `ingredient_deduction_triggered` - Trigger fired
- `ingredient_deduction_success` - Deduction completed
- `ingredient_deduction_failure` - Deduction failed

### Console Logs
Queue service provides real-time console output:
- Processing status
- Success/failure messages
- Retry attempts
- System health

## 🎯 Best Practices

1. **Always test** with small orders first
2. **Monitor queue status** regularly
3. **Set up alerts** for failed deductions
4. **Regular cleanup** of old queue items
5. **Backup database** before major changes

## 🔗 Related Files

- `backend/services/ingredientDeductionService.js` - Core deduction logic
- `backend/services/ingredientDeductionQueueService.js` - Queue processing
- `backend/config/ingredient-deduction-trigger.sql` - Database trigger
- `backend/scripts/setup-ingredient-deduction-trigger.js` - Setup script
- `backend/scripts/init-ingredient-deduction.js` - Initialization script

## 📞 Support

If you encounter issues:

1. **Check console logs** for error messages
2. **Verify database setup** with setup script
3. **Test with simple orders** first
4. **Check ingredient recipes** exist for menu items
5. **Monitor queue status** for processing issues

---

**🎉 Your ingredient deduction system is now fully automated and will deduct ingredients from inventory every time a payment is completed!**
