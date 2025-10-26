const db = require('../config/db');

class InventoryService {
    // Create a new ingredient
    async createIngredient(ingredientData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Ensure initial_quantity is properly parsed as a number
            const initialQuantity = parseFloat(ingredientData.initial_quantity) || 0;

            // Insert the new ingredient
            const [result] = await connection.query(
                `INSERT INTO ingredients (
                    name, description, category, sku,
                    actual_unit,
                    actual_quantity, reorder_level, cost_per_actual_unit,
                    storage_location, days_of_stock, is_available
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    ingredientData.name,
                    ingredientData.description || '',
                    ingredientData.category,
                    ingredientData.sku || '',
                    ingredientData.actual_unit,
                    initialQuantity,
                    parseFloat(ingredientData.reorder_level) || 0,
                    parseFloat(ingredientData.cost_per_actual_unit) || 0,
                    ingredientData.storage_location || '',
                    parseInt(ingredientData.days_of_stock) || 30,
                    true
                ]
            );

            // Get the newly created ingredient
            const [ingredients] = await connection.query(
                'SELECT * FROM ingredients WHERE id = ?', [result.insertId]
            );

            if (ingredients.length === 0) {
                throw new Error('Failed to retrieve created ingredient');
            }

            // Record the initial inventory transaction if initial_quantity > 0
            if (ingredientData.initial_quantity > 0) {
                await connection.query(
                    `INSERT INTO inventory_transactions (
                        ingredient_id, transaction_type, actual_amount,
                        display_amount, previous_actual_quantity,
                        new_actual_quantity, notes
                    ) VALUES (?, 'initial', ?, ?, 0, ?, 'Initial stock')`, [
                        result.insertId,
                        ingredientData.initial_quantity,
                        // display_amount now mirrors actual_amount
                        ingredientData.initial_quantity,
                        ingredientData.initial_quantity
                    ]
                );
            }

            await connection.commit();
            return ingredients[0];
        } catch (error) {
            await connection.rollback();
            console.error('Error creating ingredient:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get all ingredients with display quantities
    async getAllIngredients() {
        try {
            const [ingredients] = await db.query(`
                SELECT 
                    id,
                    name,
                    category,
                    sku,
                    actual_unit,
                    actual_quantity,
                    reorder_level,
                    cost_per_actual_unit,
                    storage_location,
                    days_of_stock,
                    is_available,
                    CASE 
                        WHEN actual_quantity <= 0 THEN 'out_of_stock'
                        WHEN actual_quantity <= reorder_level THEN 'below_reorder'
                        WHEN actual_quantity <= reorder_level * 2 THEN 'low_stock'
                        ELSE 'in_stock'
                    END as stock_status
                FROM ingredients 
                ORDER BY category, name
            `);

            return ingredients;
        } catch (error) {
            console.error('Error fetching ingredients:', error);
            throw error;
        }
    }

    // Get ingredient by ID
    async getIngredientById(id) {
        try {
            const [ingredients] = await db.query(`
                SELECT 
                    id,
                    name,
                    category,
                    sku,
                    actual_unit,
                    actual_quantity,
                    reorder_level,
                    cost_per_actual_unit,
                    storage_location,
                    days_of_stock,
                    is_available,
                    CASE 
                        WHEN actual_quantity <= 0 THEN 'out_of_stock'
                        WHEN actual_quantity <= reorder_level THEN 'below_reorder'
                        WHEN actual_quantity <= reorder_level * 2 THEN 'low_stock'
                        ELSE 'in_stock'
                    END as stock_status
                FROM ingredients 
                WHERE id = ?
            `, [id]);

            return ingredients[0] || null;
        } catch (error) {
            console.error('Error fetching ingredient:', error);
            throw error;
        }
    }

    // Get menu items with their ingredient requirements
    async getMenuItems() {
        try {
            const [menuItems] = await db.query(`
                SELECT 
                    mi.id,
                    mi.name,
                    mi.description,
                    mi.category,
                    mi.base_price,
                    mi.display_price,
                    mi.is_available,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'ingredient_id', mii.ingredient_id,
                            'ingredient_name', i.name,
                            'required_actual_amount', mii.required_actual_amount,
                            'required_display_amount', mii.required_display_amount,
                            'actual_unit', i.actual_unit,
                            'is_optional', mii.is_optional
                        )
                    ) as ingredients
                FROM menu_items mi
                LEFT JOIN menu_item_ingredients mii ON mi.id = mii.menu_item_id
                LEFT JOIN ingredients i ON mii.ingredient_id = i.id
                GROUP BY mi.id
                ORDER BY mi.category, mi.name
            `);

            // Parse JSON ingredients
            menuItems.forEach(item => {
                if (item.ingredients && item.ingredients[0] && item.ingredients[0].ingredient_id === null) {
                    item.ingredients = [];
                } else {
                    item.ingredients = item.ingredients || [];
                }
            });

            return menuItems;
        } catch (error) {
            console.error('Error fetching menu items:', error);
            throw error;
        }
    }

    // Check if menu item can be made with current inventory
    async checkMenuItemAvailability(menuItemId, quantity = 1) {
        try {
            const [requirements] = await db.query(`
                SELECT 
                    mii.ingredient_id,
                    i.name as ingredient_name,
                    i.actual_quantity as current_stock,
                    mii.required_actual_amount * ? as required_amount,
                    mii.is_optional,
                    i.actual_unit
                FROM menu_item_ingredients mii
                JOIN ingredients i ON mii.ingredient_id = i.id
                WHERE mii.menu_item_id = ?
            `, [quantity, menuItemId]);

            const availability = {
                canMake: true,
                missingIngredients: [],
                insufficientIngredients: []
            };

            for (const req of requirements) {
                if (req.current_stock < req.required_amount) {
                    if (req.is_optional) {
                        availability.insufficientIngredients.push({
                            ingredient: req.ingredient_name,
                            current: req.current_stock,
                            required: req.required_amount,
                            unit: req.actual_unit
                        });
                    } else {
                        availability.canMake = false;
                        availability.missingIngredients.push({
                            ingredient: req.ingredient_name,
                            current: req.current_stock,
                            required: req.required_amount,
                            unit: req.actual_unit
                        });
                    }
                }
            }

            return availability;
        } catch (error) {
            console.error('Error checking menu item availability:', error);
            throw error;
        }
    }

    // Deduct ingredients for an order
    async deductIngredientsForOrder(orderId, orderItems) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const transactions = [];

            for (const item of orderItems) {
                // Get ingredient requirements for this menu item
                const [requirements] = await connection.query(`
                    SELECT 
                        mii.ingredient_id,
                        mii.quantity * ? as total_required,
                        i.name as ingredient_name,
                        i.actual_quantity as current_stock
                    FROM menu_item_ingredients mii
                    JOIN ingredients i ON mii.ingredient_id = i.id
                    WHERE mii.menu_item_id = ?
                `, [item.quantity, item.menuItemId]);

                for (const req of requirements) {
                    const newQuantity = req.current_stock - req.total_required;

                    if (newQuantity < 0) {
                        throw new Error(`Insufficient stock for ${req.ingredient_name}. Required: ${req.total_required}, Available: ${req.current_stock}`);
                    }

                    // Update ingredient quantity
                    await connection.query(`
                        UPDATE ingredients 
                        SET actual_quantity = ? 
                        WHERE id = ?
                    `, [newQuantity, req.ingredient_id]);

                    // Record transaction
                    await connection.query(`
                        INSERT INTO inventory_transactions 
                        (ingredient_id, transaction_type, actual_amount, display_amount, previous_actual_quantity, new_actual_quantity, order_id, notes)
                        VALUES (?, 'usage', ?, ?, ?, ?, ?, ?)
                    `, [
                        req.ingredient_id,
                        req.total_required,
                        // display amount = actual amount since display units removed
                        req.total_required,
                        req.current_stock,
                        newQuantity,
                        orderId,
                        `Used for order ${orderId} - ${item.name}`
                    ]);

                    transactions.push({
                        ingredientId: req.ingredient_id,
                        ingredientName: req.ingredient_name,
                        amountUsed: req.total_required,
                        previousStock: req.current_stock,
                        newStock: newQuantity
                    });
                }
            }

            await connection.commit();
            return transactions;

        } catch (error) {
            await connection.rollback();
            console.error('Error deducting ingredients:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Add ingredients (purchase/restock)
    async addIngredients(ingredientId, actualAmount, notes = 'Manual addition') {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Get current stock
            const [ingredients] = await connection.query(`
                SELECT actual_quantity FROM ingredients WHERE id = ?
            `, [ingredientId]);

            if (ingredients.length === 0) {
                throw new Error('Ingredient not found');
            }

            const currentStock = ingredients[0].actual_quantity;
            const newStock = currentStock + actualAmount;
            const displayAmount = actualAmount; // mirror actual amount

            // Update ingredient quantity
            await connection.query(`
                UPDATE ingredients 
                SET actual_quantity = ? 
                WHERE id = ?
            `, [newStock, ingredientId]);

            // Record transaction
            await connection.query(`
                INSERT INTO inventory_transactions 
                (ingredient_id, transaction_type, actual_amount, display_amount, previous_actual_quantity, new_actual_quantity, notes)
                VALUES (?, 'purchase', ?, ?, ?, ?, ?)
            `, [ingredientId, actualAmount, displayAmount, currentStock, newStock, notes]);

            await connection.commit();

            return {
                ingredientId,
                amountAdded: actualAmount,
                displayAmountAdded: displayAmount,
                previousStock: currentStock,
                newStock: newStock
            };

        } catch (error) {
            await connection.rollback();
            console.error('Error adding ingredients:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get inventory transactions
    async getInventoryTransactions(ingredientId = null, limit = 50) {
        try {
            let query = `
                SELECT 
                    it.id,
                    it.ingredient_id,
                    i.name as ingredient_name,
                    it.transaction_type,
                    it.actual_amount,
                    it.display_amount,
                    it.previous_actual_quantity,
                    it.new_actual_quantity,
                    it.order_id,
                    it.notes,
                    it.created_at
                FROM inventory_transactions it
                JOIN ingredients i ON it.ingredient_id = i.id
            `;

            const params = [];
            if (ingredientId) {
                query += ' WHERE it.ingredient_id = ?';
                params.push(ingredientId);
            }

            query += ' ORDER BY it.created_at DESC LIMIT ?';
            params.push(limit);

            const [transactions] = await db.query(query, params);
            return transactions;

        } catch (error) {
            console.error('Error fetching inventory transactions:', error);
            throw error;
        }
    }

    // Get low stock alerts
    async getLowStockAlerts() {
        try {
            const [alerts] = await db.query(`
                SELECT 
                    id,
                    name,
                    category,
                    sku,
                    actual_unit,
                    actual_quantity,
                    reorder_level,
                    storage_location,
                    days_of_stock,
                    CASE 
                        WHEN actual_quantity <= 0 THEN 'out_of_stock'
                        WHEN actual_quantity <= reorder_level THEN 'below_reorder'
                        WHEN actual_quantity <= reorder_level * 2 THEN 'low_stock'
                        ELSE 'in_stock'
                    END as alert_level
                FROM ingredients 
                WHERE actual_quantity <= reorder_level * 2
                ORDER BY 
                    CASE 
                        WHEN actual_quantity <= 0 THEN 1
                        WHEN actual_quantity <= reorder_level THEN 2
                        ELSE 3
                    END,
                    name
            `);

            return alerts;
        } catch (error) {
            console.error('Error fetching low stock alerts:', error);
            throw error;
        }
    }

    // Update ingredient
    async updateIngredient(id, updateData) {
            try {
                const allowedFields = [
                    'name', 'category', 'sku', 'actual_unit', 'display_unit',
                    'conversion_rate', 'reorder_level', 'cost_per_actual_unit',
                    'storage_location', 'days_of_stock', 'is_available'
                ];

                const fields = Object.keys(updateData).filter(key => allowedFields.includes(key));
                const values = fields.map(field => updateData[field]);

                if (fields.length === 0) {
                    throw new Error('No valid fields to update');
                }

                const query = `
                UPDATE ingredients 
                SET ${fields.map(field => `${field} = ?`).join(', ')}
                WHERE id = ?
            `;

            const [result] = await db.query(query, [...values, id]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error updating ingredient:', error);
            throw error;
        }
    }

    // Get inventory transactions with pagination and filtering
    async getTransactions({ page = 1, limit = 20, ingredientId, transactionType, startDate, endDate } = {}) {
        try {
            // Calculate offset for pagination
            const offset = (page - 1) * limit;
            
            // Build the base query
            let query = `
                SELECT 
                    it.*,
                    i.name as ingredient_name
                FROM inventory_transactions it
                JOIN ingredients i ON it.ingredient_id = i.id
            `;
            
            // Add WHERE conditions based on filters
            const conditions = [];
            const params = [];
            
            if (ingredientId) {
                conditions.push('it.ingredient_id = ?');
                params.push(ingredientId);
            }
            
            if (transactionType) {
                conditions.push('it.transaction_type = ?');
                params.push(transactionType);
            }
            
            if (startDate) {
                conditions.push('it.created_at >= ?');
                params.push(new Date(startDate));
            }
            
            if (endDate) {
                // Set end of day for end date
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                conditions.push('it.created_at <= ?');
                params.push(endOfDay);
            }
            
            // Add WHERE clause if there are any conditions
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            
            // Add ordering and pagination
            query += ' ORDER BY it.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            // Execute the query
            const [transactions] = await db.query(query, params);
            
            // Get total count for pagination
            let countQuery = 'SELECT COUNT(*) as total FROM inventory_transactions it';
            if (conditions.length > 0) {
                countQuery += ' WHERE ' + conditions.join(' AND ');
            }
            
            const [[{ total }]] = await db.query(countQuery, params.slice(0, -2)); // Remove limit and offset for count
            
            return {
                success: true,
                transactions,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            };
            
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    }
}

module.exports = new InventoryService();