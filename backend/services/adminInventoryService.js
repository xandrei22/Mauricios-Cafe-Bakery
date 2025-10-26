const db = require('../config/db');

class AdminInventoryService {
    // Simple in-service unit conversion helper (no DB dependency)
    convertUnits(amount, fromUnit, toUnit) {
        if (!fromUnit || !toUnit || fromUnit === toUnit) return amount;

        const volume = {
            l: { ml: 1000, l: 1 },
            ml: { l: 0.001, ml: 1 },
            cup: { ml: 240 },
            shot: { ml: 25 },
            pump: { ml: 15 },
            tbsp: { ml: 15 },
            tsp: { ml: 5 }
        };

        const weight = {
            kg: { g: 1000, kg: 1 },
            g: { kg: 0.001, g: 1 }
        };

        const normalize = (u) => (u || '').toLowerCase();
        const f = normalize(fromUnit);
        const t = normalize(toUnit);

        // volume chain
        if (volume[f]) {
            // convert to ml as hub if needed
            const toMlFactor = volume[f].ml || 1;
            const amountMl = amount * toMlFactor;
            if (t === 'ml') return amountMl;
            if (t === 'l') return amountMl * ((volume['ml'] && volume['ml']['l']) || 0.001);
        }

        // weight chain
        if (weight[f]) {
            const toGFactor = weight[f].g || 1;
            const amountG = amount * toGFactor;
            if (t === 'g') return amountG;
            if (t === 'kg') return amountG * ((weight['g'] && weight['g']['kg']) || 0.001);
        }

        // pieces → pieces or unknown mapping; return unchanged
        return amount;
    }

    // Automatic inventory deduction when order is placed
    async deductInventoryForOrder(orderId, menuItemId, customizations = null) {
        try {
            console.log(`Admin inventory service: Deducting inventory for order ${orderId}, menu item ${menuItemId}`);

            // Use the ingredientDeductionService instead of custom logic
            const ingredientDeductionService = require('./ingredientDeductionService');

            const itemsForDeduction = [{
                menuItemId: menuItemId,
                quantity: 1, // Default quantity, adjust if needed
                customizations: customizations,
                name: 'Menu Item' // Will be replaced by actual name
            }];

            // Note: Ingredient deduction now happens when order is marked as 'ready', not during admin inventory operations
            console.log(`Admin inventory operation completed for order ${orderId} - ingredients will be deducted when marked as ready`);
            return { success: true, message: 'Admin inventory operation completed' };

        } catch (error) {
            console.error(`Admin inventory deduction failed for order ${orderId}:`, error);
            throw error;
        }
    }

    // Restore inventory when order is cancelled
    async restoreInventoryForOrder(orderId, menuItemId, customizations = null) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Get recipe ingredients for the menu item
            const [recipeIngredients] = await connection.query(`
                SELECT 
                    mii.ingredient_id,
                    mii.required_actual_amount,
                    mii.required_display_amount,
                    i.name as ingredient_name,
                    i.actual_quantity,
                    i.actual_unit
                FROM menu_item_ingredients mii
                JOIN ingredients i ON mii.ingredient_id = i.id
                WHERE mii.menu_item_id = ? AND i.is_available = TRUE
            `, [menuItemId]);

            if (recipeIngredients.length === 0) {
                throw new Error('No recipe found for this menu item');
            }

            const restorations = [];

