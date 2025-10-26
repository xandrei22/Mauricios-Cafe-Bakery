#!/usr/bin/env node

const db = require('../config/db');

async function checkTables() {
    try {
        const connection = await db.getConnection();
        
        try {
            // Check if menu_items table exists
            const [menuItemsExists] = await connection.query(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = 'cafeiq' AND table_name = 'menu_items'
            `);
            console.log('menu_items table exists:', menuItemsExists[0].count > 0);
            
            // Check if menu_item_ingredients table exists
            const [recipesExist] = await connection.query(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = 'cafeiq' AND table_name = 'menu_item_ingredients'
            `);
            console.log('menu_item_ingredients table exists:', recipesExist[0].count > 0);
            
            // Check if ingredients table exists
            const [ingredientsExist] = await connection.query(`
                SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_schema = 'cafeiq' AND table_name = 'ingredients'
            `);
            console.log('ingredients table exists:', ingredientsExist[0].count > 0);
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTables();

