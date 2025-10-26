#!/usr/bin/env node

const db = require('../config/db');
require('dotenv').config();

async function debugOrderStructure() {
    try {
        console.log('🔍 Debugging order structure...\n');

        // 1. Check orders table structure
        console.log('1. Checking orders table structure...');
        try {
            const [columns] = await db.query('DESCRIBE orders');
            console.log('   - Orders table columns:');
            columns.forEach(col => {
                console.log(`     * ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // 2. Check order_items table structure
        console.log('\n2. Checking order_items table structure...');
        try {
            const [columns] = await db.query('DESCRIBE order_items');
            console.log('   - Order_items table columns:');
            columns.forEach(col => {
                console.log(`     * ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // 3. Check recent orders
        console.log('\n3. Checking recent orders...');
        try {
            const [orders] = await db.query(`
                SELECT id, order_id, customer_id, payment_status, status, created_at, items
                FROM orders 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            console.log('   - Recent orders:');
            orders.forEach(order => {
                console.log(`     * Order ${order.order_id} (ID: ${order.id}): Payment: ${order.payment_status}, Status: ${order.status}, Items: ${order.items || 'NULL'}`);
            });
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // 4. Check recent order items
        console.log('\n4. Checking recent order items...');
        try {
            const [orderItems] = await db.query(`
                SELECT oi.*, m.name as menu_item_name
                FROM order_items oi
                JOIN menu_items m ON oi.menu_item_id = m.id
                ORDER BY oi.created_at DESC 
                LIMIT 10
            `);
            
            console.log('   - Recent order items:');
            orderItems.forEach(item => {
                console.log(`     * Order ${item.order_id}: ${item.menu_item_name} (ID: ${item.menu_item_id}), Quantity: ${item.quantity}`);
            });
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // 5. Check ingredient deduction queue
        console.log('\n5. Checking ingredient deduction queue...');
        try {
            const [queueItems] = await db.query(`
                SELECT * FROM ingredient_deduction_queue 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            
            if (queueItems.length > 0) {
                console.log('   - Recent queue items:');
                queueItems.forEach(item => {
                    console.log(`     * Queue ID ${item.id}: Order ${item.order_id}, Status: ${item.status}, Items: ${item.items}`);
                });
            } else {
                console.log('   - No items in ingredient deduction queue');
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        console.log('\n✅ Debug complete!');

    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        process.exit(0);
    }
}

debugOrderStructure();


