// Inventory Model for Coffee Shop with SKU support
// Provides functions to manage inventory with SKU

/**
 * Get all inventory items
 * @param {object} db - MySQL connection
 */
async function getAllInventory(db) {
    const [rows] = await db.query('SELECT * FROM inventory');
    return rows;
}

/**
 * Get a single inventory item by ID
 * @param {object} db - MySQL connection
 * @param {number} id - Inventory item ID
 */
async function getInventoryById(db, id) {
    const [rows] = await db.query('SELECT * FROM inventory WHERE id = ?', [id]);
    return rows[0];
}

/**
 * Add a new inventory item
 * @param {object} db - MySQL connection
 * @param {object} item - { sku, name, quantity, unit, display_unit, low_stock_threshold, date_added }
 */
async function addInventoryItem(db, item) {
    const { sku, name, quantity, unit, display_unit, low_stock_threshold, date_added } = item;
    const [result] = await db.query(
        'INSERT INTO inventory (sku, name, quantity, unit, display_unit, low_stock_threshold, date_added) VALUES (?, ?, ?, ?, ?, ?, ?)', [sku, name, quantity, unit, display_unit, low_stock_threshold, date_added || new Date()]
    );
    return result.insertId;
}

/**
 * Add multiple inventory items (bulk insert)
 * @param {object} db - MySQL connection
 * @param {Array} items - Array of inventory items
 */
async function addBulkInventoryItems(db, items) {
    const values = items.map(item => [
        item.sku,
        item.name,
        item.quantity,
        item.unit,
        item.display_unit,
        item.low_stock_threshold,
        item.date_added || new Date()
    ]);
    const [result] = await db.query(
        'INSERT INTO inventory (sku, name, quantity, unit, display_unit, low_stock_threshold, date_added) VALUES ?', [values]
    );
    return result.affectedRows;
}

/**
 * Update an inventory item
 * @param {object} db - MySQL connection
 * @param {number} id - Inventory item ID
 * @param {object} updates - Fields to update
 */
async function updateInventoryItem(db, id, updates) {
    const fields = [];
    const values = [];
    for (const key in updates) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
    }
    values.push(id);
    const [result] = await db.query(
        `UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
    return result.affectedRows;
}

/**
 * Delete an inventory item
 * @param {object} db - MySQL connection
 * @param {number} id - Inventory item ID
 */
async function deleteInventoryItem(db, id) {
    const [result] = await db.query('DELETE FROM inventory WHERE id = ?', [id]);
    return result.affectedRows;
}

/**
 * Get all low-stock inventory items (based on servings)
 * @param {object} db - MySQL connection
 */
async function getLowStockItems(db) {
    const [rows] = await db.query(`
    SELECT 
      *,
      FLOOR(quantity / usage_per_serving) as total_servings_left,
      DATEDIFF(CURDATE(), date_added) as days_in_inventory
    FROM inventory 
    WHERE FLOOR(quantity / usage_per_serving) <= low_stock_threshold
    ORDER BY total_servings_left ASC
  `);
    return rows;
}

/**
 * Get inventory items that are expiring soon (older than 30 days)
 * @param {object} db - MySQL connection
 */
async function getExpiringItems(db) {
    const [rows] = await db.query(`
    SELECT 
      *,
      FLOOR(quantity / usage_per_serving) as total_servings_left,
      DATEDIFF(CURDATE(), date_added) as days_in_inventory
    FROM inventory 
    WHERE DATEDIFF(CURDATE(), date_added) >= 30
    ORDER BY days_in_inventory DESC
  `);
    return rows;
}

module.exports = {
    getAllInventory,
    getInventoryById,
    addInventoryItem,
    addBulkInventoryItems,
    updateInventoryItem,
    deleteInventoryItem,
    getLowStockItems,
    getExpiringItems
};