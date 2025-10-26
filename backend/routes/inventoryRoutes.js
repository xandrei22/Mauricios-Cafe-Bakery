const express = require('express');
const router = express.Router();
const db = require('../config/db');
const inventoryService = require('../services/inventoryService');
const ActivityLogger = require('../utils/activityLogger');

// Error handling middleware
router.use((err, req, res, next) => {
    console.error('Inventory route error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

// GET /api/inventory or /inventory
router.get('/', async(req, res) => {
    try {
        const [ingredients] = await db.query(`
            SELECT 
                id, name, description, category, sku,
                actual_unit, actual_quantity,
                reorder_level, cost_per_actual_unit, extra_price_per_unit,
                storage_location, days_of_stock,
                is_available,
                COALESCE(visible_in_customization, FALSE) AS visible_in_customization,
                CASE 
                    WHEN actual_quantity <= 0 THEN 'out_of_stock'
                    WHEN actual_quantity <= reorder_level THEN 'below_reorder'
                    WHEN actual_quantity <= reorder_level * 2 THEN 'low_stock'
                    ELSE 'in_stock'
                END as stock_status
            FROM ingredients
            ORDER BY category, name
        `);

        res.json({
            success: true,
            ingredients: ingredients.map(item => ({
                ...item,
                extra_price_per_unit: item.extra_price_per_unit != null ? parseFloat(item.extra_price_per_unit) : null
            }))
        });
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching ingredients'
        });
    }
});

// GET /api/inventory/transactions or /inventory/transactions
router.get('/transactions', async(req, res) => {
    try {
        const groupOrders = String(req.query.group || '1') !== '0';
        const page = Math.max(parseInt(req.query.page || '1'), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '50'), 1), 50);
        const offset = (page - 1) * limit;

        if (groupOrders) {
            // Group usage by order_id + ingredient_id and union with non-usage rows
            const [countRows] = await db.query(`
                SELECT COUNT(*) as total FROM (
                    (
                        SELECT MIN(t.id) id
                        FROM inventory_transactions t
                        WHERE t.transaction_type = 'usage'
                        GROUP BY t.order_id, t.ingredient_id
                    )
                    UNION ALL
                    (
                        SELECT t.id
                        FROM inventory_transactions t
                        WHERE t.transaction_type <> 'usage'
                    )
                ) as u
            `);
            const total = (countRows[0] && countRows[0].total) ? countRows[0].total : 0;

            const [rows] = await db.query(`
                (
                    SELECT 
                        MIN(t.id) as id,
                        t.ingredient_id,
                        i.name as ingredient_name,
                        'usage' as transaction_type,
                        SUM(t.actual_amount) as actual_amount,
                        MIN(t.previous_actual_quantity) as previous_actual_quantity,
                        MAX(t.new_actual_quantity) as new_actual_quantity,
                        t.order_id,
                        CONCAT('Used for order ', t.order_id) as notes,
                        MIN(t.created_at) as created_at
                    FROM inventory_transactions t
                    JOIN ingredients i ON t.ingredient_id = i.id
                    WHERE t.transaction_type = 'usage'
                    GROUP BY t.order_id, t.ingredient_id
                )
                UNION ALL
                (
                    SELECT 
                        t.id,
                        t.ingredient_id,
                        i.name as ingredient_name,
                        t.transaction_type,
                        t.actual_amount,
                        t.previous_actual_quantity,
                        t.new_actual_quantity,
                        t.order_id,
                        t.notes,
                        t.created_at
                    FROM inventory_transactions t
                    JOIN ingredients i ON t.ingredient_id = i.id
                    WHERE t.transaction_type <> 'usage'
                )
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            return res.json({ success: true, transactions: rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
        } else {
            const [countRows] = await db.query(`SELECT COUNT(*) as total FROM inventory_transactions`);
            const total = (countRows[0] && countRows[0].total) ? countRows[0].total : 0;
            const [rows] = await db.query(`
                SELECT 
                    t.id,
                    t.ingredient_id,
                    i.name as ingredient_name,
                    t.transaction_type,
                    t.actual_amount,
                    t.previous_actual_quantity,
                    t.new_actual_quantity,
                    t.order_id,
                    t.notes,
                    t.created_at
                FROM inventory_transactions t
                JOIN ingredients i ON t.ingredient_id = i.id
                ORDER BY t.created_at DESC
                LIMIT ? OFFSET ?
            `, [limit, offset]);
            return res.json({ success: true, transactions: rows, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } });
        }
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching transactions'
        });
    }
});

// POST /api/inventory or /inventory
router.post('/', async(req, res) => {
    try {
        const {
            name,
            description,
            category,
            sku,
            actual_unit,
            reorder_level,
            cost_per_unit, // Accept cost_per_unit for consistency
            storage_location,
            initial_quantity,
            days_of_stock,
            visible_in_customization
        } = req.body;

        const [result] = await db.query(`
            INSERT INTO ingredients (
                name, description, category, sku,
                actual_unit,
                actual_quantity, reorder_level,
                cost_per_actual_unit, storage_location,
                days_of_stock, is_available, visible_in_customization
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?)
        `, [
            name, description, category, sku,
            actual_unit,
            initial_quantity, reorder_level,
            cost_per_unit || 0, // Map cost_per_unit to cost_per_actual_unit
            storage_location,
            days_of_stock, !!visible_in_customization
        ]);

        // Emit real-time update for inventory change
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('inventory-updated', {
                type: 'ingredient_added',
                ingredientId: result.insertId,
                name,
                category,
                timestamp: new Date()
            });
            io.to('staff-room').emit('inventory-updated', {
                type: 'ingredient_added',
                ingredientId: result.insertId,
                name,
                category,
                timestamp: new Date()
            });
        }

        res.json({
            success: true,
            message: 'Ingredient added successfully',
            ingredientId: result.insertId
        });

        // Log admin activity (if session present)
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'create_ingredient',
                    'ingredient',
                    result.insertId,
                    null, { name, category, sku, actual_unit, actual_quantity: initial_quantity },
                    `Created ingredient ${name}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (create_ingredient) failed:', e.message);
        }
    } catch (error) {
        console.error('Error adding ingredient:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error adding ingredient'
        });
    }
});

