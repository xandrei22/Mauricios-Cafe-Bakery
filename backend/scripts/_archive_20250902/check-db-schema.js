#!/usr/bin/env node

const db = require('../config/db');

async function checkDBSchema() {
    console.log('🔍 Checking Database Schema...\n');
    
    try {
        const connection = await db.getConnection();
        
        try {
            // Check menu_items table structure
            console.log('📋 Checking menu_items table...');
            try {
                const [menuItemsSchema] = await connection.query(`
                    DESCRIBE menu_items
                `);
                console.log('menu_items columns:');
                menuItemsSchema.forEach(col => {
                    console.log(`  - ${col.Field} (${col.Type})`);
                });
            } catch (error) {
                console.log('❌ Could not check menu_items schema:', error.message);
            }
            
            // Check ingredients table structure
            console.log('\n📋 Checking ingredients table...');
            try {
                const [ingredientsSchema] = await connection.query(`
                    DESCRIBE ingredients
                `);
                console.log('ingredients columns:');
                ingredientsSchema.forEach(col => {
                    console.log(`  - ${col.Field} (${col.Type})`);
                });
            } catch (error) {
                console.log('❌ Could not check ingredients schema:', error.message);
            }
            
            // Check menu_item_ingredients table structure
            console.log('\n📋 Checking menu_item_ingredients table...');
            try {
                const [recipeSchema] = await connection.query(`
                    DESCRIBE menu_item_ingredients
                `);
                console.log('menu_item_ingredients columns:');
                recipeSchema.forEach(col => {
                    console.log(`  - ${col.Field} (${col.Type})`);
                });
            } catch (error) {
                console.log('❌ Could not check menu_item_ingredients schema:', error.message);
            }
            
            // Check orders table structure
            console.log('\n📋 Checking orders table...');
            try {
                const [ordersSchema] = await connection.query(`
                    DESCRIBE orders
                `);
                console.log('orders columns:');
                ordersSchema.forEach(col => {
                    console.log(`  - ${col.Field} (${col.Type})`);
                });
            } catch (error) {
                console.log('❌ Could not check orders schema:', error.message);
            }
            
            // Check if tables exist
            console.log('\n🔍 Checking table existence...');
            const [tables] = await connection.query(`
                SHOW TABLES
            `);
            console.log('Available tables:');
            tables.forEach(table => {
                console.log(`  - ${Object.values(table)[0]}`);
            });
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Schema check failed:', error);
    }
}

// Run the check if this script is executed directly
if (require.main === module) {
    checkDBSchema()
        .then(() => {
            console.log('\n✅ Schema check completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Schema check failed:', error);
            process.exit(1);
        });
}

module.exports = { checkDBSchema };

