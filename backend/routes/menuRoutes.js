const express = require('express');
const router = express.Router();
const db = require('../config/db');
const aiService = require('../services/aiService');
const qrService = require('../services/qrService');
const ActivityLogger = require('../utils/activityLogger');
const { getAdminMenuItems, getPOSMenuItems, getCustomerMenuItems } = require('../utils/menuDeduplication');

// Get all menu items visible to customers (customer-facing menu)
router.get('/items', async(req, res) => {
    try {
        // Get all menu items first
        const [items] = await db.query(`
            SELECT * FROM menu_items 
            ORDER BY category, name, id DESC
        `);

        // Use consistent deduplication for customer menu
        const uniqueItems = getCustomerMenuItems(items);

        // Then get ingredients for each unique menu item separately
        const processedItems = await Promise.all(uniqueItems.map(async(item) => {
            const [ingredients] = await db.query(`
                SELECT 
                    mii.ingredient_id,
                    mii.required_display_amount as base_quantity,
                    mii.required_actual_amount as actual_quantity,
                    mii.recipe_unit as base_unit,
                    i.actual_unit as inventory_unit,
                    i.display_unit,
                    i.name as ingredient_name,
                    mii.is_optional
                FROM menu_item_ingredients mii
                LEFT JOIN ingredients i ON mii.ingredient_id = i.id
                WHERE mii.menu_item_id = ?
            `, [item.id]);

            // Process ingredients to show proper units
            const processedIngredients = ingredients.map(ing => ({
                ingredient_id: ing.ingredient_id,
                base_quantity: ing.base_quantity,
                base_unit: ing.base_unit, // Use the recipe unit from database
                actual_quantity: ing.actual_quantity,
                inventory_unit: ing.inventory_unit,
                ingredient_name: ing.ingredient_name,
                is_optional: ing.is_optional
            }));

            return {
                ...item,
                ingredients: processedIngredients || []
            };
        }));

        console.log('Processed customer menu items with ingredients:', processedItems.length);

        res.json({ success: true, items: processedItems });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch menu items' });
    }
});

// Get menu items for POS (only those flagged visible_in_pos)
router.get('/pos', async(req, res) => {
    try {
        // Get all menu items first
        const [items] = await db.query(`
            SELECT * FROM menu_items
            ORDER BY category, name, id DESC
        `);

        // Use consistent deduplication for POS menu
        const uniqueItems = getPOSMenuItems(items);

        res.json({ success: true, menu_items: uniqueItems });
    } catch (error) {
        console.error('Error fetching POS menu items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch POS items' });
    }
});

// Admin: list all menu items (no visibility filtering)
router.get('/', async(req, res) => {
    try {
        const [items] = await db.query(`
            SELECT * FROM menu_items ORDER BY created_at DESC
        `);

        // Use consistent deduplication for admin menu
        const uniqueItems = getAdminMenuItems(items);

        res.json({ success: true, menuItems: uniqueItems });
    } catch (error) {
        console.error('Error fetching all menu items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch menu items' });
    }
});

// Get all menu items with ingredients (admin view - includes hidden items)
router.get('/with-ingredients', async(req, res) => {
    try {
        // First get all menu items
        const [menuItems] = await db.query(`
            SELECT * FROM menu_items 
            ORDER BY category, name
        `);

        // Use consistent deduplication for admin menu
        const uniqueItems = getAdminMenuItems(menuItems);

        // Then get ingredients for each unique menu item separately
        const processedMenuItems = await Promise.all(uniqueItems.map(async(item) => {
            const [ingredients] = await db.query(`
                SELECT 
                    mii.ingredient_id,
                    mii.required_display_amount as base_quantity,
                    mii.required_actual_amount as actual_quantity,
                    mii.recipe_unit as base_unit,
                    i.actual_unit as inventory_unit,
                    i.display_unit,
                    i.name as ingredient_name,
                    mii.is_optional
                FROM menu_item_ingredients mii
                LEFT JOIN ingredients i ON mii.ingredient_id = i.id
                WHERE mii.menu_item_id = ?
            `, [item.id]);

            // Process ingredients to show proper units
            const processedIngredients = ingredients.map(ing => ({
                ingredient_id: ing.ingredient_id,
                base_quantity: ing.base_quantity,
                base_unit: ing.base_unit, // Use the recipe unit from database
                actual_quantity: ing.actual_quantity,
                inventory_unit: ing.inventory_unit,
                ingredient_name: ing.ingredient_name,
                is_optional: ing.is_optional
            }));

            return {
                ...item,
                ingredients: processedIngredients || []
            };
        }));

        console.log('Processed menu items with ingredients:', processedMenuItems);

        res.json({ success: true, menuItems: processedMenuItems });
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch menu items' });
    }
});