// GET /api/inventory/menu/:id/availability
router.get('/menu/:id/availability', async(req, res) => {
    try {
        const { quantity = 1 } = req.query;
        const availability = await inventoryService.checkMenuItemAvailability(
            parseInt(req.params.id),
            parseInt(quantity)
        );
        res.json({ success: true, availability });
    } catch (error) {
        console.error('Error checking menu item availability:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check menu item availability'
        });
    }
});

// GET /api/inventory/alerts/low-stock
router.get('/alerts/low-stock', async(req, res) => {
    try {
        const alerts = await inventoryService.getLowStockAlerts();
        res.json({ success: true, alerts });
    } catch (error) {
        console.error('Error fetching low stock alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch low stock alerts'
        });
    }
});

// POST /api/inventory/add/:ingredientId
router.post('/add/:ingredientId', async(req, res) => {
    try {
        const { actualAmount, notes } = req.body;
        const result = await inventoryService.addIngredients(
            parseInt(req.params.ingredientId),
            parseFloat(actualAmount),
            notes || 'Manual addition'
        );
        res.json({ success: true, result });
    } catch (error) {
        console.error('Error adding ingredients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add ingredients'
        });
    }
});

// POST /api/inventory/bulk
router.post('/bulk', async(req, res) => {
    try {
        const { ingredients } = req.body;
        if (!ingredients || !Array.isArray(ingredients)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request. Expected an array of ingredients.'
            });
        }

        const results = [];
        for (const ingredient of ingredients) {
            try {
                const result = await inventoryService.createIngredient({
                    ...ingredient,
                    reorder_level: parseFloat(ingredient.reorder_level) || 0,
                    cost_per_unit: parseFloat(ingredient.cost_per_unit) || 0, // Accept cost_per_unit for consistency
                    initial_quantity: parseFloat(ingredient.initial_quantity) || 0,
                    days_of_stock: parseInt(ingredient.days_of_stock) || 30
                });
                results.push({ success: true, ingredient: result });
            } catch (error) {
                console.error(`Error adding ingredient ${ingredient.name}:`, error);
                results.push({
                    success: false,
                    name: ingredient.name,
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const errorCount = results.length - successCount;

        res.status(errorCount > 0 ? 207 : 201).json({
            success: errorCount === 0,
            message: `Processed ${results.length} ingredients (${successCount} success, ${errorCount} failed)`,
            results: results
        });
    } catch (error) {
        console.error('Error in bulk add:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process bulk add',
            error: error.message
        });
    }
});

// Update ingredient (name, category, sku, etc.) and visibility flag
router.put('/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            category,
            sku,
            actual_unit,
            reorder_level,
            cost_per_unit, // Accept cost_per_unit for consistency
            storage_location,
            actual_quantity,
            days_of_stock,
            is_available,
            visible_in_customization,
            extra_price_per_unit
        } = req.body;

        // Old values for logging
        const [existing] = await db.query('SELECT * FROM ingredients WHERE id = ?', [id]);
        const oldValues = existing.length > 0 ? existing[0] : null;

        // Ensure column exists (best-effort)
        try {
            await db.query(`
                ALTER TABLE ingredients 
                ADD COLUMN IF NOT EXISTS extra_price_per_unit DECIMAL(10,2) NULL DEFAULT NULL
            `);
        } catch (schemaErr) {
            const msg = (schemaErr && schemaErr.message) ? schemaErr.message : '';
            if (!/Duplicate column name|exists/i.test(String(msg))) {
                console.warn('extra_price_per_unit column check:', msg);
            }
        }

        await db.query(`
            UPDATE ingredients SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                sku = COALESCE(?, sku),
                actual_unit = COALESCE(?, actual_unit),
                reorder_level = COALESCE(?, reorder_level),
                cost_per_actual_unit = COALESCE(?, cost_per_actual_unit),
                extra_price_per_unit = COALESCE(?, extra_price_per_unit),
                storage_location = COALESCE(?, storage_location),
                actual_quantity = COALESCE(?, actual_quantity),
                days_of_stock = COALESCE(?, days_of_stock),
                is_available = COALESCE(?, is_available),
                visible_in_customization = COALESCE(?, visible_in_customization)
            WHERE id = ?
        `, [
            name,
            description,
            category,
            sku,
            actual_unit,
            reorder_level,
            cost_per_unit || 0, // Map cost_per_unit to cost_per_actual_unit
            (extra_price_per_unit != null ? parseFloat(extra_price_per_unit) : null),
            storage_location,
            actual_quantity,
            days_of_stock,
            is_available,
            visible_in_customization,
            id
        ]);

        // Emit real-time update for inventory change
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('inventory-updated', {
                type: 'ingredient_updated',
                ingredientId: id,
                name,
                category,
                actual_quantity,
                timestamp: new Date()
            });
            io.to('staff-room').emit('inventory-updated', {
                type: 'ingredient_updated',
                ingredientId: id,
                name,
                category,
                actual_quantity,
                timestamp: new Date()
            });
        }

        res.json({ success: true, message: 'Ingredient updated successfully' });

        // Log admin activity
        try {
            const [updated] = await db.query('SELECT * FROM ingredients WHERE id = ?', [id]);
            const newValues = updated.length > 0 ? updated[0] : null;
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'update_ingredient',
                    'ingredient',
                    id,
                    oldValues,
                    newValues,
                    `Updated ingredient ${name || (oldValues && oldValues.name) || id}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (update_ingredient) failed:', e.message);
        }
    } catch (error) {
        console.error('Error updating ingredient:', error);
        res.status(500).json({ success: false, message: 'Failed to update ingredient' });
    }
});

// Removed unit conversion endpoint as conversion/display units are no longer used

module.exports = router;