            for (const ingredient of recipeIngredients) {
                let restorationAmount = ingredient.required_actual_amount;
                let displayAmount = ingredient.required_display_amount;

                // Apply customizations if provided
                if (customizations && customizations[ingredient.ingredient_id]) {
                    const customization = customizations[ingredient.ingredient_id];
                    if (customization.multiplier) {
                        restorationAmount *= customization.multiplier;
                        displayAmount *= customization.multiplier;
                    }
                }

                // Calculate new stock level
                const newStock = ingredient.actual_quantity + restorationAmount;

                // Update ingredient stock
                await connection.query(`
                    UPDATE ingredients 
                    SET actual_quantity = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [newStock, ingredient.ingredient_id]);

                // Log the restoration
                await connection.query(`
                    INSERT INTO inventory_deductions 
                    (order_id, menu_item_id, ingredient_id, deducted_actual_amount, deducted_display_amount, 
                     previous_stock, new_stock, deduction_type, customization_details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'restoration', ?)
                `, [
                    orderId, menuItemId, ingredient.ingredient_id, restorationAmount, displayAmount,
                    ingredient.actual_quantity, newStock,
                    customizations ? JSON.stringify(customizations) : null
                ]);

                // Log inventory transaction
                await connection.query(`
                    INSERT INTO inventory_transactions 
                    (ingredient_id, transaction_type, actual_amount, display_amount, 
                     previous_actual_quantity, new_actual_quantity, order_id, notes)
                    VALUES (?, 'restoration', ?, ?, ?, ?, ?, ?)
                `, [
                    ingredient.ingredient_id, restorationAmount, displayAmount,
                    ingredient.actual_quantity, newStock, orderId,
                    `Inventory restored for cancelled order ${orderId} - ${ingredient.ingredient_name}`
                ]);

                restorations.push({
                    ingredient_id: ingredient.ingredient_id,
                    ingredient_name: ingredient.ingredient_name,
                    restored_amount: restorationAmount,
                    restored_display_amount: displayAmount,
                    previous_stock: ingredient.actual_quantity,
                    new_stock: newStock
                });
            }

            await connection.commit();
            return {
                success: true,
                order_id: orderId,
                menu_item_id: menuItemId,
                restorations: restorations
            };

        } catch (error) {
            await connection.rollback();
            console.error('Inventory restoration error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Create new drink with recipe
    async createDrink(adminId, drinkData) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const {
                name,
                description,
                category,
                base_price,
                display_price,
                pos_visible = true,
                customer_visible = true,
                allow_customization = true,
                is_seasonal = false,
                seasonal_start = null,
                seasonal_end = null,
                ingredients = []
            } = drinkData;

            // Create menu item
            const [menuResult] = await connection.query(`
                INSERT INTO menu_items 
                (name, description, category, base_price, display_price, visible_in_pos, 
                 visible_in_customer_menu, allow_customization, created_by_admin_id, is_seasonal, 
                 seasonal_start, seasonal_end)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                name, description, category, base_price, display_price,
                pos_visible, customer_visible, allow_customization, adminId,
                is_seasonal, seasonal_start, seasonal_end
            ]);

            const menuItemId = menuResult.insertId;

            // Add recipe ingredients
            for (const ingredient of ingredients) {
                const { ingredient_id, actual_amount, amount, unit, display_amount, is_optional = false } = ingredient;

                // Validate ingredient exists and fetch base unit
                const [ingredientCheck] = await connection.query(`
                    SELECT id, name, actual_unit FROM ingredients WHERE id = ? AND is_available = TRUE
                `, [ingredient_id]);

                if (ingredientCheck.length === 0) {
                    throw new Error(`Ingredient with ID ${ingredient_id} not found or not available`);
                }

                const baseUnit = ingredientCheck[0].actual_unit;

                let requiredActual = Number(actual_amount) || undefined;
                if (requiredActual === undefined) {
                    // Convert user-entered amount+unit to base unit
                    if (amount == null || !unit) {
                        throw new Error('Each recipe ingredient requires either actual_amount or amount+unit');
                    }
                    requiredActual = this.convertUnits(Number(amount), unit, baseUnit);
                }

                const requiredDisplay = display_amount != null ? display_amount : amount != null ? Number(amount) : null;

                await connection.query(`
                    INSERT INTO menu_item_ingredients 
                    (menu_item_id, ingredient_id, required_actual_amount, required_display_amount, is_optional)
                    VALUES (?, ?, ?, ?, ?)
                `, [menuItemId, ingredient_id, requiredActual, requiredDisplay, is_optional]);
            }

            // Log admin activity
            await connection.query(`
                INSERT INTO admin_activity_log 
                (admin_id, action_type, target_type, target_id, new_values, description)
                VALUES (?, 'create_drink', 'menu_item', ?, ?, ?)
            `, [
                adminId, menuItemId, JSON.stringify(drinkData),
                `Created new drink: ${name}`
            ]);