// Create new menu item
router.post('/', async(req, res) => {
    try {
        const {
            name,
            description,
            category,
            sellingPrice,
            cost,
            addOns,
            orderNotes,
            notes,
            variants,
            ingredients,
            image_url,
            imageUrl,
            allow_customization,
            visibleInPos,
            visibleInCustomerMenu
        } = req.body;

        // Validate required fields
        if (!name || !category || !sellingPrice) {
            return res.status(400).json({
                success: false,
                error: 'Name, category, and selling price are required'
            });
        }

        const basePrice = parseFloat(sellingPrice);
        if (Number.isNaN(basePrice)) {
            return res.status(400).json({ success: false, error: 'Invalid selling price' });
        }

        // Insert menu item
        const [result] = await db.query(`
            INSERT INTO menu_items (
                name, 
                description, 
                category, 
                base_price, 
                cost,
                visible_in_pos,
                visible_in_customer_menu,
                allow_customization,
                add_ons,
                order_notes,
                notes,
                image_url,
                is_available
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            description || '',
            category,
            basePrice,
            cost || 0,
            visibleInPos !== undefined ? visibleInPos : true, // visible_in_pos from request
            visibleInCustomerMenu !== undefined ? visibleInCustomerMenu : true, // visible_in_customer_menu from request
            allow_customization !== false,
            addOns || false,
            orderNotes || false,
            notes || '',
            image_url || imageUrl || null,
            true
        ]);

        const menuItemId = result.insertId;

        // Handle recipe ingredients if provided
        if (ingredients && ingredients.length > 0) {
            for (const ingredient of ingredients) {
                try {
                    // Get ingredient details to understand units
                    const [ingredientDetails] = await db.query(`
                        SELECT actual_unit, display_unit, conversion_rate 
                        FROM ingredients 
                        WHERE id = ?
                    `, [ingredient.ingredient_id]);

                    if (ingredientDetails.length === 0) {
                        console.warn(`Ingredient ${ingredient.ingredient_id} not found`);
                        continue;
                    }

                    const ingredientDetail = ingredientDetails[0];
                    // Handle both frontend field names: base_quantity/amount and base_unit/unit
                    const recipeAmount = ingredient.base_quantity || ingredient.amount || 0;
                    const recipeUnit = ingredient.base_unit || ingredient.unit || ingredientDetail.actual_unit;

                    // Convert recipe amount to actual inventory amount
                    let requiredActualAmount = recipeAmount;
                    let requiredDisplayAmount = recipeAmount;

                    // If recipe unit is different from ingredient's actual unit, convert
                    if (recipeUnit !== ingredientDetail.actual_unit) {
                        // Simple conversion logic - can be enhanced later
                        if (recipeUnit === 'g' && ingredientDetail.actual_unit === 'kg') {
                            requiredActualAmount = recipeAmount / 1000; // Convert g to kg
                            requiredDisplayAmount = recipeAmount; // Keep original for display
                        } else if (recipeUnit === 'kg' && ingredientDetail.actual_unit === 'g') {
                            requiredActualAmount = recipeAmount * 1000; // Convert kg to g
                            requiredDisplayAmount = recipeAmount; // Keep original for display
                        } else if (recipeUnit === 'ml' && ingredientDetail.actual_unit === 'l') {
                            requiredActualAmount = recipeAmount / 1000; // Convert ml to l
                            requiredDisplayAmount = recipeAmount; // Keep original for display
                        } else if (recipeUnit === 'l' && ingredientDetail.actual_unit === 'ml') {
                            requiredActualAmount = recipeAmount * 1000; // Convert l to ml
                            requiredDisplayAmount = recipeAmount; // Keep original for display
                        } else {
                            // For other units, store both amounts as-is for now
                            requiredActualAmount = recipeAmount;
                            requiredDisplayAmount = recipeAmount;
                        }
                    }

                    await db.query(`
                        INSERT INTO menu_item_ingredients (
                            menu_item_id,
                            ingredient_id,
                            required_actual_amount,
                            required_display_amount,
                            recipe_unit,
                            is_optional
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        menuItemId,
                        ingredient.ingredient_id,
                        requiredActualAmount,
                        requiredDisplayAmount,
                        recipeUnit,
                        ingredient.is_optional || false
                    ]);

                    console.log(`Created recipe ingredient: ${ingredientDetail.actual_unit} ${requiredActualAmount} (display: ${recipeUnit} ${requiredDisplayAmount})`);
                } catch (ingredientError) {
                    console.error('Error adding ingredient to recipe:', ingredientError);
                    // Continue with other ingredients instead of failing the entire menu item creation
                }
            }
        }

        // Handle variants if provided
        if (variants && variants.length > 0) {
            // insert variants only if table exists
            const [vt] = await db.query(`
                SELECT COUNT(*) AS c FROM information_schema.tables
                WHERE table_schema = DATABASE() AND table_name = 'menu_item_variants'
            `);
            if (vt[0].c > 0) {
                for (const variant of variants) {
                    await db.query(`
                        INSERT INTO menu_item_variants (
                            menu_item_id,
                            name,
                            price,
                            cost
                        ) VALUES (?, ?, ?, ?)
                    `, [
                        menuItemId,
                        variant.name,
                        Number(variant.price) || 0,
                        Number(variant.cost) || 0
                    ]);
                }
            }
        }

        // Emit socket event for menu creation
        try {
            const io = req.app.get('io');
            if (io) {
                io.emit('menu:created', { id: menuItemId, name, category, base_price: sellingPrice, image_url: image_url || imageUrl || null });
            }
        } catch (e) {
            console.warn('menu:created emit failed', e.message);
        }

        // Log admin activity (if admin session present)
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'create_menu_item',
                    'menu_item',
                    menuItemId,
                    null, { name, category, base_price: sellingPrice, cost: cost || 0 },
                    `Created menu item ${name}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (create_menu_item) failed:', e.message);
        }

        res.json({
            success: true,
            message: 'Menu item created successfully',
            menuItemId
        });
    } catch (error) {
        console.error('Error creating menu item:', error);
        res.status(500).json({ success: false, error: 'Failed to create menu item' });
    }
});

// Update menu item
router.put('/:id', async(req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            category,
            sellingPrice,
            cost,
            addOns,
            orderNotes,
            notes,
            variants,
            isAvailable,
            image_url,
            imageUrl,
            allow_customization,
            visibleInPos,
            visibleInCustomerMenu
        } = req.body;

        console.log('Updating menu item:', {
            id,
            name,
            category,
            sellingPrice,
            cost,
            visibleInPos,
            visibleInCustomerMenu,
            ingredients: req.body.ingredients
        });

        // Validate required fields
        if (!name || !category || !sellingPrice) {
            return res.status(400).json({
                success: false,
                error: 'Name, category, and selling price are required'
            });
        }

        // Get current item for logging old values
        const [existingItems] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
        const oldValues = existingItems.length > 0 ? existingItems[0] : null;

        // Update menu item
        const visibilityPos = visibleInPos !== undefined ? visibleInPos : true;
        const visibilityCustomer = visibleInCustomerMenu !== undefined ? visibleInCustomerMenu : true;

        console.log('🔧 SQL Update values:', {
            id,
            name,
            visibleInPos: visibilityPos,
            visibleInCustomerMenu: visibilityCustomer,
            allow_customization: allow_customization !== false
        });

        await db.query(`
            UPDATE menu_items SET
                name = ?,
                description = ?,
                category = ?,
                base_price = ?,
                cost = ?,
                visible_in_pos = ?,
                visible_in_customer_menu = ?,
                allow_customization = ?,
                add_ons = ?,
                order_notes = ?,
                notes = ?,
                image_url = ?,
                is_available = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            name,
            description || '',
            category,
            sellingPrice,
            cost || 0,
            visibilityPos, // visible_in_pos from request
            visibilityCustomer, // visible_in_customer_menu from request
            allow_customization !== false,
            addOns || false,
            orderNotes || false,
            notes || '',
            image_url || imageUrl || null,
            isAvailable !== undefined ? isAvailable : true,
            id
        ]);

        // Verify the update was successful
        const [updatedItem] = await db.query(`
            SELECT id, name, visible_in_pos, visible_in_customer_menu 
            FROM menu_items 
            WHERE id = ?
        `, [id]);

        console.log('✅ Update verification:', {
            id: updatedItem[0].id,
            name: updatedItem[0].name,
            visible_in_pos: updatedItem[0].visible_in_pos,
            visible_in_customer_menu: updatedItem[0].visible_in_customer_menu
        });

        // Handle variants if provided
        if (variants) {
            // Delete existing variants
            await db.query('DELETE FROM menu_item_variants WHERE menu_item_id = ?', [id]);

            // Insert new variants
            if (variants.length > 0) {
                for (const variant of variants) {
                    await db.query(`
                        INSERT INTO menu_item_variants (
                            menu_item_id,
                            name,
                            price,
                            cost
                        ) VALUES (?, ?, ?, ?)
                    `, [
                        id,
                        variant.name,
                        variant.price,
                        variant.cost || 0
                    ]);
                }
            }
        }

        // Handle recipe ingredients if provided
        if (req.body.ingredients) {
            console.log('Processing ingredients:', req.body.ingredients);

            // Delete existing recipe ingredients
            await db.query('DELETE FROM menu_item_ingredients WHERE menu_item_id = ?', [id]);

            // Insert new recipe ingredients
            if (req.body.ingredients.length > 0) {
                for (const ingredient of req.body.ingredients) {
                    try {
                        console.log('Processing ingredient:', ingredient);

                        // Get ingredient details to understand units
                        const [ingredientDetails] = await db.query(`
                            SELECT actual_unit, display_unit, conversion_rate 
                            FROM ingredients 
                            WHERE id = ?
                        `, [ingredient.ingredient_id]);

                        if (ingredientDetails.length === 0) {
                            console.warn(`Ingredient ${ingredient.ingredient_id} not found`);
                            continue;
                        }

                        const ingredientDetail = ingredientDetails[0];
                        // Handle both frontend field names: base_quantity/amount and base_unit/unit
                        const recipeAmount = ingredient.base_quantity || ingredient.amount || 0;
                        const recipeUnit = ingredient.base_unit || ingredient.unit || ingredientDetail.actual_unit;

                        // Convert recipe amount to actual inventory amount
                        let requiredActualAmount = recipeAmount;
                        let requiredDisplayAmount = recipeAmount;

                        // If recipe unit is different from ingredient's actual unit, convert
                        if (recipeUnit !== ingredientDetail.actual_unit) {
                            // Simple conversion logic - can be enhanced later
                            if (recipeUnit === 'g' && ingredientDetail.actual_unit === 'kg') {
                                requiredActualAmount = recipeAmount / 1000; // Convert g to kg
                                requiredDisplayAmount = recipeAmount; // Keep original for display
                            } else if (recipeUnit === 'kg' && ingredientDetail.actual_unit === 'g') {
                                requiredActualAmount = recipeAmount * 1000; // Convert kg to g
                                requiredDisplayAmount = recipeAmount; // Keep original for display
                            } else if (recipeUnit === 'ml' && ingredientDetail.actual_unit === 'l') {
                                requiredActualAmount = recipeAmount / 1000; // Convert ml to l
                                requiredDisplayAmount = recipeAmount; // Keep original for display
                            } else if (recipeUnit === 'l' && ingredientDetail.actual_unit === 'ml') {
                                requiredActualAmount = recipeAmount * 1000; // Convert l to ml
                                requiredDisplayAmount = recipeAmount; // Keep original for display
                            } else {
                                // For other units, store both amounts as-is for now
                                requiredActualAmount = recipeAmount;
                                requiredDisplayAmount = recipeAmount;
                            }
                        }

                        await db.query(`
                            INSERT INTO menu_item_ingredients (
                                menu_item_id,
                                ingredient_id,
                                required_actual_amount,
                                required_display_amount,
                                recipe_unit,
                                is_optional
                            ) VALUES (?, ?, ?, ?, ?, ?)
                        `, [
                            id,
                            ingredient.ingredient_id,
                            requiredActualAmount,
                            requiredDisplayAmount,
                            recipeUnit,
                            ingredient.is_optional || false
                        ]);

                        console.log(`Saved recipe ingredient: ${ingredientDetail.actual_unit} ${requiredActualAmount} (display: ${recipeUnit} ${requiredDisplayAmount})`);
                    } catch (ingredientError) {
                        console.error('Error updating ingredient in recipe:', ingredientError);
                        // Continue with other ingredients instead of failing the entire update
                    }
                }
            }
        }

        // Fetch new values for logging
        const [updatedItems] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
        const newValues = updatedItems.length > 0 ? updatedItems[0] : null;

        // Log admin activity (if admin session present)
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'update_menu_item',
                    'menu_item',
                    id,
                    oldValues,
                    newValues,
                    `Updated menu item ${name}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (update_menu_item) failed:', e.message);
        }

        // Emit socket event for menu update
        try {
            const io = req.app.get('io');
            if (io) {
                io.emit('menu:updated', { id, name, category, base_price: sellingPrice, image_url: image_url || imageUrl || null });
            }
        } catch (e) {
            console.warn('menu:updated emit failed', e.message);
        }

        res.json({
            success: true,
            message: 'Menu item updated successfully'
        });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ success: false, error: 'Failed to update menu item' });
    }
});


// Delete menu item
router.delete('/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // Get current item for logging before delete
        const [existingItems] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
        const oldValues = existingItems.length > 0 ? existingItems[0] : null;

        // Delete recipe rows
        await db.query('DELETE FROM menu_item_ingredients WHERE menu_item_id = ?', [id]);

        // Delete variants only if the table exists
        const [vt] = await db.query(`
            SELECT COUNT(*) AS c FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = 'menu_item_variants'
        `);
        if (vt[0].c > 0) {
            await db.query('DELETE FROM menu_item_variants WHERE menu_item_id = ?', [id]);
        }

        // Delete menu item
        await db.query('DELETE FROM menu_items WHERE id = ?', [id]);

        // Log admin activity (if admin session present)
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;
            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'delete_menu_item',
                    'menu_item',
                    id,
                    oldValues,
                    null,
                    `Deleted menu item ${oldValues && oldValues.name ? oldValues.name : id}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (delete_menu_item) failed:', e.message);
        }

        // Emit socket event for deletion
        try {
            const io = req.app.get('io');
            if (io) {
                io.emit('menu:deleted', { id });
            }
        } catch (e) {
            console.warn('menu:deleted emit failed', e.message);
        }

        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ success: false, error: 'Failed to delete menu item' });
    }
});

