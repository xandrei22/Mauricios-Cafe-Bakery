const express = require('express');
const router = express.Router();
const adminInventoryController = require('../controllers/adminInventoryController');
// Note: ensureAuthenticated removed - all routes now use authenticateJWT (JWT-only)
const { authenticateJWT } = require('../middleware/jwtAuth');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const db = require('../config/db');

// Middleware to ensure admin authentication for all routes - uses JWT
router.use(authenticateJWT);
router.use(authorizeRoles(['admin']));

// Drink Management Routes
router.post('/drinks', adminInventoryController.createDrink);
router.put('/drinks/:menuItemId/visibility', adminInventoryController.updateDrinkVisibility);
router.put('/drinks/:menuItemId/customization', adminInventoryController.updateCustomizationPermissions);

// POS Management Routes
router.get('/pos/menu', adminInventoryController.getSynchronizedPOSMenu);
router.post('/pos/process-order', adminInventoryController.processOrder);

// Inventory Management Routes
router.get('/ingredients', adminInventoryController.getInventoryStatus);
router.put('/ingredients/:id/stock', adminInventoryController.updateIngredientStock);
router.put('/ingredients/bulk-update', adminInventoryController.bulkUpdateIngredientStock);
router.get('/low-stock-alerts', adminInventoryController.getLowStockAlerts);
router.post('/adjustments', adminInventoryController.processInventoryAdjustment);

// Basic CRUD operations for ingredients
router.get('/', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                id,
                name,
                category,
                sku,
                actual_unit,
                actual_quantity,
                reorder_level,
                cost_per_actual_unit AS cost_per_unit,
                storage_location,
                days_of_stock,
                description,
                is_available,
                visible_in_customization,
                COALESCE(updated_at, created_at, NOW()) AS last_updated,
                CASE 
                    WHEN actual_quantity <= 0 THEN 'out_of_stock'
                    WHEN actual_quantity <= reorder_level THEN 'low_stock'
                    ELSE 'in_stock'
                END AS status
            FROM ingredients 
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            inventory: rows.map(item => ({
                ...item,
                actual_quantity: parseFloat(item.actual_quantity),
                reorder_level: parseFloat(item.reorder_level),
                cost_per_actual_unit: parseFloat(item.cost_per_unit)
            }))
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory data'
        });
    }
});