            await connection.commit();
            return { success: true, menu_item_id: menuItemId, message: 'Drink created successfully' };

        } catch (error) {
            await connection.rollback();
            console.error('Create drink error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Update drink POS visibility
    async updateDrinkVisibility(adminId, menuItemId, visibilitySettings) {
        try {
            const { visible_in_pos, visible_in_customer_menu } = visibilitySettings;

            // Get current values for logging
            const [currentItem] = await db.query(`
                SELECT visible_in_pos, visible_in_customer_menu FROM menu_items WHERE id = ?
            `, [menuItemId]);

            if (currentItem.length === 0) {
                throw new Error('Menu item not found');
            }

            // Update visibility
            await db.query(`
                UPDATE menu_items 
                SET visible_in_pos = ?, visible_in_customer_menu = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [visible_in_pos, visible_in_customer_menu, menuItemId]);

            // Log admin activity
            await db.query(`
                INSERT INTO admin_activity_log 
                (admin_id, action_type, target_type, target_id, old_values, new_values, description)
                VALUES (?, 'toggle_pos_visibility', 'menu_item', ?, ?, ?, ?)
            `, [
                adminId, menuItemId,
                JSON.stringify(currentItem[0]),
                JSON.stringify({ visible_in_pos, visible_in_customer_menu }),
                `Updated visibility settings for menu item ${menuItemId}`
            ]);

            return { success: true, message: 'Visibility updated successfully' };

        } catch (error) {
            console.error('Update visibility error:', error);
            throw error;
        }
    }

    // Update drink customization permissions
    async updateCustomizationPermissions(adminId, menuItemId, allowCustomization) {
        try {
            // Get current value for logging
            const [currentItem] = await db.query(`
                SELECT allow_customization FROM menu_items WHERE id = ?
            `, [menuItemId]);

            if (currentItem.length === 0) {
                throw new Error('Menu item not found');
            }

            // Update customization permission
            await db.query(`
                UPDATE menu_items 
                SET allow_customization = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [allowCustomization, menuItemId]);

            // Log admin activity
            await db.query(`
                INSERT INTO admin_activity_log 
                (admin_id, action_type, target_type, target_id, old_values, new_values, description)
                VALUES (?, 'toggle_customization', 'menu_item', ?, ?, ?, ?)
            `, [
                adminId, menuItemId,
                JSON.stringify({ allow_customization: currentItem[0].allow_customization }),
                JSON.stringify({ allow_customization: allowCustomization }),
                `Updated customization permission for menu item ${menuItemId}`
            ]);

            return { success: true, message: 'Customization permissions updated successfully' };

        } catch (error) {
            console.error('Update customization error:', error);
            throw error;
        }
    }

    // Get synchronized POS menu (only items visible to both admin and customers)
    async getSynchronizedPOSMenu() {
        try {
            const [menuItems] = await db.query(`
                SELECT 
                    mi.*,
                    COUNT(mii.id) as ingredient_count,
                    GROUP_CONCAT(
                        CONCAT(
                            i.name, ':', 
                            COALESCE(mii.required_display_amount, mii.quantity, 0),
                            ' ', COALESCE(i.display_unit, i.actual_unit)
                        )
                        SEPARATOR '; '
                    ) as recipe_summary
                FROM menu_items mi
                LEFT JOIN menu_item_ingredients mii ON mi.id = mii.menu_item_id
                LEFT JOIN ingredients i ON mii.ingredient_id = i.id
                WHERE mi.visible_in_pos = TRUE 
                  AND mi.visible_in_customer_menu = TRUE 
                  AND mi.is_available = TRUE
                GROUP BY mi.id
                ORDER BY mi.category, mi.name
            `);

            // Use consistent deduplication for POS menu
            const { getPOSMenuItems } = require('../utils/menuDeduplication');
            const uniqueItems = getPOSMenuItems(menuItems);

            // Check ingredient availability for each unique menu item
            const availableItems = [];

            for (const item of uniqueItems) {
                const [ingredientCheck] = await db.query(`
                    SELECT 
                        COUNT(*) as total_ingredients,
                        SUM(
                            CASE WHEN i.actual_quantity >= COALESCE(mii.required_actual_amount, mii.quantity, 0)
                            THEN 1 ELSE 0 END
                        ) as available_ingredients
                    FROM menu_item_ingredients mii
                    JOIN ingredients i ON mii.ingredient_id = i.id
                    WHERE mii.menu_item_id = ? AND i.is_available = TRUE
                `, [item.id]);

                const availability = ingredientCheck[0];
                item.can_fulfill = availability.total_ingredients === availability.available_ingredients;
                item.partial_availability = availability.available_ingredients > 0;

                availableItems.push(item);
            }

            return availableItems;

        } catch (error) {
            console.error('Get synchronized POS menu error:', error);
            throw error;
        }
    }

    // Get admin activity log
    async getAdminActivityLog(adminId = null, limit = 50) {
        try {
            let query = `
                SELECT 
                    aal.*,
                    a.username as admin_username,
                    CASE 
                        WHEN aal.target_type = 'menu_item' THEN mi.name
                        WHEN aal.target_type = 'ingredient' THEN i.name
                        ELSE 'Unknown'
                    END as target_name
                FROM admin_activity_log aal
                JOIN admin a ON aal.admin_id = a.id
                LEFT JOIN menu_items mi ON aal.target_type = 'menu_item' AND aal.target_id = mi.id
                LEFT JOIN ingredients i ON aal.target_type = 'ingredient' AND aal.target_id = i.id
            `;

            const params = [];

            if (adminId) {
                query += ' WHERE aal.admin_id = ?';
                params.push(adminId);
            }

            query += ' ORDER BY aal.created_at DESC LIMIT ?';
            params.push(limit);

            const [activities] = await db.query(query, params);
            return activities;

        } catch (error) {
            console.error('Get admin activity log error:', error);
            throw error;
        }
    }
}

module.exports = new AdminInventoryService();