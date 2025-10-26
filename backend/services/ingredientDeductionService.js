const db = require('../config/db');
const notificationService = require('./notificationService');

class IngredientDeductionService {
    /**
     * Automatically deduct ingredients for an order
     * This is called whenever ANY order is created
     */
    async deductIngredientsForOrder(orderId, orderItems, req = null) {
        console.log(`Starting ingredient deduction for order ${orderId}`);
        console.log('Order items received:', orderItems);

        const connection = await db.getConnection();

        try {
            // First, let's check what columns exist in menu_item_ingredients table
            try {
                const [schemaResult] = await connection.query(`
                    DESCRIBE menu_item_ingredients
                `);
                console.log('Menu item ingredients table schema:', schemaResult.map(col => `${col.Field} (${col.Type})`));
            } catch (schemaError) {
                console.log('Could not check schema:', schemaError.message);
            }

            await connection.beginTransaction();

            const transactions = [];
            const errors = [];

            for (const item of orderItems) {
                const { menuItemId, quantity = 1, customizations = null } = item;
                console.log(`Processing item: menuItemId=${menuItemId}, quantity=${quantity}, name=${item.name}`);

                try {
                    // Get ingredient requirements for this menu item
                    const [ingredientsResult] = await connection.query(`
                        SELECT 
                            mii.ingredient_id,
                            /* Prefer actual amount from recipe; otherwise derive from display amount using ingredient conversion_rate */
                            COALESCE(
                                mii.required_actual_amount,
                                mii.required_display_amount * COALESCE(i.conversion_rate, 1.0),
                                mii.quantity * COALESCE(i.conversion_rate, 1.0),
                                1.0
                            ) AS base_quantity,
                            /* Work in actual inventory units */
                            i.actual_unit AS base_unit,
                            i.name AS ingredient_name,
                            i.actual_quantity AS current_stock,
                            i.actual_unit AS stock_unit,
                            i.reorder_level,
                            i.category
                        FROM menu_item_ingredients mii
                        JOIN ingredients i ON mii.ingredient_id = i.id
                        WHERE mii.menu_item_id = ?
                    `, [menuItemId]);

                    console.log(`Looking up ingredients for menu item ${menuItemId}, found ${ingredientsResult.length} ingredients`);

                    if (ingredientsResult.length === 0) {
                        console.warn(`No ingredients found for menu item ${menuItemId}. Attempting to create a minimal default recipe (sugar 10g) for testing.`);

                        // Try to auto-create a minimal recipe: add sugar 10g (or 0.01kg) if sugar exists
                        try {
                            const [sugarRows] = await connection.query(`
                                SELECT id, name, actual_unit FROM ingredients WHERE LOWER(name) LIKE '%sugar%' LIMIT 1
                            `);
                            if (sugarRows.length > 0) {
                                const sugar = sugarRows[0];
                                let requiredActual = 10.0; // default 10g
                                const unit = (sugar.actual_unit || '').toLowerCase();
                                if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
                                    requiredActual = 0.01; // 10g in kg
                                } else if (unit === 'g' || unit === 'gram' || unit === 'grams') {
                                    requiredActual = 10.0;
                                }

                                await connection.query(`
                                    INSERT INTO menu_item_ingredients (menu_item_id, ingredient_id, required_actual_amount, required_display_amount, is_optional)
                                    VALUES (?, ?, ?, ?, FALSE)
                                `, [menuItemId, sugar.id, requiredActual, requiredActual]);

                                console.log(`Created minimal recipe for menu item ${menuItemId}: sugar (${sugar.actual_unit}) ${requiredActual}`);

                                // Re-run the query to include this new mapping
                                const [retry] = await connection.query(`
                                    SELECT 
                                        mii.ingredient_id,
                                        COALESCE(mii.required_actual_amount, mii.required_display_amount, 1.0) AS base_quantity,
                                        i.actual_unit AS base_unit,
                                        i.name AS ingredient_name,
                                        i.actual_quantity AS current_stock,
                                        i.actual_unit AS stock_unit,
                                        i.reorder_level,
                                        i.category
                                    FROM menu_item_ingredients mii
                                    JOIN ingredients i ON mii.ingredient_id = i.id
                                    WHERE mii.menu_item_id = ?
                                `, [menuItemId]);

                                if (retry.length === 0) {
                                    console.warn(`Still no ingredients after attempting to create a default recipe for menu item ${menuItemId}`);
                                    continue;
                                }

                                // overwrite ingredientsResult so downstream processing uses it
                                ingredientsResult.splice(0, ingredientsResult.length, ...retry);
                            } else {
                                console.warn('No sugar ingredient found to auto-create a recipe. Skipping deduction for this item.');
                                continue;
                            }
                        } catch (autoRecipeError) {
                            console.error('Failed to auto-create minimal recipe:', autoRecipeError);
                            continue;
                        }
                    }

                    // Debug: Show what we found
                    console.log('Ingredients found:', ingredientsResult.map(ing => ({
                        name: ing.ingredient_name,
                        base_quantity: ing.base_quantity,
                        base_unit: ing.base_unit,
                        stock_unit: ing.stock_unit,
                        current_stock: ing.current_stock
                    })));

                    // Additional debug: Show raw data from menu_item_ingredients
                    const [rawData] = await connection.query(`
                        SELECT mii.*, i.name as ingredient_name, i.actual_unit, i.actual_quantity
                        FROM menu_item_ingredients mii
                        JOIN ingredients i ON mii.ingredient_id = i.id
                        WHERE mii.menu_item_id = ?
                    `, [menuItemId]);
                    console.log('Raw menu_item_ingredients data:', rawData);

                    // Test query to see exact values
                    const [testQuery] = await connection.query(`
                        SELECT 
                            mii.menu_item_id,
                            mii.ingredient_id,
                            mii.required_display_amount,
                            mii.quantity,
                            i.name as ingredient_name,
                            i.actual_unit,
                            i.actual_quantity
                        FROM menu_item_ingredients mii
                        JOIN ingredients i ON mii.ingredient_id = i.id
                        WHERE mii.menu_item_id = ?
                    `, [menuItemId]);
                    console.log('Test query result:', testQuery);

                    // Process each ingredient
                    for (const ingredient of ingredientsResult) {
                        console.log(`\n=== Processing ingredient: ${ingredient.ingredient_name} ===`);
                        console.log(`Base quantity from menu: ${ingredient.base_quantity} ${ingredient.base_unit}`);
                        console.log(`Stock unit: ${ingredient.stock_unit}`);
                        console.log(`Current stock: ${ingredient.current_stock} ${ingredient.stock_unit}`);
                        console.log(`Unit comparison: '${ingredient.base_unit}' === '${ingredient.stock_unit}' = ${ingredient.base_unit === ingredient.stock_unit}`);

                        // Calculate total quantity needed (base * order quantity)
                        let totalRequired = ingredient.base_quantity * quantity;
                        console.log(`Total required (${ingredient.base_quantity} × ${quantity}): ${totalRequired} ${ingredient.base_unit}`);

                        // Apply additive "extras" (Base + Extra)
                        // Accepted payload shapes on each order item:
                        // 1) extras: [{ ingredientId, amount, unit }]
                        // 2) extraIngredients: [{ ingredient_id, quantity, unit }]
                        // 3) addons: { extras: [...] }
                        if (item && (item.extras || item.extraIngredients || (item.addons && item.addons.extras))) {
                            const extrasList = item.extras || item.extraIngredients || (item.addons ? item.addons.extras : []);
                            let extraSumInBaseUnit = 0;
                            for (const extra of extrasList) {
                                const extraIngredientId = extra.ingredientId || extra.ingredient_id || extra.id;
                                if (extraIngredientId && Number(extraIngredientId) === Number(ingredient.ingredient_id)) {
                                    const extraAmount = extra.amount != null ? extra.amount : (extra.quantity != null ? extra.quantity : 0);
                                    const extraUnit = extra.unit || ingredient.base_unit; // assume base unit if not provided
                                    try {
                                        const convertedExtra = await this.convertUnits(
                                            Number(extraAmount) || 0,
                                            extraUnit,
                                            ingredient.base_unit
                                        );
                                        extraSumInBaseUnit += convertedExtra;
                                    } catch (e) {
                                        console.warn(`Failed converting extra for ingredient ${ingredient.ingredient_name}:`, e.message);
                                    }
                                }
                            }
                            if (extraSumInBaseUnit > 0) {
                                console.log(`Adding extras for ${ingredient.ingredient_name}: +${extraSumInBaseUnit} ${ingredient.base_unit}`);
                                totalRequired += extraSumInBaseUnit;
                            }
                        }

                        // Apply customization multipliers if any (e.g., size up). Multipliers apply to base only conceptually,
                        // but here we apply to the combined amount to keep behavior simple and predictable for users.
                        if (customizations) {
                            totalRequired = this.applyCustomizationMultipliers(
                                totalRequired,
                                customizations,
                                ingredient.ingredient_name
                            );
                            console.log(`Total required after customizations: ${totalRequired} ${ingredient.base_unit}`);
                        }

                        // Convert units if necessary
                        let convertedRequired = totalRequired;
                        console.log(`\n--- Unit Conversion Check ---`);
                        console.log(`Base unit: '${ingredient.base_unit}' (type: ${typeof ingredient.base_unit})`);
                        console.log(`Stock unit: '${ingredient.stock_unit}' (type: ${typeof ingredient.stock_unit})`);

                        // Normalize units for comparison (remove case sensitivity and whitespace)
                        const normalizedBaseUnit = (ingredient.base_unit || '').toString().toLowerCase().trim();
                        const normalizedStockUnit = (ingredient.stock_unit || '').toString().toLowerCase().trim();
                        const unitsAreDifferent = normalizedBaseUnit !== normalizedStockUnit;

                        console.log(`Normalized base unit: '${normalizedBaseUnit}'`);
                        console.log(`Normalized stock unit: '${normalizedStockUnit}'`);
                        console.log(`Are units different? ${unitsAreDifferent}`);

                        if (unitsAreDifferent) {
                            console.log(`\n--- Unit Conversion Required ---`);
                            console.log(`Converting ${totalRequired} ${ingredient.base_unit} to ${ingredient.stock_unit}`);
                            convertedRequired = await this.convertUnits(
                                totalRequired,
                                ingredient.base_unit,
                                ingredient.stock_unit
                            );
                            console.log(`Converted required: ${convertedRequired} ${ingredient.stock_unit}`);
                        } else {
                            console.log(`No unit conversion needed - units match`);
                        }

                        console.log(`\n--- Stock Check ---`);
                        console.log(`Required: ${convertedRequired} ${ingredient.stock_unit}`);
                        console.log(`Available: ${ingredient.current_stock} ${ingredient.stock_unit}`);
                        console.log(`Difference: ${ingredient.current_stock - convertedRequired} ${ingredient.stock_unit}`);

                        // Check if enough stock is available
                        if (ingredient.current_stock < convertedRequired) {
                            const error = `Insufficient stock for ${ingredient.ingredient_name}. Required: ${convertedRequired}${ingredient.stock_unit}, Available: ${ingredient.current_stock}${ingredient.stock_unit}`;
                            console.error(`❌ ${error}`);
                            errors.push(error);
                            throw new Error(error);
                        }

                        console.log(`✅ Stock check passed. Deducting ${convertedRequired} ${ingredient.stock_unit} from ${ingredient.current_stock} ${ingredient.stock_unit}`);

                        // Calculate new stock level
                        const newStock = ingredient.current_stock - convertedRequired;

                        // Update ingredient stock
                        await connection.query(`
                            UPDATE ingredients 
                            SET actual_quantity = ?, 
                                updated_at = NOW()
                            WHERE id = ?
                        `, [newStock, ingredient.ingredient_id]);

                        // Record inventory transaction
                        await connection.query(`
                            INSERT INTO inventory_transactions 
                            (ingredient_id, transaction_type, actual_amount, display_amount, 
                             previous_actual_quantity, new_actual_quantity, order_id, notes, created_at)
                            VALUES (?, 'usage', ?, ?, ?, ?, ?, ?, NOW())
                        `, [
                            ingredient.ingredient_id,
                            convertedRequired,
                            totalRequired, // display amount (original calculation)
                            ingredient.current_stock,
                            newStock,
                            orderId,
                            `Used for order ${orderId} - ${item.name || 'Unknown Item'} (menuItemId: ${menuItemId}, qty: ${quantity})`
                        ]);

                        // Emit real-time update to staff and admin rooms
                        try {
                            const io = this._ioFromReq(req);
                            console.log('🔔 IngredientDeductionService: IO available:', !!io);
                            if (io) {
                                const emitData = {
                                    type: 'ingredient_deducted',
                                    ingredientId: ingredient.ingredient_id,
                                    name: ingredient.ingredient_name,
                                    previous: ingredient.current_stock,
                                    new: newStock,
                                    delta: -convertedRequired,
                                    unit: ingredient.stock_unit,
                                    orderId,
                                    timestamp: new Date()
                                };

                                console.log('🔔 IngredientDeductionService: Emitting inventory-updated:', emitData);
                                io.to('staff-room').emit('inventory-updated', emitData);
                                io.to('admin-room').emit('inventory-updated', emitData);
                                console.log('🔔 IngredientDeductionService: Successfully emitted to both rooms');
                            } else {
                                console.warn('🔔 IngredientDeductionService: No IO instance available');
                            }
                        } catch (emitError) {
                            console.warn('inventory-updated emit failed:', emitError.message);
                        }

                        // Check if stock is now below reorder level
                        if (newStock <= ingredient.reorder_level) {
                            await this.createLowStockAlert(connection, ingredient, newStock);
                        }

                        transactions.push({
                            ingredientId: ingredient.ingredient_id,
                            ingredientName: ingredient.ingredient_name,
                            amountUsed: convertedRequired,
                            previousStock: ingredient.current_stock,
                            newStock: newStock,
                            unit: ingredient.stock_unit,
                            reorderLevel: ingredient.reorder_level,
                            isLowStock: newStock <= ingredient.reorder_level
                        });
                    }

                } catch (itemError) {
                    console.error(`Error processing item ${menuItemId}:`, itemError);
                    errors.push(itemError.message);
                    throw itemError; // Rollback the entire transaction
                }
            }

            if (errors.length > 0) {
                throw new Error(`Failed to deduct ingredients: ${errors.join('; ')}`);
            }

            await connection.commit();

            // Log successful deduction
            console.log(`Successfully deducted ingredients for order ${orderId}:`, {
                orderId,
                itemsProcessed: orderItems.length,
                ingredientsUpdated: transactions.length,
                totalTransactions: transactions.length
            });

            return {
                success: true,
                orderId,
                transactions,
                message: `Successfully deducted ingredients for ${transactions.length} ingredients`
            };

        } catch (error) {
            await connection.rollback();
            console.error(`Failed to deduct ingredients for order ${orderId}:`, error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Apply customization multipliers to ingredient quantities
     */
    applyCustomizationMultipliers(baseQuantity, customizations, ingredientName) {
        let multiplier = 1;

        if (!customizations) return baseQuantity;

        // Common customization multipliers
        const customizationMultipliers = {
            'extra_shot': { 'coffee_beans': 1.5, 'milk': 1.2 },
            'double_shot': { 'coffee_beans': 2.0, 'milk': 1.5 },
            'extra_syrup': { 'syrup': 1.3 },
            'extra_cream': { 'whipping_cream': 1.4, 'milk': 1.2 },
            'large_size': { 'milk': 1.3, 'syrup': 1.2, 'coffee_beans': 1.2 },
            'extra_ice': { 'ice': 1.5 }
        };

        for (const customization of customizations) {
            const customType = customization.type || customization;
            const customMultiplier = customizationMultipliers[customType];

            if (customMultiplier && customMultiplier[ingredientName.toLowerCase()]) {
                multiplier *= customMultiplier[ingredientName.toLowerCase()];
            }
        }

        return baseQuantity * multiplier;
    }

    /**
     * Convert units between different measurement systems
     */
    async convertUnits(amount, fromUnit, toUnit) {
        if (fromUnit === toUnit) return amount;

        console.log(`\n🔧 CONVERTING: ${amount} from ${fromUnit} to ${toUnit}`);

        // Normalize units to handle variations
        const normalizeUnit = (unit) => {
            const normalized = unit.toLowerCase().trim();
            if (normalized === 'g' || normalized === 'gram' || normalized === 'grams') return 'g';
            if (normalized === 'kg' || normalized === 'kilogram' || normalized === 'kilograms') return 'kg';
            if (normalized === 'ml' || normalized === 'milliliter' || normalized === 'milliliters') return 'ml';
            if (normalized === 'l' || normalized === 'liter' || normalized === 'liters') return 'l';
            return normalized;
        };

        const normalizedFromUnit = normalizeUnit(fromUnit);
        const normalizedToUnit = normalizeUnit(toUnit);

        console.log(`Normalized units: ${normalizedFromUnit} → ${normalizedToUnit}`);

        // Common unit conversions
        const conversions = {
            // Weight conversions
            'g_to_kg': 0.001,
            'kg_to_g': 1000,
            'oz_to_g': 28.35,
            'g_to_oz': 0.035,
            'lb_to_kg': 0.4536,
            'kg_to_lb': 2.2046,

            // Volume conversions
            'ml_to_l': 0.001,
            'l_to_ml': 1000,
            'oz_to_ml': 29.57,
            'ml_to_oz': 0.034,
            'cup_to_ml': 236.59,
            'ml_to_cup': 0.0042,

            // Coffee-specific conversions
            'shot_to_g': 18, // 1 espresso shot = 18g coffee
            'g_to_shot': 1 / 18,
            'cup_to_shot': 2, // 1 cup = 2 shots
            'shot_to_cup': 0.5
        };

        const conversionKey = `${normalizedFromUnit}_to_${normalizedToUnit}`;
        const reverseKey = `${normalizedToUnit}_to_${normalizedFromUnit}`;

        console.log(`Looking for conversion: ${conversionKey} or ${reverseKey}`);

        if (conversions[conversionKey]) {
            const result = amount * conversions[conversionKey];
            console.log(`✅ Converted ${amount} ${fromUnit} to ${result} ${toUnit} using ${conversionKey}`);
            return result;
        } else if (conversions[reverseKey]) {
            const result = amount / conversions[reverseKey];
            console.log(`✅ Converted ${amount} ${fromUnit} to ${result} ${toUnit} using reverse ${reverseKey}`);
            return result;
        }

        // If no conversion found, return original amount
        console.warn(`❌ No unit conversion found from ${fromUnit} to ${toUnit}, returning original amount`);
        return amount;
    }

    /**
     * Create low stock alert
     */
    async createLowStockAlert(connection, ingredient, currentStock) {
        try {
            // Check if alert already exists
            const [existingAlert] = await connection.query(`
                SELECT id FROM low_stock_alerts 
                WHERE ingredient_id = ? AND status = 'active'
            `, [ingredient.ingredient_id]);

            if (existingAlert.length === 0) {
                await connection.query(`
                    INSERT INTO low_stock_alerts 
                    (ingredient_id, ingredient_name, current_stock, reorder_level, 
                     alert_type, status, created_at)
                    VALUES (?, ?, ?, ?, 'low_stock', 'active', NOW())
                `, [
                    ingredient.ingredient_id,
                    ingredient.ingredient_name,
                    currentStock,
                    ingredient.reorder_level
                ]);

                console.log(`Low stock alert created for ${ingredient.ingredient_name}`);

                // Create notification for low stock
                try {
                    await notificationService.notifyLowStock([{
                        name: ingredient.ingredient_name,
                        quantity: currentStock,
                        unit: ingredient.actual_unit,
                        reorderLevel: ingredient.reorder_level
                    }]);
                } catch (notificationError) {
                    console.error('Failed to create low stock notification:', notificationError);
                }
            }
        } catch (error) {
            console.error('Error creating low stock alert:', error);
            // Don't fail the main transaction for alert creation
        }
    }

    /**
     * Get ingredient usage history for an order
     */
    async getOrderIngredientUsage(orderId) {
        try {
            const [transactions] = await db.query(`
                SELECT 
                    it.ingredient_id,
                    i.name as ingredient_name,
                    it.actual_amount,
                    it.display_amount,
                    it.previous_actual_quantity,
                    it.new_actual_quantity,
                    it.notes,
                    it.created_at
                FROM inventory_transactions it
                JOIN ingredients i ON it.ingredient_id = i.id
                WHERE it.order_id = ? AND it.transaction_type = 'usage'
                ORDER BY it.created_at DESC
            `, [orderId]);

            return transactions;
        } catch (error) {
            console.error('Error fetching order ingredient usage:', error);
            throw error;
        }
    }

    /**
     * Validate if order can be fulfilled with current inventory
     */
    async validateOrderFulfillment(orderItems) {
        try {
            const validationResults = [];

            for (const item of orderItems) {
                const { menuItemId, quantity = 1, customizations = null } = item;

                // Get ingredient requirements
                const [ingredientsResult] = await db.query(`
                    SELECT 
                        mii.ingredient_id,
                        mii.required_display_amount as base_quantity,
                        mii.recipe_unit as base_unit,
                        i.name as ingredient_name,
                        i.actual_quantity as current_stock,
                        i.actual_unit as stock_unit
                    FROM menu_item_ingredients mii
                    JOIN ingredients i ON mii.ingredient_id = i.id
                    WHERE mii.menu_item_id = ?
                `, [menuItemId]);

                for (const ingredient of ingredientsResult) {
                    let totalRequired = ingredient.base_quantity * quantity;

                    // Apply customizations
                    if (customizations) {
                        totalRequired = this.applyCustomizationMultipliers(
                            totalRequired,
                            customizations,
                            ingredient.ingredient_name
                        );
                    }

                    // Convert units
                    const convertedRequired = await this.convertUnits(
                        totalRequired,
                        ingredient.base_unit,
                        ingredient.stock_unit
                    );

                    const canFulfill = ingredient.current_stock >= convertedRequired;

                    validationResults.push({
                        ingredientId: ingredient.ingredient_id,
                        ingredientName: ingredient.ingredient_name,
                        required: convertedRequired,
                        available: ingredient.current_stock,
                        unit: ingredient.stock_unit,
                        canFulfill,
                        shortfall: canFulfill ? 0 : convertedRequired - ingredient.current_stock
                    });
                }
            }

            const canFulfillOrder = validationResults.every(result => result.canFulfill);

            return {
                canFulfillOrder,
                validationResults,
                summary: {
                    totalIngredients: validationResults.length,
                    canFulfill: validationResults.filter(r => r.canFulfill).length,
                    cannotFulfill: validationResults.filter(r => !r.canFulfill).length,
                    shortfallItems: validationResults.filter(r => !r.canFulfill)
                }
            };

        } catch (error) {
            console.error('Error validating order fulfillment:', error);
            throw error;
        }
    }

    // Helper to safely get io from req
    _ioFromReq(req) {
        try {
            if (req && req.app && typeof req.app.get === 'function') {
                return req.app.get('io');
            }
        } catch (_) {}
        return null;
    }
}

// Export an instance of the service
module.exports = new IngredientDeductionService();