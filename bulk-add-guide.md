# 📦 Bulk Add Ingredients Guide

## 🎯 Overview

The **Bulk Add** feature allows you to add multiple ingredients at once using CSV format. This is perfect for:
- Initial inventory setup
- Bulk restocking
- Importing ingredients from spreadsheets
- Setting up new menu items

## 🚀 How to Use Bulk Add

### **1. Access Bulk Add**
- Go to: `/admin/enhanced-inventory`
- Click the **"Bulk Add"** button (green button)
- A modal will open with CSV instructions and template

### **2. CSV Format Requirements**

#### **Required Columns (in order):**
```csv
name,description,category,sku,actual_unit,display_unit,conversion_rate,reorder_level,cost_per_actual_unit,storage_location,initial_quantity,days_of_stock
```

#### **Column Details:**
| Column | Type | Required | Example | Description |
|--------|------|----------|---------|-------------|
| `name` | Text | ✅ | "Almond Milk" | Ingredient name |
| `description` | Text | ❌ | "Unsweetened almond milk" | Brief description |
| `category` | Text | ✅ | "milk" | Category (milk, coffee, syrup, etc.) |
| `sku` | Text | ✅ | "ALM-MILK-001" | Unique Stock Keeping Unit |
| `actual_unit` | Text | ✅ | "ml" | Actual unit (ml, g, pieces) |
| `display_unit` | Text | ✅ | "shot" | Display unit (shot, pump, tsp) |
| `conversion_rate` | Number | ✅ | 25.0 | 25ml = 1 shot |
| `reorder_level` | Number | ❌ | 500.0 | Reorder when stock reaches this |
| `cost_per_actual_unit` | Number | ❌ | 0.050 | Cost per ml/g/piece in ₱ |
| `storage_location` | Text | ❌ | "Refrigerator" | Where to store |
| `initial_quantity` | Number | ❌ | 1000.0 | Starting stock amount |
| `days_of_stock` | Number | ❌ | 7 | Estimated days until expiry |

### **3. CSV Template Examples**

#### **Basic Template:**
```csv
name,description,category,sku,actual_unit,display_unit,conversion_rate,reorder_level,cost_per_actual_unit,storage_location,initial_quantity,days_of_stock
"Almond Milk","Unsweetened almond milk","milk","ALM-MILK-001","ml","shot",25.0,500.0,0.050,"Refrigerator",1000.0,7
"Coffee Beans","Premium arabica beans","coffee","COFFEE-BEANS-001","g","shot",18.0,2000.0,0.080,"Dry Storage",5000.0,30
"Vanilla Syrup","Vanilla flavored syrup","syrup","VANILLA-SYRUP-001","ml","pump",15.0,500.0,0.020,"Refrigerator",1000.0,15
```

#### **Complete Coffee Shop Setup:**
```csv
name,description,category,sku,actual_unit,display_unit,conversion_rate,reorder_level,cost_per_actual_unit,storage_location,initial_quantity,days_of_stock
"Almond Milk","Unsweetened almond milk","milk","ALM-MILK-001","ml","shot",25.0,500.0,0.050,"Refrigerator",1000.0,7
"Oat Milk","Barista oat milk","milk","OAT-MILK-001","ml","shot",30.0,750.0,0.060,"Refrigerator",1500.0,10
"Whole Milk","Fresh whole milk","milk","WHOLE-MILK-001","ml","shot",25.0,1000.0,0.040,"Refrigerator",2000.0,5
"Coffee Beans","Premium arabica beans","coffee","COFFEE-BEANS-001","g","shot",18.0,2000.0,0.080,"Dry Storage",5000.0,30
"Espresso Beans","Dark roast espresso beans","coffee","ESPRESSO-BEANS-001","g","shot",18.0,1500.0,0.090,"Dry Storage",3000.0,20
"Vanilla Syrup","Vanilla flavored syrup","syrup","VANILLA-SYRUP-001","ml","pump",15.0,500.0,0.020,"Refrigerator",1000.0,15
"Caramel Syrup","Caramel flavored syrup","syrup","CARAMEL-SYRUP-001","ml","pump",15.0,500.0,0.025,"Refrigerator",1000.0,15
"Chocolate Syrup","Dark chocolate syrup","syrup","CHOCO-SYRUP-001","ml","pump",20.0,400.0,0.030,"Refrigerator",800.0,12
"Sugar","White granulated sugar","sweetener","SUGAR-001","g","tsp",4.0,1000.0,0.010,"Dry Storage",2000.0,60
"Honey","Pure honey","sweetener","HONEY-001","ml","tsp",5.0,250.0,0.040,"Dry Storage",500.0,45
"Whipped Cream","Fresh whipped cream","topping","WHIP-CREAM-001","ml","dollop",30.0,500.0,0.060,"Refrigerator",1000.0,3
"Cinnamon Powder","Ground cinnamon","spice","CINNAMON-001","g","sprinkle",0.5,100.0,0.200,"Dry Storage",200.0,90
```