// Get inventory categories
router.get('/categories', async(req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT DISTINCT category 
            FROM ingredients 
            WHERE category IS NOT NULL AND category != ''
            ORDER BY category ASC
        `);

        res.json({
            success: true,
            categories: rows.map(row => row.category)
        });
    } catch (error) {
        console.error('Error fetching inventory categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inventory categories'
        });
    }
});

// Add new ingredient
router.post('/', async(req, res) => {
    try {
        const {
            name,
            category,
            sku,
            description,
            actual_unit,
            initial_quantity,
            reorder_level,
            days_of_stock,
            cost_per_unit,
            storage_location
        } = req.body;

        // Validate required fields
        if (!name || !category || !sku || !actual_unit || !initial_quantity) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, sku, actual_unit, initial_quantity'
            });
        }

        // Check if SKU already exists
        const [existingSku] = await db.query('SELECT id FROM ingredients WHERE sku = ?', [sku]);
        if (existingSku.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'SKU already exists'
            });
        }

        // Insert new ingredient
        const [result] = await db.query(`
            INSERT INTO ingredients (
                name, category, sku, description, actual_unit, 
                actual_quantity, reorder_level, days_of_stock, 
                cost_per_actual_unit, storage_location, is_available, visible_in_customization
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
        `, [
            name, category, sku, description, actual_unit,
            parseFloat(initial_quantity) || 0,
            parseFloat(reorder_level) || 0,
            parseInt(days_of_stock) || 0,
            parseFloat(cost_per_unit) || 0, // Map cost_per_unit to cost_per_actual_unit
            storage_location
        ]);

        res.json({
            success: true,
            message: 'Ingredient added successfully',
            ingredientId: result.insertId
        });
    } catch (error) {
        console.error('Error adding ingredient:', error);
        res.status(500).json({
            success: false,
            error: `Failed to add item: ${error.message}`
        });
    }
});

// Bulk import ingredients
router.post('/bulk', async(req, res) => {
    try {
        // This endpoint expects a CSV file upload
        // For now, we'll handle the basic structure
        // You can enhance this with actual CSV parsing later

        const { ingredients } = req.body;

        if (!ingredients || !Array.isArray(ingredients)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request. Expected an array of ingredients.'
            });
        }

        const results = [];
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const ingredient of ingredients) {
                try {
                    const {
                        name,
                        category,
                        sku,
                        description,
                        actual_unit,
                        initial_quantity,
                        reorder_level,
                        days_of_stock,
                        cost_per_unit,
                        storage_location
                    } = ingredient;

                    // Validate required fields
                    if (!name || !category || !sku || !actual_unit || !initial_quantity) {
                        results.push({
                            success: false,
                            name: name || 'Unknown',
                            error: 'Missing required fields'
                        });
                        continue;
                    }

                    // Check if SKU already exists
                    const [existingSku] = await connection.query(
                        'SELECT id FROM ingredients WHERE sku = ?', [sku]
                    );

                    if (existingSku.length > 0) {
                        results.push({
                            success: false,
                            name,
                            error: 'SKU already exists'
                        });
                        continue;
                    }

                    // Insert ingredient
                    const [result] = await connection.query(`
                        INSERT INTO ingredients (
                            name, category, sku, description, actual_unit, 
                            actual_quantity, reorder_level, days_of_stock, 
                            cost_per_actual_unit, storage_location, is_available, visible_in_customization
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
                    `, [
                        name, category, sku, description, actual_unit,
                        parseFloat(initial_quantity) || 0,
                        parseFloat(reorder_level) || 0,
                        parseInt(days_of_stock) || 30,
                        parseFloat(cost_per_unit) || 0, // Map cost_per_unit to cost_per_actual_unit
                        storage_location
                    ]);

                    results.push({
                        success: true,
                        name,
                        ingredientId: result.insertId
                    });
                } catch (error) {
                    results.push({
                        success: false,
                        name: ingredient.name || 'Unknown',
                        error: error.message
                    });
                }
            }

            await connection.commit();

            const successCount = results.filter(r => r.success).length;
            const errorCount = results.length - successCount;

            res.status(errorCount > 0 ? 207 : 201).json({
                success: errorCount === 0,
                message: `Processed ${results.length} ingredients (${successCount} success, ${errorCount} failed)`,
                results
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error in bulk import:', error);
        res.status(500).json({
            success: false,
            error: `Failed to process bulk import: ${error.message}`
        });
    }
});

// Update ingredient
router.put('/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            category,
            actual_quantity,
            actual_unit,
            reorder_level,
            cost_per_unit
        } = req.body;

        // Validate required fields
        if (!name || !category || !actual_quantity || !actual_unit) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, actual_quantity, actual_unit'
            });
        }

        // Update ingredient
        await db.query(`
            UPDATE ingredients 
            SET name = ?, category = ?, actual_quantity = ?, actual_unit = ?, 
                reorder_level = ?, cost_per_actual_unit = ?, updated_at = NOW()
            WHERE id = ?
        `, [
            name, category, parseFloat(actual_quantity), actual_unit,
            parseFloat(reorder_level) || 0, parseFloat(cost_per_unit) || 0, id // Map cost_per_unit to cost_per_actual_unit
        ]);

        res.json({
            success: true,
            message: 'Ingredient updated successfully'
        });
    } catch (error) {
        console.error('Error updating ingredient:', error);
        res.status(500).json({
            success: false,
            error: `Failed to update item: ${error.message}`
        });
    }
});

// Delete ingredient
router.delete('/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // Check if ingredient is used in any menu items
        const [menuUsage] = await db.query(`
            SELECT COUNT(*) as count 
            FROM menu_item_ingredients 
            WHERE ingredient_id = ?
        `, [id]);

        if (menuUsage[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete ingredient that is used in menu items'
            });
        }

        // Delete ingredient
        await db.query('DELETE FROM ingredients WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Ingredient deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        res.status(500).json({
            success: false,
            error: `Failed to delete item: ${error.message}`
        });
    }
});

// Update ingredient customization visibility
router.put('/:id/customization-visibility', async(req, res) => {
    try {
        const { id } = req.params;
        const { visible_in_customization } = req.body;

        if (typeof visible_in_customization !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'visible_in_customization must be a boolean value'
            });
        }

        // Update ingredient customization visibility
        await db.query(`
            UPDATE ingredients 
            SET visible_in_customization = ?, updated_at = NOW()
            WHERE id = ?
        `, [visible_in_customization, id]);

        res.json({
            success: true,
            message: `Customization visibility updated to ${visible_in_customization ? 'visible' : 'hidden'}`
        });
    } catch (error) {
        console.error('Error updating customization visibility:', error);
        res.status(500).json({
            success: false,
            error: `Failed to update customization visibility: ${error.message}`
        });
    }
});

// Menu Management Routes
// Add new menu item
router.post('/menu', async(req, res) => {
    try {
        const {
            name,
            description,
            category,
            base_price,
            image_url,
            is_available,
            allow_customization
        } = req.body;

        // Validate required fields
        if (!name || !category || !base_price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, base_price'
            });
        }

        // Insert new menu item
        const [result] = await db.query(`
            INSERT INTO menu_items (
                name, description, category, base_price, display_price,
                is_available, allow_customization, visible_in_customer_menu,
                visible_in_pos, is_customizable
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, ?)
        `, [
            name, description, category, parseFloat(base_price), parseFloat(base_price),
            is_available !== false, allow_customization !== false, allow_customization !== false
        ]);

        res.json({
            success: true,
            message: 'Menu item added successfully',
            menuItemId: result.insertId
        });
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({
            success: false,
            error: `Failed to add menu item: ${error.message}`
        });
    }
});

// Update menu item
router.put('/menu/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            category,
            base_price,
            image_url,
            is_available,
            allow_customization
        } = req.body;

        // Validate required fields
        if (!name || !category || !base_price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, category, base_price'
            });
        }

        // Update menu item
        await db.query(`
            UPDATE menu_items 
            SET name = ?, description = ?, category = ?, base_price = ?, 
                display_price = ?, image_url = ?, is_available = ?, 
                allow_customization = ?, is_customizable = ?, updated_at = NOW()
            WHERE id = ?
        `, [
            name, description, category, parseFloat(base_price), parseFloat(base_price),
            image_url, is_available !== false, allow_customization !== false,
            allow_customization !== false, id
        ]);

        res.json({
            success: true,
            message: 'Menu item updated successfully'
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({
            success: false,
            error: `Failed to update menu item: ${error.message}`
        });
    }
});

// Delete menu item
router.delete('/menu/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // Check if menu item is used in any orders
        const [orderUsage] = await db.query(`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE items LIKE '%"menu_item_id":' || ? || '%'
        `, [id]);

        if (orderUsage[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete menu item that is used in orders'
            });
        }

        // Delete menu item
        await db.query('DELETE FROM menu_items WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({
            success: false,
            error: `Failed to delete menu item: ${error.message}`
        });
    }
});

// Get all menu items
router.get('/menu', async(req, res) => {
    try {
        const [menuItems] = await db.query(`
            SELECT 
                id, name, description, category, base_price, display_price,
                image_url, is_available, allow_customization, visible_in_customer_menu,
                visible_in_pos, is_customizable, created_at, updated_at
            FROM menu_items 
            ORDER BY category, name
        `);

        // Use consistent deduplication for admin menu
        const { getAdminMenuItems } = require('../utils/menuDeduplication');
        const uniqueItems = getAdminMenuItems(menuItems);

        res.json({
            success: true,
            menu_items: uniqueItems
        });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch menu items'
        });
    }
});

// Reporting Routes
router.get('/dashboard', adminInventoryController.getInventoryDashboard);
router.get('/transactions', adminInventoryController.getInventoryTransactions);
router.get('/analytics', adminInventoryController.getIngredientUsageAnalytics);
router.get('/cost-analysis', adminInventoryController.getIngredientCostAnalysis);
router.get('/reorder-recommendations', adminInventoryController.getReorderRecommendations);
router.get('/audit-trail', adminInventoryController.getInventoryAuditTrail);
router.get('/export', adminInventoryController.exportInventoryData);

module.exports = router;