// Get menu items by category
router.get('/items/category/:category', async(req, res) => {
    try {
        const { category } = req.params;
        const [items] = await db.query(`
            SELECT * FROM menu_items 
            WHERE category = ? AND is_available = TRUE AND customer_visible = TRUE
            ORDER BY name
        `, [category]);

        res.json({ success: true, items });
    } catch (error) {
        console.error('Error fetching menu items by category:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch menu items' });
    }
});

// Get menu item with ingredients
router.get('/items/:id', async(req, res) => {
    try {
        const { id } = req.params;

        // Get menu item details
        const [items] = await db.query(`
            SELECT * FROM menu_items WHERE id = ?
        `, [id]);

        if (items.length === 0) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }

        const menuItem = items[0];

        // Get ingredients for this menu item
        const [ingredients] = await db.query(`
            SELECT i.*, mii.quantity, mii.is_required
            FROM ingredients i
            JOIN menu_item_ingredients mii ON i.id = mii.ingredient_id
            WHERE mii.menu_item_id = ? AND i.is_available = TRUE
            ORDER BY i.category, i.name
        `, [id]);

        menuItem.ingredients = ingredients;

        res.json({ success: true, item: menuItem });
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch menu item' });
    }
});

// Get all ingredients
router.get('/ingredients', async(req, res) => {
    try {
        // Only return ingredients that are marked available, allowed for customization,
        // and have positive stock (when stock columns exist)
        const [ingredients] = await db.query(`
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
            ORDER BY category, name
        `);

        console.log('Ingredients query result:', ingredients);
        console.log('Number of ingredients found:', ingredients.length);

        res.json({ success: true, ingredients });
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch ingredients' });
    }
});