### **4. Step-by-Step Process**

#### **Step 1: Prepare Your Data**
1. **Use Excel/Google Sheets** to organize your ingredients
2. **Follow the column order** exactly as shown above
3. **Use quotes** around text values that contain commas
4. **Save as CSV** format

#### **Step 2: Load Template**
1. Click **"Load Template"** button
2. This will populate the text area with sample data
3. **Modify** the template with your actual ingredients
4. **Add more rows** as needed

#### **Step 3: Paste Your Data**
1. **Copy** your CSV data from Excel/Sheets
2. **Paste** into the text area
3. **Review** the data for accuracy
4. **Check** that all required fields are filled

#### **Step 4: Submit**
1. Click **"Bulk Add Ingredients"**
2. **Wait** for processing (shows progress)
3. **Review** the results summary
4. **Check** your inventory for new items

### **5. CSV Best Practices**

#### **✅ Do's:**
- Use quotes around text values: `"Almond Milk"`
- Use consistent decimal places: `25.0` not `25`
- Use unique SKUs: `ALM-MILK-001`, `ALM-MILK-002`
- Include header row (column names)
- Test with small batches first

#### **❌ Don'ts:**
- Don't use commas in text values without quotes
- Don't skip the header row
- Don't use duplicate SKUs
- Don't mix units (stick to ml, g, pieces)
- Don't forget to save as CSV format

### **6. Common Categories**

| Category | Examples | Typical Units |
|----------|----------|---------------|
| `milk` | Almond, Oat, Whole, Soy | ml → shot |
| `coffee` | Beans, Ground, Instant | g → shot |
| `syrup` | Vanilla, Caramel, Chocolate | ml → pump |
| `sweetener` | Sugar, Honey, Maple | g/ml → tsp |
| `topping` | Whipped Cream, Sprinkles | ml/g → dollop |
| `spice` | Cinnamon, Nutmeg, Cardamom | g → sprinkle |

### **7. Conversion Rate Examples**

| Ingredient | Actual Unit | Display Unit | Conversion Rate | Example |
|------------|-------------|--------------|-----------------|---------|
| Almond Milk | ml | shot | 25.0 | 1000ml = 40 shots |
| Coffee Beans | g | shot | 18.0 | 5000g = 277.78 shots |
| Vanilla Syrup | ml | pump | 15.0 | 1000ml = 66.67 pumps |
| Sugar | g | tsp | 4.0 | 2000g = 500 tsp |
| Whipped Cream | ml | dollop | 30.0 | 1000ml = 33.33 dollops |

### **8. Troubleshooting**

#### **Common Errors:**

**"Missing required fields"**
- Check that all required columns are filled
- Ensure SKU is unique
- Verify conversion rate is a number

**"Duplicate SKU"**
- Each ingredient needs a unique SKU
- Use format: `CATEGORY-NAME-001`

**"Invalid CSV format"**
- Check for missing quotes around text
- Ensure proper comma separation
- Verify header row is present

**"Processing failed"**
- Check your internet connection
- Try with fewer ingredients first
- Verify all numbers are valid

### **9. Sample Files**

#### **Download Sample CSV:**
- **File**: `backend/sample-bulk-ingredients.csv`
- **Contains**: 18 common coffee shop ingredients
- **Ready to use**: Just modify quantities and SKUs

#### **Quick Start Template:**
```csv
name,description,category,sku,actual_unit,display_unit,conversion_rate,reorder_level,cost_per_actual_unit,storage_location,initial_quantity,days_of_stock
"Test Milk","Test ingredient","milk","TEST-MILK-001","ml","shot",25.0,500.0,0.050,"Refrigerator",1000.0,7
```

### **10. API Endpoint**

#### **Bulk Add API:**
```bash
POST /api/inventory/bulk
Content-Type: application/json

{
  "ingredients": [
    {
      "name": "Almond Milk",
      "description": "Unsweetened almond milk",
      "category": "milk",
      "sku": "ALM-MILK-001",
      "actual_unit": "ml",
      "display_unit": "shot",
      "conversion_rate": 25.0,
      "reorder_level": 500.0,
      "cost_per_actual_unit": 0.050,
      "storage_location": "Refrigerator",
      "initial_quantity": 1000.0,
      "days_of_stock": 7
    }
  ]
}
```

## 🎉 Success!

After bulk adding ingredients:
- ✅ All ingredients appear in your inventory
- ✅ SKUs are unique and searchable
- ✅ Conversion rates work automatically
- ✅ Stock levels are tracked accurately
- ✅ Low stock alerts are active
- ✅ Ready for order processing

**Your Enhanced Inventory System is now ready for professional coffee shop operations!** 🚀 