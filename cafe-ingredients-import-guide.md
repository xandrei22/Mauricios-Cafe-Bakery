# ☕ Café Raw Materials Import Guide

## 🎯 Overview

This guide will help you import all your café raw materials from the provided list into your inventory system. I've prepared everything you need to get started quickly.

## 📋 Your Café Raw Materials List

Based on your image, here are the **35 ingredients** that will be imported:

### 🥛 **Milk & Dairy Products**
- COFFEE BEANS
- FULL CREME MILK
- VEGETABLE CREAM
- CONDENSED MILK
- EVAPORATED MILK
- MILK MIXTURE
- BUTTER (DAIRY CREME)

### 🍯 **Sauces & Syrups**
- CARAMEL SAUCE
- CHOCOLATE SAUCE
- WHITE CHOCOLATE SAUCE
- BUTTERSCOTCH SAUCE
- VANILLA SYRUP
- HAZELNUT SYRUP
- ENGLISH TOFFEE SYRUP
- STRAWBERRY SYRUP
- AMARETTO SYRUP
- GRENADINE
- CHERRY SYRUP

### 🍷 **Liqueurs & Alcohol**
- BAILEYS IRISH CREME
- UBE LIQUEUR

### 🧃 **Beverages & Juices**
- PINEAPPLE JUICE
- COKE
- SPRITE

### 🍵 **Tea & Tea Mixtures**
- CHAI TEA MIXTURE
- CHAMOMILE MIXTURE
- ASAM BLACK TEA

### 🌿 **Spices & Seasonings**
- CARDAMOM
- CINNAMON STICKS
- BLACK PEPPER
- SEA SALT

### 🍋 **Fruits & Fresh Items**
- LEMON/CALAMANSI

### 🍫 **Chocolate & Powders**
- MATCH POWDER (CEREMONIAL GRADE)
- RICOYA POWDER
- TABLEA

### 🍬 **Toppings & Extras**
- MARSHMALLOW

## 🚀 How to Import Your Ingredients

### **Method 1: Automated Script (Recommended)**

1. **Start your backend server:**
   ```bash
   cd backend
   npm start
   ```

2. **Run the import script:**
   ```bash
   cd backend
   node scripts/import-cafe-ingredients.js
   ```

3. **Check the results:**
   - The script will show you how many ingredients were imported successfully
   - Any errors will be displayed with details

### **Method 2: Manual Import via Web Interface**

1. **Go to your admin dashboard:**
   ```
   http://localhost:3000/admin/enhanced-inventory
   ```

2. **Click "Bulk Add" button**

3. **Copy and paste the CSV data:**
   - Open `backend/cafe-raw-materials.csv`
   - Copy all content
   - Paste into the bulk add form

4. **Click "Bulk Add Ingredients"**

## 📊 What Gets Imported

Each ingredient includes:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Ingredient name | "COFFEE BEANS" |
| **Description** | Brief description | "Premium coffee beans for brewing" |
| **Category** | Ingredient category | "coffee", "milk", "syrup" |
| **SKU** | Unique identifier | "COFFEE-BEANS-001" |
| **Actual Unit** | Storage unit | "g", "ml", "piece" |
| **Display Unit** | Customer unit | "shot", "pump", "tsp" |
| **Conversion Rate** | Unit conversion | 18.0 (18g = 1 shot) |
| **Reorder Level** | Low stock alert | 2000.0 |
| **Cost per Unit** | Cost in ₱ | 0.080 |
| **Storage Location** | Where to store | "Dry Storage", "Refrigerator" |
| **Initial Quantity** | Starting stock | 5000.0 |
| **Days of Stock** | Shelf life | 30 |

## 🏷️ Ingredient Categories

Your ingredients are organized into these categories:

- **coffee** - Coffee beans and grounds
- **milk** - All milk and cream products
- **sauce** - Chocolate, caramel, and other sauces
- **syrup** - Flavored syrups
- **liqueur** - Alcoholic ingredients
- **juice** - Fruit juices
- **beverage** - Sodas and drinks
- **tea** - Tea leaves and mixtures
- **spice** - Spices and seasonings
- **fruit** - Fresh fruits
- **dairy** - Butter and dairy products
- **powder** - Powdered ingredients
- **chocolate** - Chocolate products
- **topping** - Toppings and extras
- **seasoning** - Salt and seasonings

## 🔧 Customization Options

### **Adjust Initial Quantities**
Edit `backend/cafe-raw-materials.csv` to change:
- `initial_quantity` - Starting stock amounts
- `reorder_level` - When to reorder
- `cost_per_actual_unit` - Cost per unit

### **Modify Conversion Rates**
Adjust how ingredients convert:
- **Milk**: 25ml = 1 shot
- **Coffee**: 18g = 1 shot
- **Syrups**: 15ml = 1 pump
- **Powders**: 2g = 1 tsp

### **Update Storage Locations**
Change where ingredients are stored:
- **Refrigerator** - Perishable items
- **Dry Storage** - Non-perishable items

## ✅ After Import

Once imported, you can:

1. **View all ingredients** in `/admin/enhanced-inventory`
2. **Track stock levels** automatically
3. **Set up menu items** using these ingredients
4. **Receive low stock alerts** when reorder levels are reached
5. **Process orders** with automatic inventory deduction

## 🎯 Next Steps

After importing your ingredients:

1. **Create menu items** using these ingredients
2. **Set up recipes** with ingredient requirements
3. **Configure pricing** for your drinks
4. **Test the POS system** with real ingredients
5. **Set up reorder alerts** for low stock

## 🆘 Troubleshooting

### **Import Fails**
- Check that backend server is running
- Verify database connection
- Check CSV file format

### **Duplicate SKUs**
- Each ingredient has a unique SKU
- If you get duplicates, edit the CSV file

### **Missing Ingredients**
- Check the import results
- Re-run the script if needed
- Verify CSV data is correct

## 📞 Support

If you encounter any issues:
1. Check the console output for error messages
2. Verify your database is running
3. Ensure all required fields are filled in the CSV

---

**🎉 Your café raw materials are ready to be imported! Follow the steps above to get started.** 