// Get allowed ingredients for a specific menu item (only visible + in stock)
router.get('/items/:id/allowed-ingredients', async(req, res) => {
    try {
        const { id } = req.params;
        const [ingredients] = await db.query(`
            SELECT 
              i.id,
              i.name,
              i.category,
              i.display_unit,
              i.actual_unit,
              i.cost_per_actual_unit,
              i.is_available,
              i.visible_in_customization,
              COALESCE(i.current_stock, i.stock, i.quantity, i.on_hand, i.available_quantity, 0) AS stock,
              mii.is_optional
            FROM menu_item_ingredients mii
            INNER JOIN ingredients i ON i.id = mii.ingredient_id
            WHERE mii.menu_item_id = ?
              AND i.is_available = TRUE
              AND (i.visible_in_customization = TRUE OR i.visible_in_customization IS NULL)
              AND COALESCE(i.current_stock, i.stock, i.quantity, i.on_hand, i.available_quantity, 1) > 0
            ORDER BY i.category, i.name
        `, [id]);

        res.json({ success: true, ingredients });
    } catch (error) {
        console.error('Error fetching allowed ingredients for item:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch allowed ingredients' });
    }
});

// Get ingredients by category
router.get('/ingredients/category/:category', async(req, res) => {
    try {
        const { category } = req.params;
        const [ingredients] = await db.query(`
            SELECT * FROM ingredients 
            WHERE category = ? AND is_available = TRUE 
            ORDER BY name
        `, [category]);

        res.json({ success: true, ingredients });
    } catch (error) {
        console.error('Error fetching ingredients by category:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch ingredients' });
    }
});

