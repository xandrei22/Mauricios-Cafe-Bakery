# 🎯 Enhanced Inventory System Setup Guide

## 📋 Overview

The Enhanced Inventory System provides **accurate ingredient tracking** with automatic deduction when customers place orders. It tracks ingredients in their actual units (ml, g, pieces) and converts them to customer-friendly display units (shots, pumps, teaspoons).

## 🚀 Key Features

### ✅ **Dual Unit System**
- **Actual Units**: ml, g, pieces (for inventory tracking)
- **Display Units**: shots, pumps, teaspoons (for customer display)
- **Conversion Rates**: 1 shot = 25ml, 1 pump = 15ml, etc.

### ✅ **Automatic Deduction**
- When a customer orders a latte, the system automatically deducts:
  - 18g coffee beans (1 shot)
  - 120ml whole milk (4.8 shots)
- All deductions are tracked in actual units

### ✅ **Real-time Availability**
- Check if menu items can be made with current inventory
- Low stock alerts when ingredients fall below reorder levels
- Transaction history for all inventory changes

## 🛠️ Setup Instructions

### 1. **Initialize the Enhanced Schema**

```bash
# Run the enhanced inventory test script
cd backend
node test-enhanced-inventory.js
```

This will:
- Create the enhanced inventory tables
- Insert sample ingredients with conversion rates
- Insert sample menu items with ingredient requirements
- Demonstrate automatic deduction

### 2. **Sample Data Structure**

#### **Ingredients Table**
```sql
-- Example: Almond Milk
name: "Almond Milk"
actual_unit: "ml"
actual_quantity: 1000.000
display_unit: "shot"
conversion_rate: 25.000  -- 1 shot = 25ml
reorder_level: 500.000
```

#### **Menu Items with Recipes**
```sql
-- Example: Latte Recipe
menu_item: "Latte"
ingredients:
  - Coffee Beans: 18g (1 shot)
  - Whole Milk: 120ml (4.8 shots)
```

### 3. **Test the System**

#### **A. Check Current Inventory**
```bash
# View all ingredients with display quantities
curl http://localhost:5001/api/inventory
```

#### **B. Test Menu Item Availability**
```bash
# Check if a latte can be made
curl "http://localhost:5001/api/inventory/menu/availability/5?quantity=1"
```

#### **C. Process a Test Order**
```bash
# Create a test order that automatically deducts ingredients
node test-customer-order.js
```

## 📊 Understanding the System

### **Example: Almond Milk Latte Order**

1. **Customer Orders**: 1 Almond Milk Latte
2. **System Checks**: Can we make this drink?
3. **Recipe Requirements**:
   - Coffee Beans: 18g (1 shot)
   - Almond Milk: 120ml (4.8 shots)
4. **Automatic Deduction**:
   - Coffee Beans: 5000g → 4982g
   - Almond Milk: 1000ml → 880ml
5. **Display Updates**:
   - Coffee Beans: 277.78 shots → 276.78 shots
   - Almond Milk: 40 shots → 35.2 shots

### **Unit Conversion Examples**

| Ingredient | Actual Unit | Display Unit | Conversion Rate | Example |
|------------|-------------|--------------|-----------------|---------|
| Almond Milk | ml | shot | 25ml = 1 shot | 1000ml = 40 shots |
| Coffee Beans | g | shot | 18g = 1 shot | 5000g = 277.78 shots |
| Vanilla Syrup | ml | pump | 15ml = 1 pump | 1000ml = 66.67 pumps |
| Sugar | g | tsp | 4g = 1 tsp | 2000g = 500 tsp |

## 🎮 Frontend Access

### **Enhanced Inventory Dashboard**
- **URL**: `/admin/enhanced-inventory`
- **Features**:
  - View all ingredients with actual and display quantities
  - See conversion rates and stock status
  - Monitor low stock alerts
  - View transaction history
  - Filter by category

### **POS Integration**
- **URL**: `/admin/pos`
- **Features**:
  - Real-time order processing
  - Automatic ingredient deduction
  - Stock level monitoring

## 🔧 API Endpoints

### **Inventory Management**
```bash
# Get all ingredients
GET /api/inventory

# Get ingredient by ID
GET /api/inventory/:id

# Create new ingredient
POST /api/inventory

# Update ingredient
PUT /api/inventory/:id

# Delete ingredient
DELETE /api/inventory/:id
```

### **Menu Management**
```bash
# Get menu items with recipes
GET /api/inventory/menu/items

# Check menu item availability
GET /api/inventory/menu/availability/:menuItemId?quantity=1
```

### **Transactions**
```bash
# Get inventory transactions
GET /api/inventory/transactions?limit=50

# Add ingredients (restock)
POST /api/inventory/add/:ingredientId
```

### **Alerts**
```bash
# Get low stock alerts
GET /api/inventory/alerts/low-stock
```

## 📈 Monitoring & Alerts

### **Stock Status Levels**
- **🟢 In Stock**: Above reorder level × 2
- **🟡 Low Stock**: Between reorder level and reorder level × 2
- **🟠 Below Reorder**: At or below reorder level
- **🔴 Out of Stock**: Zero quantity

### **Transaction Types**
- **📥 Purchase**: Adding ingredients (restock)
- **📤 Usage**: Deducting ingredients (orders)
- **🔧 Adjustment**: Manual quantity changes
- **🗑️ Waste**: Discarded ingredients
- **↩️ Return**: Returned ingredients

## 🎯 Real-World Example

### **Scenario**: Coffee Shop with 1L Almond Milk

1. **Initial State**:
   - Almond Milk: 1000ml (40 shots)

2. **Customer Orders**: 2 Almond Milk Lattes
   - Each latte requires: 120ml almond milk
   - Total needed: 240ml (9.6 shots)

3. **System Processing**:
   - Checks availability: ✅ 1000ml > 240ml
   - Deducts: 1000ml - 240ml = 760ml
   - Updates display: 40 shots - 9.6 shots = 30.4 shots

4. **Result**:
   - Actual: 760ml remaining
   - Display: 30.4 shots remaining
   - Status: Still in stock

## 🚨 Troubleshooting

### **Common Issues**

1. **"Insufficient stock" error**
   - Check actual ingredient quantities
   - Verify conversion rates are correct
   - Restock ingredients if needed

2. **Menu items not showing**
   - Ensure ingredients are available
   - Check menu item availability settings
   - Verify recipe requirements

3. **Conversion rate issues**
   - Review ingredient conversion rates
   - Ensure display units make sense
   - Test with sample orders

### **Debug Commands**
```bash
# Check ingredient status
curl http://localhost:5001/api/inventory

# Test menu availability
curl "http://localhost:5001/api/inventory/menu/availability/1"

# View recent transactions
curl "http://localhost:5001/api/inventory/transactions?limit=10"
```

## 🎉 Success Indicators

✅ **System is working when**:
- Orders automatically deduct ingredients
- Stock levels update in real-time
- Low stock alerts appear when needed
- Transaction history shows all changes
- Display units convert correctly

## 📞 Support

If you encounter issues:
1. Check the console logs for errors
2. Verify database connections
3. Test with the provided test scripts
4. Review the API responses

---

**🎯 The Enhanced Inventory System is now ready to provide accurate, real-time ingredient tracking for your coffee shop!** 