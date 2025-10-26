/**
 * Utility functions for deduplicating menu items consistently across all endpoints
 */

/**
 * Deduplicate menu items by name, keeping the most recent version (highest ID)
 * @param {Array} menuItems - Array of menu items from database
 * @param {Object} options - Options for deduplication
 * @param {boolean} options.keepMostRecent - Keep the most recent item (default: true)
 * @param {string} options.sortBy - Field to sort by for determining "most recent" (default: 'id')
 * @param {string} options.sortOrder - Sort order: 'DESC' for newest first, 'ASC' for oldest first (default: 'DESC')
 * @returns {Array} Deduplicated array of menu items
 */
function deduplicateMenuItems(menuItems, options = {}) {
    const {
        keepMostRecent = true,
            sortBy = 'id',
            sortOrder = 'DESC'
    } = options;

    if (!Array.isArray(menuItems) || menuItems.length === 0) {
        return [];
    }

    // Sort items by the specified field and order
    const sortedItems = [...menuItems].sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];

        if (sortOrder === 'DESC') {
            return bValue - aValue;
        } else {
            return aValue - bValue;
        }
    });

    // Deduplicate by name, keeping the first occurrence (which is the most recent if sorted DESC)
    const uniqueItems = [];
    const seenNames = new Set();

    for (const item of sortedItems) {
        if (!seenNames.has(item.name)) {
            seenNames.add(item.name);
            uniqueItems.push(item);
        }
    }

    return uniqueItems;
}

/**
 * Deduplicate menu items with visibility filtering
 * @param {Array} menuItems - Array of menu items from database
 * @param {Object} visibilityOptions - Visibility options
 * @param {boolean} visibilityOptions.visibleInPos - Filter for POS visibility
 * @param {boolean} visibilityOptions.visibleInCustomerMenu - Filter for customer menu visibility
 * @param {boolean} visibilityOptions.isAvailable - Filter for availability
 * @returns {Array} Deduplicated and filtered array of menu items
 */
function deduplicateAndFilterMenuItems(menuItems, visibilityOptions = {}) {
    const {
        visibleInPos = false,
            visibleInCustomerMenu = false,
            isAvailable = false
    } = visibilityOptions;

    // First filter by visibility options
    let filteredItems = menuItems;

    if (isAvailable) {
        filteredItems = filteredItems.filter(item => item.is_available === 1 || item.is_available === true);
    }

    if (visibleInPos) {
        filteredItems = filteredItems.filter(item => {
            // Prioritize new visibility columns over old ones
            const isVisibleInPos = item.visible_in_pos === 1 || item.visible_in_pos === true;
            const isPosVisible = item.pos_visible === 1 || item.pos_visible === true;

            // If new column is explicitly set, use it; otherwise fall back to old column
            if (item.visible_in_pos !== null && item.visible_in_pos !== undefined) {
                return isVisibleInPos;
            } else {
                return isPosVisible;
            }
        });
    }

    if (visibleInCustomerMenu) {
        filteredItems = filteredItems.filter(item => {
            // Prioritize new visibility columns over old ones
            const isVisibleInCustomerMenu = item.visible_in_customer_menu === 1 || item.visible_in_customer_menu === true;
            const isCustomerVisible = item.customer_visible === 1 || item.customer_visible === true;

            // If new column is explicitly set, use it; otherwise fall back to old column
            if (item.visible_in_customer_menu !== null && item.visible_in_customer_menu !== undefined) {
                return isVisibleInCustomerMenu;
            } else {
                return isCustomerVisible;
            }
        });
    }

    // Then deduplicate
    return deduplicateMenuItems(filteredItems);
}

/**
 * Get menu items with consistent deduplication for admin view
 * @param {Array} menuItems - Array of menu items from database
 * @returns {Array} Deduplicated menu items for admin view
 */
function getAdminMenuItems(menuItems) {
    return deduplicateMenuItems(menuItems, {
        keepMostRecent: true,
        sortBy: 'id',
        sortOrder: 'DESC'
    });
}

/**
 * Get menu items with consistent deduplication for POS view
 * @param {Array} menuItems - Array of menu items from database
 * @returns {Array} Deduplicated menu items for POS view
 */
function getPOSMenuItems(menuItems) {
    return deduplicateAndFilterMenuItems(menuItems, {
        visibleInPos: true,
        isAvailable: true
    });
}

/**
 * Get menu items with consistent deduplication for customer view
 * @param {Array} menuItems - Array of menu items from database
 * @returns {Array} Deduplicated menu items for customer view
 */
function getCustomerMenuItems(menuItems) {
    return deduplicateAndFilterMenuItems(menuItems, {
        visibleInCustomerMenu: true,
        isAvailable: true
    });
}

module.exports = {
    deduplicateMenuItems,
    deduplicateAndFilterMenuItems,
    getAdminMenuItems,
    getPOSMenuItems,
    getCustomerMenuItems
};