// Get AI recommendations
router.post('/recommendations', async(req, res) => {
    try {
        const { dietaryPreferences, customerHistory } = req.body;

        const recommendations = await aiService.getDrinkRecommendations(
            dietaryPreferences || {},
            customerHistory || []
        );

        res.json({ success: true, recommendations });
    } catch (error) {
        console.error('Error getting AI recommendations:', error);
        res.status(500).json({ success: false, error: 'Failed to get recommendations' });
    }
});

// Get customization suggestions
router.post('/customizations', async(req, res) => {
    try {
        const { baseDrink, dietaryPreferences } = req.body;

        const suggestions = await aiService.getCustomizationSuggestions(
            baseDrink,
            dietaryPreferences || {}
        );

        res.json({ success: true, suggestions });
    } catch (error) {
        console.error('Error getting customization suggestions:', error);
        res.status(500).json({ success: false, error: 'Failed to get customization suggestions' });
    }
});

// Calculate custom drink price
router.post('/calculate-price', async(req, res) => {
    try {
        const { baseItemId, customizations } = req.body;

        // Get base item price
        const [baseItems] = await db.query(`
            SELECT base_price FROM menu_items WHERE id = ?
        `, [baseItemId]);

        if (baseItems.length === 0) {
            return res.status(404).json({ success: false, error: 'Base item not found' });
        }

        let totalPrice = parseFloat(baseItems[0].base_price);
        const customizationDetails = [];

        // Calculate customization costs
        if (customizations && customizations.length > 0) {
            const [ingredients] = await db.query(`
                SELECT id, name, price_modifier FROM ingredients 
                WHERE id IN (${customizations.map(() => '?').join(',')})
            `, customizations);

            ingredients.forEach(ingredient => {
                totalPrice += parseFloat(ingredient.price_modifier);
                customizationDetails.push({
                    name: ingredient.name,
                    price: parseFloat(ingredient.price_modifier)
                });
            });
        }

        res.json({
            success: true,
            basePrice: parseFloat(baseItems[0].base_price),
            customizations: customizationDetails,
            totalPrice: totalPrice
        });
    } catch (error) {
        console.error('Error calculating price:', error);
        res.status(500).json({ success: false, error: 'Failed to calculate price' });
    }
});

