// Script to add menu visibility columns to the database
require('dotenv').config();
const db = require('../config/db');

async function addMenuVisibilityColumns() {
    try {
        console.log('🔄 Adding menu visibility columns...');

        // Check if columns already exist
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'menu_items' 
            AND COLUMN_NAME IN ('visible_in_pos', 'visible_in_customer_menu', 'allow_customization')
        `);

        const existingColumns = columns.map(col => col.COLUMN_NAME);
        console.log('📋 Existing columns:', existingColumns);

        // Add visible_in_pos column if it doesn't exist
        if (!existingColumns.includes('visible_in_pos')) {
            await db.query(`
                ALTER TABLE menu_items 
                ADD COLUMN visible_in_pos TINYINT(1) DEFAULT 1 COMMENT 'Whether item is visible in POS system'
            `);
            console.log('✅ Added visible_in_pos column');
        } else {
            console.log('ℹ️ visible_in_pos column already exists');
        }

        // Add visible_in_customer_menu column if it doesn't exist
        if (!existingColumns.includes('visible_in_customer_menu')) {
            await db.query(`
                ALTER TABLE menu_items 
                ADD COLUMN visible_in_customer_menu TINYINT(1) DEFAULT 1 COMMENT 'Whether item is visible in customer menu'
            `);
            console.log('✅ Added visible_in_customer_menu column');
        } else {
            console.log('ℹ️ visible_in_customer_menu column already exists');
        }

        // Add allow_customization column if it doesn't exist
        if (!existingColumns.includes('allow_customization')) {
            await db.query(`
                ALTER TABLE menu_items 
                ADD COLUMN allow_customization TINYINT(1) DEFAULT 1 COMMENT 'Whether item allows customization'
            `);
            console.log('✅ Added allow_customization column');
        } else {
            console.log('ℹ️ allow_customization column already exists');
        }

        // Add other missing columns
        const [allColumns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'menu_items'
        `);

        const allExistingColumns = allColumns.map(col => col.COLUMN_NAME);

        // Add add_ons column if it doesn't exist
        if (!allExistingColumns.includes('add_ons')) {
            await db.query(`
                ALTER TABLE menu_items 
                ADD COLUMN add_ons TINYINT(1) DEFAULT 0 COMMENT 'Whether item has add-ons'
            `);
            console.log('✅ Added add_ons column');
        }

        // Add order_notes column if it doesn't exist
        if (!allExistingColumns.includes('order_notes')) {
            await db.query(`
                ALTER TABLE menu_items 
                ADD COLUMN order_notes TINYINT(1) DEFAULT 0 COMMENT 'Whether item allows order notes'
            `);
            console.log('✅ Added order_notes column');
        }

        // Add notes column if it doesn't exist
        if (!allExistingColumns.includes('notes')) {
            await db.query(`
                ALTER TABLE menu_items 
                ADD COLUMN notes TEXT DEFAULT NULL COMMENT 'Additional notes for the menu item'
            `);
            console.log('✅ Added notes column');
        }

        // Add cost column if it doesn't exist
        if (!allExistingColumns.includes('cost')) {
            await db.query(`
                ALTER TABLE menu_items 
                ADD COLUMN cost DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Cost price of the menu item'
            `);
            console.log('✅ Added cost column');
        }

        // Create indexes for better performance
        try {
            await db.query('CREATE INDEX idx_visible_in_pos ON menu_items(visible_in_pos)');
            console.log('✅ Created index for visible_in_pos');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️ Index for visible_in_pos already exists');
            } else {
                throw error;
            }
        }

        try {
            await db.query('CREATE INDEX idx_visible_in_customer_menu ON menu_items(visible_in_customer_menu)');
            console.log('✅ Created index for visible_in_customer_menu');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️ Index for visible_in_customer_menu already exists');
            } else {
                throw error;
            }
        }

        try {
            await db.query('CREATE INDEX idx_allow_customization ON menu_items(allow_customization)');
            console.log('✅ Created index for allow_customization');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️ Index for allow_customization already exists');
            } else {
                throw error;
            }
        }

        // Update existing items to be visible by default
        const [updateResult] = await db.query(`
            UPDATE menu_items SET 
                visible_in_pos = 1,
                visible_in_customer_menu = 1,
                allow_customization = 1
            WHERE visible_in_pos IS NULL OR visible_in_customer_menu IS NULL
        `);
        console.log(`✅ Updated ${updateResult.affectedRows} existing menu items with default visibility settings`);

        console.log('🎉 Menu visibility columns added successfully!');

    } catch (error) {
        console.error('❌ Error adding menu visibility columns:', error);
        throw error;
    } finally {
        // Close the database connection
        await db.pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration
addMenuVisibilityColumns()
    .then(() => {
        console.log('✅ Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });



























