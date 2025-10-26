# 🍳 Automatic Ingredient Deduction System

## Overview

The **Automatic Ingredient Deduction System** automatically deducts ingredients from inventory whenever an order is placed. This ensures accurate stock levels, prevents overselling, and provides real-time inventory tracking.

## ✨ Features

- **🔄 Automatic Deduction**: Ingredients are automatically deducted when orders are placed
- **📊 Real-time Tracking**: All inventory changes are logged with timestamps
- **🎯 Customization Support**: Extra ingredients for customizations are automatically calculated
- **⚠️ Low Stock Alerts**: Automatic alerts when ingredients fall below reorder levels
- **📈 Usage Analytics**: Comprehensive reporting on ingredient usage patterns
- **🔄 Unit Conversion**: Automatic conversion between different measurement units
- **💾 Transaction History**: Complete audit trail of all inventory changes

## 🚀 How It Works

### 1. Order Placement Flow

```
Customer Places Order → System Validates Inventory → Order Created → Ingredients Deducted → Inventory Updated
```

### 2. Ingredient Calculation

For each menu item in an order:
- **Base Quantity**: Standard recipe amount
- **Order Quantity**: Number of items ordered
- **Customization Multipliers**: Extra ingredients for customizations
- **Unit Conversion**: Convert to actual inventory units

### 3. Inventory Update Process

1. **Check Stock**: Verify sufficient inventory exists
2. **Calculate Usage**: Determine total ingredients needed
3. **Update Stock**: Reduce inventory levels
4. **Log Transaction**: Record the change in transaction history
5. **Check Alerts**: Create low stock alerts if needed

## 🗄️ Database Schema

### Core Tables

#### `inventory_transactions`
Tracks all inventory changes:
- **transaction_type**: usage, restock, adjustment, waste, transfer
- **actual_amount**: Amount in actual inventory units
- **display_amount**: Amount in display units
- **order_id**: Associated order (for usage transactions)
- **menu_item_id**: Associated menu item (for usage transactions)

#### `low_stock_alerts`
Manages low stock notifications:
- **alert_type**: low_stock, out_of_stock, critical
- **status**: active, acknowledged, resolved
- **current_stock**: Current inventory level
- **reorder_level**: Threshold for alerts

#### `menu_item_ingredients`
Defines recipe requirements:
- **quantity**: Base amount needed per item
- **unit**: Unit of measurement
- **is_optional**: Whether ingredient is required

#### `order_ingredient_usage`
Tracks actual usage per order:
- **quantity_used**: Actual amount consumed
- **customization_details**: JSON data about customizations
- **unit**: Unit of measurement used

### Views

#### `ingredient_usage_summary`
Provides overview of ingredient status:
- Current stock levels
- Total usage and restocking
- Stock status (In Stock, Low Stock, Out of Stock)

#### `order_ingredient_summary`
Shows ingredient usage per order:
- Ingredients used per order
- Total quantities consumed
- Order details

## 🛠️ Setup Instructions

### 1. Run Setup Script

```bash
cd backend
node scripts/setup-ingredient-deduction.js
```

### 2. Verify Setup

The script will automatically verify:
- ✅ Required tables exist
- ✅ Views are created
- ✅ Sample data is populated
- ✅ Database structure is correct

### 3. Configure Recipes

Add ingredient requirements for menu items:

```sql
INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, quantity, unit) VALUES
(1, 1, 18, 'g'),      -- Espresso: 18g coffee beans
(1, 2, 30, 'ml'),     -- Espresso: 30ml water
(2, 1, 18, 'g'),      -- Americano: 18g coffee beans
(2, 2, 150, 'ml');    -- Americano: 150ml water
```

## 📱 API Endpoints

### Ingredient Deduction Service

The system automatically integrates with existing order endpoints:

- **POST** `/api/orders` - Admin/POS orders
- **POST** `/api/customer/place-order` - Customer orders
- **POST** `/api/staff/orders` - Staff orders

### Manual Inventory Operations

```javascript
const ingredientDeductionService = require('./services/ingredientDeductionService');

// Validate order fulfillment
const validation = await ingredientDeductionService.validateOrderFulfillment(orderItems);

// Manually deduct ingredients
const result = await ingredientDeductionService.deductIngredientsForOrder(orderId, orderItems);

// Get usage history
const usage = await ingredientDeductionService.getOrderIngredientUsage(orderId);
```

## 🎯 Customization Support

### Customization Multipliers

The system automatically calculates extra ingredients for customizations:

```javascript
const customizationMultipliers = {
    'extra_shot': { 'coffee_beans': 1.5, 'milk': 1.2 },
    'double_shot': { 'coffee_beans': 2.0, 'milk': 1.5 },
    'extra_syrup': { 'syrup': 1.3 },
    'extra_cream': { 'whipping_cream': 1.4, 'milk': 1.2 },
    'large_size': { 'milk': 1.3, 'syrup': 1.2, 'coffee_beans': 1.2 },
    'extra_ice': { 'ice': 1.5 }
};
```

### Example: Extra Shot Cappuccino

- **Base Recipe**: 18g coffee + 30ml water + 120ml milk
- **Extra Shot**: Coffee beans × 1.5 = 27g coffee
- **Total**: 27g coffee + 30ml water + 120ml milk

## 📊 Monitoring & Alerts

### Low Stock Alerts

Automatic alerts are created when:
- Stock falls below reorder level
- Stock reaches zero
- Critical threshold is reached

### Real-time Dashboard

Monitor inventory status:
- Current stock levels
- Recent transactions
- Low stock items
- Usage trends

## 🔧 Troubleshooting

### Common Issues

#### 1. "Insufficient Stock" Error

**Problem**: Order fails due to insufficient ingredients

**Solution**: 
- Check current inventory levels
- Restock ingredients
- Verify recipe quantities
- Check unit conversions

#### 2. Missing Ingredient Deductions

**Problem**: Orders created but ingredients not deducted

**Solution**:
- Check ingredient deduction service logs
- Verify menu_item_ingredients table has recipes
- Check database connection
- Review error logs

#### 3. Incorrect Quantities

**Problem**: Wrong amounts deducted

**Solution**:
- Verify recipe quantities in menu_item_ingredients
- Check unit conversions
- Review customization multipliers
- Validate ingredient units

### Debug Mode

Enable detailed logging:

```javascript
// In ingredientDeductionService.js
console.log('Debug: Processing ingredient:', {
    ingredientId: ingredient.ingredient_id,
    baseQuantity: ingredient.base_quantity,
    orderQuantity: quantity,
    totalRequired: totalRequired,
    currentStock: ingredient.current_stock
});
```

## 📈 Performance Optimization

### Database Indexes

The system includes optimized indexes:
- `idx_ingredient_id` on inventory_transactions
- `idx_order_id` on inventory_transactions
- `idx_status` on low_stock_alerts
- `idx_menu_item_id` on menu_item_ingredients

### Batch Operations

For bulk operations, use batch processing:
```javascript
// Process multiple orders at once
const batchResults = await Promise.all(
    orders.map(order => 
        ingredientDeductionService.deductIngredientsForOrder(order.id, order.items)
    )
);
```

## 🔒 Security Considerations

### Transaction Safety

- All operations use database transactions
- Automatic rollback on errors
- No partial updates
- Complete audit trail

### Access Control

- Service-level authentication
- Database user permissions
- Input validation
- SQL injection prevention

## 📚 Best Practices

### 1. Recipe Management

- Keep recipe quantities accurate
- Use consistent units
- Document customization effects
- Regular recipe reviews

### 2. Inventory Monitoring

- Set appropriate reorder levels
- Monitor usage patterns
- Regular stock counts
- Seasonal adjustments

### 3. System Maintenance

- Regular database backups
- Monitor transaction logs
- Clean up old alerts
- Performance monitoring

## 🚀 Future Enhancements

### Planned Features

- **Predictive Analytics**: Forecast ingredient needs
- **Supplier Integration**: Automatic reordering
- **Waste Tracking**: Monitor ingredient waste
- **Cost Analysis**: Ingredient cost per item
- **Mobile Alerts**: Push notifications for low stock

### Integration Points

- **POS Systems**: Real-time inventory updates
- **Accounting Software**: Cost tracking
- **Supplier Portals**: Automated ordering
- **Analytics Platforms**: Business intelligence

## 📞 Support

### Getting Help

1. **Check Logs**: Review console and database logs
2. **Verify Setup**: Run setup verification script
3. **Test Endpoints**: Use API testing tools
4. **Database Check**: Verify table structure

### Common Commands

```bash
# Check system status
node scripts/setup-ingredient-deduction.js

# View database structure
mysql -u root -p capstone -e "DESCRIBE inventory_transactions;"

# Check recent transactions
mysql -u root -p capstone -e "SELECT * FROM inventory_transactions ORDER BY created_at DESC LIMIT 10;"
```

---

**🎉 Congratulations!** Your automatic ingredient deduction system is now fully operational. Every order will automatically update inventory levels, ensuring accurate stock management and preventing overselling.