// Generate table QR code
router.post('/qr/table', async(req, res) => {
    try {
        const { tableNumber } = req.body;

        if (!tableNumber) {
            return res.status(400).json({ success: false, error: 'Table number is required' });
        }

        const qrCode = await qrService.generateTableQR(tableNumber);

        res.json({ success: true, qrCode });
    } catch (error) {
        console.error('Error generating table QR code:', error);
        res.status(500).json({ success: false, error: 'Failed to generate QR code' });
    }
});

// Generate bulk table QR codes
router.post('/qr/table/bulk', async(req, res) => {
    try {
        const { tableCount } = req.body;

        if (!tableCount || tableCount < 1) {
            return res.status(400).json({ success: false, error: 'Valid table count is required' });
        }

        if (tableCount > 6) {
            return res.status(400).json({ success: false, error: 'Maximum 6 tables allowed' });
        }

        const qrCodes = await qrService.generateBulkTableQRs(tableCount);

        res.json({ success: true, qrCodes });
    } catch (error) {
        console.error('Error generating bulk table QR codes:', error);
        res.status(500).json({ success: false, error: 'Failed to generate QR codes' });
    }
});

// Search menu items
router.get('/search', async(req, res) => {
    try {
        const { query, category } = req.query;

        let sql = `
            SELECT * FROM menu_items 
            WHERE is_available = TRUE AND visible_in_customer_menu = TRUE
        `;
        const params = [];

        if (query) {
            sql += ` AND (name LIKE ? OR description LIKE ?)`;
            params.push(`%${query}%`, `%${query}%`);
        }

        if (category) {
            sql += ` AND category = ?`;
            params.push(category);
        }

        sql += ` ORDER BY category, name`;

        const [items] = await db.query(sql, params);

        res.json({ success: true, items });
    } catch (error) {
        console.error('Error searching menu items:', error);
        res.status(500).json({ success: false, error: 'Failed to search menu items' });
    }
});

