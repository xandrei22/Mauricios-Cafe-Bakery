const db = require('./config/db');

async function testIngredients() {
    try {
        console.log('🔍 Testing ingredients database...');
        
        // Check all ingredients
        const [allIngredients] = await db.query(`
            SELECT 
                id,
                name,
                category,
                actual_unit,
                cost_per_actual_unit,
                is_available,
                visible_in_customization,
                actual_quantity
            FROM ingredients 
            ORDER BY name
        `);
        
        console.log(`\n📊 Total ingredients in database: ${allIngredients.length}`);
        
        // Check available ingredients
        const [availableIngredients] = await db.query(`
            SELECT 
                id,
                name,
                category,
                actual_unit,
                cost_per_actual_unit,
                is_available,
                visible_in_customization,
                actual_quantity
            FROM ingredients 
            WHERE is_available = TRUE
            ORDER BY name
        `);
        
        console.log(`✅ Available ingredients: ${availableIngredients.length}`);
        availableIngredients.forEach(ing => {
            console.log(`  - ${ing.name} (${ing.category}) - Stock: ${ing.actual_quantity} ${ing.actual_unit} - Customization: ${ing.visible_in_customization ? 'YES' : 'NO'}`);
        });
        
        // Check customization-visible ingredients
        const [customizationIngredients] = await db.query(`
            SELECT 
                id,
                name,
                category,
                actual_unit,
                cost_per_actual_unit,
                is_available,
                visible_in_customization,
                actual_quantity
            FROM ingredients 
            WHERE is_available = TRUE 
              AND visible_in_customization = TRUE
              AND actual_quantity > 0
            ORDER BY name
        `);
        
        console.log(`\n🎯 Available for customization: ${customizationIngredients.length}`);
        customizationIngredients.forEach(ing => {
            console.log(`  - ${ing.name} (${ing.category}) - Stock: ${ing.actual_quantity} ${ing.actual_unit} - Price: ₱${ing.cost_per_actual_unit}`);
        });
        
        // Check ingredients with stock issues
        const [noStockIngredients] = await db.query(`
            SELECT 
                id,
                name,
                category,
                actual_quantity,
                is_available,
                visible_in_customization
            FROM ingredients 
            WHERE is_available = TRUE 
              AND visible_in_customization = TRUE
              AND actual_quantity <= 0
            ORDER BY name
        `);
        
        console.log(`\n❌ Available for customization but out of stock: ${noStockIngredients.length}`);
        noStockIngredients.forEach(ing => {
            console.log(`  - ${ing.name} (${ing.category}) - Stock: ${ing.actual_quantity}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error testing ingredients:', error);
        process.exit(1);
    }
}

testIngredients();