// Get menu categories
// Get menu categories (union of explicit categories table and existing item categories)
router.get('/categories', async(req, res) => {
    try {
        // Ensure auxiliary table exists
        await db.query(`
            CREATE TABLE IF NOT EXISTS menu_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        const [rows] = await db.query(`
            SELECT name AS category FROM menu_categories
            UNION
            SELECT DISTINCT category FROM menu_items
            ORDER BY category
        `);

        res.json({ success: true, categories: rows.map(r => r.category).filter(Boolean) });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

// Create a new category (shared across menu items)
router.post('/categories', async(req, res) => {
    try {
        const { name } = req.body || {};
        const trimmed = (name || '').trim();
        if (!trimmed) {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS menu_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        await db.query('INSERT IGNORE INTO menu_categories (name) VALUES (?)', [trimmed]);
        res.json({ success: true, name: trimmed });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});

// Delete a category if unused by any menu item
router.delete('/categories/:name', async(req, res) => {
    try {
        const { name } = req.params;
        const trimmed = (name || '').trim();
        if (!trimmed) {
            return res.status(400).json({ success: false, error: 'Category name is required' });
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS menu_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        const [cnt] = await db.query('SELECT COUNT(*) AS c FROM menu_items WHERE category = ?', [trimmed]);
        if (cnt[0].c > 0) {
            return res.status(409).json({ success: false, error: 'Category is in use by menu items' });
        }

        await db.query('DELETE FROM menu_categories WHERE name = ?', [trimmed]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
});

// Get ingredient categories
router.get('/ingredients/categories', async(req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT DISTINCT category FROM ingredients 
            WHERE is_available = TRUE 
            ORDER BY category
        `);

        const categoryList = categories.map(cat => cat.category);

        res.json({ success: true, categories: categoryList });
    } catch (error) {
        console.error('Error fetching ingredient categories:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

// Get most popular menu items based on order frequency
router.get('/popular', async(req, res) => {
    try {
        const { limit = 5 } = req.query;

        // Get popular items by counting order frequency
        const [popularItems] = await db.query(`
            SELECT 
                mi.id,
                mi.name,
                mi.description,
                mi.category,
                mi.base_price,
                mi.display_price,
                mi.image_url,
                COUNT(*) as order_count,
                SUM(JSON_LENGTH(o.items)) as total_quantity_ordered
            FROM menu_items mi
            INNER JOIN orders o ON JSON_CONTAINS(o.items, JSON_OBJECT('name', mi.name))
            WHERE mi.is_available = TRUE 
                AND mi.visible_in_customer_menu = TRUE
                AND o.status IN ('completed', 'ready')
            GROUP BY mi.id, mi.name, mi.description, mi.category, mi.base_price, mi.display_price, mi.image_url
            ORDER BY order_count DESC, total_quantity_ordered DESC
            LIMIT ?
        `, [parseInt(limit)]);

        // If no popular items found, get some random available items as fallback
        if (popularItems.length === 0) {
            const [fallbackItems] = await db.query(`
                SELECT 
                    id,
                    name,
                    description,
                    category,
                    base_price,
                    display_price,
                    image_url,
                    0 as order_count,
                    0 as total_quantity_ordered
                FROM menu_items 
                WHERE is_available = TRUE 
                    AND visible_in_customer_menu = TRUE
                ORDER BY RAND()
                LIMIT ?
            `, [parseInt(limit)]);

            res.json({ success: true, popular_items: fallbackItems });
        } else {
            res.json({ success: true, popular_items: popularItems });
        }
    } catch (error) {
        console.error('Error fetching popular menu items:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch popular items' });
    }
});

// Update menu item visibility
router.patch('/:id/visibility', async(req, res) => {
    try {
        const { id } = req.params;
        const { visible_in_pos, visible_in_customer_menu } = req.body;

        // Validate that at least one visibility field is provided
        if (visible_in_pos === undefined && visible_in_customer_menu === undefined) {
            return res.status(400).json({
                success: false,
                error: 'At least one visibility field must be provided'
            });
        }

        // Build update query dynamically based on provided fields
        let updateFields = [];
        let params = [];

        if (visible_in_pos !== undefined) {
            updateFields.push('visible_in_pos = ?');
            params.push(visible_in_pos);
        }

        if (visible_in_customer_menu !== undefined) {
            updateFields.push('visible_in_customer_menu = ?');
            params.push(visible_in_customer_menu);
        }

        // Add updated_at field
        updateFields.push('updated_at = NOW()');
        params.push(id);

        // Update the menu item
        await db.query(`
            UPDATE menu_items 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, params);

        // Log admin activity
        try {
            const adminId = (req.session && (
                (req.session.user && req.session.user.id) ||
                (req.session.admin && req.session.admin.id) ||
                (req.session.adminUser && req.session.adminUser.id)
            )) || null;

            if (adminId) {
                await ActivityLogger.logAdminActivity(
                    adminId,
                    'update_menu_visibility',
                    'menu_item',
                    id,
                    null, { visible_in_pos, visible_in_customer_menu },
                    `Updated menu item visibility for item ${id}`,
                    req
                );
            }
        } catch (e) {
            console.warn('Activity log (update_menu_visibility) failed:', e.message);
        }

        // Emit real-time update for menu changes
        const io = req.app.get('io');
        if (io) {
            console.log('Emitting menu-updated event for visibility change');
            io.emit('menu-updated', {
                type: 'visibility_updated',
                menuItemId: id,
                visible_in_pos,
                visible_in_customer_menu,
                timestamp: new Date()
            });
        }

        res.json({
            success: true,
            message: 'Menu item visibility updated successfully'
        });
    } catch (error) {
        console.error('Error updating menu item visibility:', error);
        res.status(500).json({
            success: false,
            error: `Failed to update menu item visibility: ${error.message}`
        });
    }
});

module.exports = router;