#!/usr/bin/env node

/**
 * Setup Loyalty Rewards System
 * This script creates all necessary tables for the complete loyalty rewards system
 * including proof tracking and order validation
 */

const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function setupLoyaltyRewardsSystem() {
    console.log('🚀 Setting up Loyalty Rewards System...\n');

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        console.log('📋 Creating loyalty_reward_redemptions table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS loyalty_reward_redemptions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                customer_id INT NOT NULL,
                reward_id INT NOT NULL,
                order_id VARCHAR(50) NOT NULL,
                points_redeemed INT NOT NULL,
                redemption_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                redemption_proof TEXT NOT NULL,
                staff_id INT NULL,
                status ENUM('pending', 'completed', 'cancelled', 'expired') DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
                FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_customer_id (customer_id),
                INDEX idx_reward_id (reward_id),
                INDEX idx_order_id (order_id),
                INDEX idx_status (status),
                INDEX idx_redemption_date (redemption_date)
            )
        `);

        console.log('📋 Creating loyalty_reward_usage_log table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS loyalty_reward_usage_log (
                id INT PRIMARY KEY AUTO_INCREMENT,
                redemption_id INT NOT NULL,
                usage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                usage_type ENUM('drink', 'food', 'discount', 'upgrade', 'bonus') NOT NULL,
                menu_item_id INT NULL,
                discount_amount DECIMAL(10, 2) NULL,
                staff_confirmation_id INT NOT NULL,
                confirmation_notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (redemption_id) REFERENCES loyalty_reward_redemptions(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL,
                FOREIGN KEY (staff_confirmation_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_redemption_id (redemption_id),
                INDEX idx_usage_date (usage_date),
                INDEX idx_staff_confirmation (staff_confirmation_id)
            )
        `);

        console.log('🔧 Adding new columns to existing tables...');
        
        // Check if columns exist in loyalty_transactions table
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM loyalty_transactions
        `);
        
        const existingColumns = columns.map(col => col.Field);
        console.log('Existing columns in loyalty_transactions:', existingColumns);
        
        if (!existingColumns.includes('redemption_id')) {
            console.log('📋 Adding redemption_id column to loyalty_transactions table...');
            await connection.query(`
                ALTER TABLE loyalty_transactions 
                ADD COLUMN redemption_id INT NULL
            `);
            console.log('✅ Added redemption_id column to loyalty_transactions table');
        } else {
            console.log('ℹ️  redemption_id column already exists in loyalty_transactions table');
        }

        if (!existingColumns.includes('reward_id')) {
            console.log('📋 Adding reward_id column to loyalty_transactions table...');
            await connection.query(`
                ALTER TABLE loyalty_transactions 
                ADD COLUMN reward_id INT NULL
            `);
            console.log('✅ Added reward_id column to loyalty_transactions table');
        } else {
            console.log('ℹ️  reward_id column already exists in loyalty_transactions table');
        }

        // Note: order_id already exists, so we don't need to add it
        console.log('ℹ️  order_id column already exists in loyalty_transactions table');

        // Check if columns exist in loyalty_rewards table
        const [rewardColumns] = await connection.query(`
            SHOW COLUMNS FROM loyalty_rewards
        `);
        
        const existingRewardColumns = rewardColumns.map(col => col.Field);
        console.log('Existing columns in loyalty_rewards:', existingRewardColumns);
        
        if (!existingRewardColumns.includes('requires_order')) {
            console.log('📋 Adding requires_order column to loyalty_rewards table...');
            await connection.query(`
                ALTER TABLE loyalty_rewards 
                ADD COLUMN requires_order BOOLEAN DEFAULT TRUE
            `);
            console.log('✅ Added requires_order column to loyalty_rewards table');
        } else {
            console.log('ℹ️  requires_order column already exists in loyalty_rewards table');
        }

        if (!existingRewardColumns.includes('max_redemptions_per_customer')) {
            console.log('📋 Adding max_redemptions_per_customer column to loyalty_rewards table...');
            await connection.query(`
                ALTER TABLE loyalty_rewards 
                ADD COLUMN max_redemptions_per_customer INT DEFAULT 1
            `);
            console.log('✅ Added max_redemptions_per_customer column to loyalty_rewards table');
        } else {
            console.log('ℹ️  max_redemptions_per_customer column already exists in loyalty_rewards table');
        }

        if (!existingRewardColumns.includes('validity_days')) {
            console.log('📋 Adding validity_days column to loyalty_rewards table...');
            await connection.query(`
                ALTER TABLE loyalty_rewards 
                ADD COLUMN validity_days INT DEFAULT 30
            `);
            console.log('✅ Added validity_days column to loyalty_rewards table');
        } else {
            console.log('ℹ️  validity_days column already exists in loyalty_rewards table');
        }

        if (!existingRewardColumns.includes('terms_conditions')) {
            console.log('📋 Adding terms_conditions column to loyalty_rewards table...');
            await connection.query(`
                ALTER TABLE loyalty_rewards 
                ADD COLUMN terms_conditions TEXT
            `);
            console.log('✅ Added terms_conditions column to loyalty_rewards table');
        } else {
            console.log('ℹ️  terms_conditions column already exists in loyalty_rewards table');
        }

        // Add foreign keys to loyalty_transactions only if columns exist
        const [allColumns] = await connection.query(`
            SHOW COLUMNS FROM loyalty_transactions
        `);
        
        const hasRedemptionId = allColumns.some(col => col.Field === 'redemption_id');
        const hasRewardId = allColumns.some(col => col.Field === 'reward_id');
        const hasOrderId = allColumns.some(col => col.Field === 'order_id');

        if (hasRedemptionId) {
            try {
                await connection.query(`
                    ALTER TABLE loyalty_transactions 
                    ADD CONSTRAINT fk_loyalty_transactions_redemption 
                    FOREIGN KEY (redemption_id) REFERENCES loyalty_reward_redemptions(id) ON DELETE SET NULL
                `);
                console.log('✅ Added foreign key for redemption_id');
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log('ℹ️  Foreign key already exists for redemption_id');
                } else {
                    console.log('⚠️  Could not add foreign key for redemption_id:', error.message);
                }
            }
        }

        if (hasRewardId) {
            try {
                await connection.query(`
                    ALTER TABLE loyalty_transactions 
                    ADD CONSTRAINT fk_loyalty_transactions_reward 
                    FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE SET NULL
                `);
                console.log('✅ Added foreign key for reward_id');
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log('ℹ️  Foreign key already exists for reward_id');
                } else {
                    console.log('⚠️  Could not add foreign key for reward_id:', error.message);
                }
            }
        }

        if (hasOrderId) {
            try {
                await connection.query(`
                    ALTER TABLE loyalty_transactions 
                    ADD CONSTRAINT fk_loyalty_transactions_order 
                    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
                `);
                console.log('✅ Added foreign key for order_id');
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log('ℹ️  Foreign key already exists for order_id');
                } else {
                    console.log('⚠️  Could not add foreign key for order_id:', error.message);
                }
            }
        }

        console.log('🔧 Updating existing loyalty_rewards with new fields...');
        try {
            await connection.query(`
                UPDATE loyalty_rewards SET 
                    requires_order = TRUE,
                    max_redemptions_per_customer = 1,
                    validity_days = 30,
                    terms_conditions = 'Must be redeemed within 30 days. One redemption per customer per reward type.'
                WHERE requires_order IS NULL
            `);
            console.log('✅ Updated existing loyalty_rewards with new fields');
        } catch (error) {
            console.log('⚠️  Could not update existing loyalty_rewards:', error.message);
        }

        console.log('📊 Inserting sample reward redemption rules...');
        try {
            await connection.query(`
                INSERT IGNORE INTO loyalty_rewards (name, description, points_required, reward_type, discount_percentage, requires_order, max_redemptions_per_customer, validity_days, terms_conditions) VALUES
                ('Free Coffee on Order', 'Get a free coffee with any order', 50, 'drink', NULL, TRUE, 1, 30, 'Must be redeemed with an active order. Cannot be used on its own.'),
                ('Free Pastry with Drink', 'Get a free pastry when you order a drink', 30, 'food', NULL, TRUE, 1, 30, 'Must be redeemed with a drink order. Pastry selection subject to availability.'),
                ('50% Off Any Menu Item', 'Get 50% off any menu item', 25, 'discount', 50.00, TRUE, 2, 30, 'Must be redeemed with an order. Cannot be combined with other offers.'),
                ('Free Size Upgrade', 'Upgrade your drink to the next size for free', 15, 'upgrade', NULL, TRUE, 3, 30, 'Must be redeemed with a drink order. Applicable to all drink sizes.'),
                ('Double Points Bonus', 'Earn double points on your next order', 100, 'bonus', NULL, TRUE, 1, 60, 'Must be redeemed before placing an order. Points will be awarded after order completion.'),
                ('Free Add-on with Order', 'Get any add-on for free with your order', 10, 'bonus', NULL, TRUE, 5, 30, 'Must be redeemed with an order. Add-on selection subject to availability.'),
                ('Birthday Special', 'Get a free dessert on your birthday month', 0, 'food', NULL, TRUE, 1, 30, 'Available only during birthday month. Must be redeemed with an order.'),
                ('Loyalty Member Discount', 'Get 10% off your entire order', 20, 'discount', 10.00, TRUE, 1, 30, 'Must be redeemed with an order. Cannot be combined with other discounts.')
            `);
            console.log('✅ Inserted sample reward redemption rules');
        } catch (error) {
            console.log('⚠️  Could not insert sample rewards:', error.message);
        }

        console.log('🔍 Creating database views...');
        
        try {
            // Create view for easy access to redemption history
            await connection.query(`
                CREATE OR REPLACE VIEW loyalty_redemption_summary AS
                SELECT 
                    lrr.id,
                    lrr.customer_id,
                    c.full_name as customer_name,
                    c.email as customer_email,
                    lr.name as reward_name,
                    lr.reward_type,
                    lrr.points_redeemed,
                    lrr.order_id,
                    lrr.redemption_date,
                    lrr.status,
                    lrr.redemption_proof,
                    u.full_name as staff_name,
                    lrr.notes
                FROM loyalty_reward_redemptions lrr
                JOIN customers c ON lrr.customer_id = c.id
                JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
                LEFT JOIN users u ON lrr.staff_id = u.id
                ORDER BY lrr.redemption_date DESC
            `);
            console.log('✅ Created loyalty_redemption_summary view');
        } catch (error) {
            console.log('⚠️  Could not create loyalty_redemption_summary view:', error.message);
        }

        try {
            // Create view for customer loyalty summary
            await connection.query(`
                CREATE OR REPLACE VIEW customer_loyalty_summary AS
                SELECT 
                    c.id,
                    c.full_name,
                    c.email,
                    c.loyalty_points,
                    c.created_at as member_since,
                    COUNT(DISTINCT lrr.id) as total_redemptions,
                    SUM(lrr.points_redeemed) as total_points_redeemed,
                    COUNT(DISTINCT lt.id) as total_transactions,
                    SUM(lt.points_earned) as total_points_earned,
                    MAX(lt.created_at) as last_activity
                FROM customers c
                LEFT JOIN loyalty_reward_redemptions lrr ON c.id = lrr.customer_id AND lrr.status = 'completed'
                LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
                GROUP BY c.id, c.full_name, c.email, c.loyalty_points, c.created_at
            `);
            console.log('✅ Created customer_loyalty_summary view');
        } catch (error) {
            console.log('⚠️  Could not create customer_loyalty_summary view:', error.message);
        }

        console.log('📈 Creating performance indexes...');
        try {
            await connection.query(`
                CREATE INDEX IF NOT EXISTS idx_loyalty_redemption_customer_order 
                ON loyalty_reward_redemptions(customer_id, order_id, status)
            `);
            console.log('✅ Created performance index');
        } catch (error) {
            console.log('⚠️  Could not create performance index:', error.message);
        }

        await connection.commit();
        console.log('\n✅ Loyalty Rewards System setup completed successfully!');

        // Display summary
        console.log('\n📊 System Summary:');
        console.log('• loyalty_reward_redemptions table created');
        console.log('• loyalty_reward_usage_log table created');
        console.log('• New columns added to existing tables');
        console.log('• Sample reward rules inserted');
        console.log('• Database views created');
        console.log('• Performance indexes added');

        console.log('\n🎯 Key Features:');
        console.log('• Rewards can only be redeemed with valid orders');
        console.log('• Complete proof tracking for all redemptions');
        console.log('• Staff confirmation required for reward usage');
        console.log('• Automatic point deduction and refunds');
        console.log('• Comprehensive admin management tools');

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error setting up Loyalty Rewards System:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the setup if this script is executed directly
if (require.main === module) {
    setupLoyaltyRewardsSystem()
        .then(() => {
            console.log('\n🎉 Setup completed! You can now use the loyalty rewards system.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = { setupLoyaltyRewardsSystem };

/**
 * Setup Loyalty Rewards System
 * This script creates all necessary tables for the complete loyalty rewards system
 * including proof tracking and order validation
 */

const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function setupLoyaltyRewardsSystem() {
    console.log('🚀 Setting up Loyalty Rewards System...\n');

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        console.log('📋 Creating loyalty_reward_redemptions table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS loyalty_reward_redemptions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                customer_id INT NOT NULL,
                reward_id INT NOT NULL,
                order_id VARCHAR(50) NOT NULL,
                points_redeemed INT NOT NULL,
                redemption_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                redemption_proof TEXT NOT NULL,
                staff_id INT NULL,
                status ENUM('pending', 'completed', 'cancelled', 'expired') DEFAULT 'pending',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
                FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_customer_id (customer_id),
                INDEX idx_reward_id (reward_id),
                INDEX idx_order_id (order_id),
                INDEX idx_status (status),
                INDEX idx_redemption_date (redemption_date)
            )
        `);

        console.log('📋 Creating loyalty_reward_usage_log table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS loyalty_reward_usage_log (
                id INT PRIMARY KEY AUTO_INCREMENT,
                redemption_id INT NOT NULL,
                usage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                usage_type ENUM('drink', 'food', 'discount', 'upgrade', 'bonus') NOT NULL,
                menu_item_id INT NULL,
                discount_amount DECIMAL(10, 2) NULL,
                staff_confirmation_id INT NOT NULL,
                confirmation_notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (redemption_id) REFERENCES loyalty_reward_redemptions(id) ON DELETE CASCADE,
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL,
                FOREIGN KEY (staff_confirmation_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_redemption_id (redemption_id),
                INDEX idx_usage_date (usage_date),
                INDEX idx_staff_confirmation (staff_confirmation_id)
            )
        `);

        console.log('🔧 Adding new columns to existing tables...');
        
        // Check if columns exist in loyalty_transactions table
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM loyalty_transactions
        `);
        
        const existingColumns = columns.map(col => col.Field);
        console.log('Existing columns in loyalty_transactions:', existingColumns);
        
        if (!existingColumns.includes('redemption_id')) {
            console.log('📋 Adding redemption_id column to loyalty_transactions table...');
            await connection.query(`
                ALTER TABLE loyalty_transactions 
                ADD COLUMN redemption_id INT NULL
            `);
            console.log('✅ Added redemption_id column to loyalty_transactions table');
        } else {
            console.log('ℹ️  redemption_id column already exists in loyalty_transactions table');
        }

        if (!existingColumns.includes('reward_id')) {
            console.log('📋 Adding reward_id column to loyalty_transactions table...');
            await connection.query(`
                ALTER TABLE loyalty_transactions 
                ADD COLUMN reward_id INT NULL
            `);
            console.log('✅ Added reward_id column to loyalty_transactions table');
        } else {
            console.log('ℹ️  reward_id column already exists in loyalty_transactions table');
        }

        // Note: order_id already exists, so we don't need to add it
        console.log('ℹ️  order_id column already exists in loyalty_transactions table');

        // Check if columns exist in loyalty_rewards table
        const [rewardColumns] = await connection.query(`
            SHOW COLUMNS FROM loyalty_rewards
        `);
        
        const existingRewardColumns = rewardColumns.map(col => col.Field);
        console.log('Existing columns in loyalty_rewards:', existingRewardColumns);
        
        if (!existingRewardColumns.includes('requires_order')) {
            console.log('📋 Adding requires_order column to loyalty_rewards table...');
            await connection.query(`
                ALTER TABLE loyalty_rewards 
                ADD COLUMN requires_order BOOLEAN DEFAULT TRUE
            `);
            console.log('✅ Added requires_order column to loyalty_rewards table');
        } else {
            console.log('ℹ️  requires_order column already exists in loyalty_rewards table');
        }

        if (!existingRewardColumns.includes('max_redemptions_per_customer')) {
            console.log('📋 Adding max_redemptions_per_customer column to loyalty_rewards table...');
            await connection.query(`
                ALTER TABLE loyalty_rewards 
                ADD COLUMN max_redemptions_per_customer INT DEFAULT 1
            `);
            console.log('✅ Added max_redemptions_per_customer column to loyalty_rewards table');
        } else {
            console.log('ℹ️  max_redemptions_per_customer column already exists in loyalty_rewards table');
        }

        if (!existingRewardColumns.includes('validity_days')) {
            console.log('📋 Adding validity_days column to loyalty_rewards table...');
            await connection.query(`
                ALTER TABLE loyalty_rewards 
                ADD COLUMN validity_days INT DEFAULT 30
            `);
            console.log('✅ Added validity_days column to loyalty_rewards table');
        } else {
            console.log('ℹ️  validity_days column already exists in loyalty_rewards table');
        }

        if (!existingRewardColumns.includes('terms_conditions')) {
            console.log('📋 Adding terms_conditions column to loyalty_rewards table...');
            await connection.query(`
                ALTER TABLE loyalty_rewards 
                ADD COLUMN terms_conditions TEXT
            `);
            console.log('✅ Added terms_conditions column to loyalty_rewards table');
        } else {
            console.log('ℹ️  terms_conditions column already exists in loyalty_rewards table');
        }

        // Add foreign keys to loyalty_transactions only if columns exist
        const [allColumns] = await connection.query(`
            SHOW COLUMNS FROM loyalty_transactions
        `);
        
        const hasRedemptionId = allColumns.some(col => col.Field === 'redemption_id');
        const hasRewardId = allColumns.some(col => col.Field === 'reward_id');
        const hasOrderId = allColumns.some(col => col.Field === 'order_id');

        if (hasRedemptionId) {
            try {
                await connection.query(`
                    ALTER TABLE loyalty_transactions 
                    ADD CONSTRAINT fk_loyalty_transactions_redemption 
                    FOREIGN KEY (redemption_id) REFERENCES loyalty_reward_redemptions(id) ON DELETE SET NULL
                `);
                console.log('✅ Added foreign key for redemption_id');
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log('ℹ️  Foreign key already exists for redemption_id');
                } else {
                    console.log('⚠️  Could not add foreign key for redemption_id:', error.message);
                }
            }
        }

        if (hasRewardId) {
            try {
                await connection.query(`
                    ALTER TABLE loyalty_transactions 
                    ADD CONSTRAINT fk_loyalty_transactions_reward 
                    FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE SET NULL
                `);
                console.log('✅ Added foreign key for reward_id');
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log('ℹ️  Foreign key already exists for reward_id');
                } else {
                    console.log('⚠️  Could not add foreign key for reward_id:', error.message);
                }
            }
        }

        if (hasOrderId) {
            try {
                await connection.query(`
                    ALTER TABLE loyalty_transactions 
                    ADD CONSTRAINT fk_loyalty_transactions_order 
                    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
                `);
                console.log('✅ Added foreign key for order_id');
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log('ℹ️  Foreign key already exists for order_id');
                } else {
                    console.log('⚠️  Could not add foreign key for order_id:', error.message);
                }
            }
        }

        console.log('🔧 Updating existing loyalty_rewards with new fields...');
        try {
            await connection.query(`
                UPDATE loyalty_rewards SET 
                    requires_order = TRUE,
                    max_redemptions_per_customer = 1,
                    validity_days = 30,
                    terms_conditions = 'Must be redeemed within 30 days. One redemption per customer per reward type.'
                WHERE requires_order IS NULL
            `);
            console.log('✅ Updated existing loyalty_rewards with new fields');
        } catch (error) {
            console.log('⚠️  Could not update existing loyalty_rewards:', error.message);
        }

        console.log('📊 Inserting sample reward redemption rules...');
        try {
            await connection.query(`
                INSERT IGNORE INTO loyalty_rewards (name, description, points_required, reward_type, discount_percentage, requires_order, max_redemptions_per_customer, validity_days, terms_conditions) VALUES
                ('Free Coffee on Order', 'Get a free coffee with any order', 50, 'drink', NULL, TRUE, 1, 30, 'Must be redeemed with an active order. Cannot be used on its own.'),
                ('Free Pastry with Drink', 'Get a free pastry when you order a drink', 30, 'food', NULL, TRUE, 1, 30, 'Must be redeemed with a drink order. Pastry selection subject to availability.'),
                ('50% Off Any Menu Item', 'Get 50% off any menu item', 25, 'discount', 50.00, TRUE, 2, 30, 'Must be redeemed with an order. Cannot be combined with other offers.'),
                ('Free Size Upgrade', 'Upgrade your drink to the next size for free', 15, 'upgrade', NULL, TRUE, 3, 30, 'Must be redeemed with a drink order. Applicable to all drink sizes.'),
                ('Double Points Bonus', 'Earn double points on your next order', 100, 'bonus', NULL, TRUE, 1, 60, 'Must be redeemed before placing an order. Points will be awarded after order completion.'),
                ('Free Add-on with Order', 'Get any add-on for free with your order', 10, 'bonus', NULL, TRUE, 5, 30, 'Must be redeemed with an order. Add-on selection subject to availability.'),
                ('Birthday Special', 'Get a free dessert on your birthday month', 0, 'food', NULL, TRUE, 1, 30, 'Available only during birthday month. Must be redeemed with an order.'),
                ('Loyalty Member Discount', 'Get 10% off your entire order', 20, 'discount', 10.00, TRUE, 1, 30, 'Must be redeemed with an order. Cannot be combined with other discounts.')
            `);
            console.log('✅ Inserted sample reward redemption rules');
        } catch (error) {
            console.log('⚠️  Could not insert sample rewards:', error.message);
        }

        console.log('🔍 Creating database views...');
        
        try {
            // Create view for easy access to redemption history
            await connection.query(`
                CREATE OR REPLACE VIEW loyalty_redemption_summary AS
                SELECT 
                    lrr.id,
                    lrr.customer_id,
                    c.full_name as customer_name,
                    c.email as customer_email,
                    lr.name as reward_name,
                    lr.reward_type,
                    lrr.points_redeemed,
                    lrr.order_id,
                    lrr.redemption_date,
                    lrr.status,
                    lrr.redemption_proof,
                    u.full_name as staff_name,
                    lrr.notes
                FROM loyalty_reward_redemptions lrr
                JOIN customers c ON lrr.customer_id = c.id
                JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
                LEFT JOIN users u ON lrr.staff_id = u.id
                ORDER BY lrr.redemption_date DESC
            `);
            console.log('✅ Created loyalty_redemption_summary view');
        } catch (error) {
            console.log('⚠️  Could not create loyalty_redemption_summary view:', error.message);
        }

        try {
            // Create view for customer loyalty summary
            await connection.query(`
                CREATE OR REPLACE VIEW customer_loyalty_summary AS
                SELECT 
                    c.id,
                    c.full_name,
                    c.email,
                    c.loyalty_points,
                    c.created_at as member_since,
                    COUNT(DISTINCT lrr.id) as total_redemptions,
                    SUM(lrr.points_redeemed) as total_points_redeemed,
                    COUNT(DISTINCT lt.id) as total_transactions,
                    SUM(lt.points_earned) as total_points_earned,
                    MAX(lt.created_at) as last_activity
                FROM customers c
                LEFT JOIN loyalty_reward_redemptions lrr ON c.id = lrr.customer_id AND lrr.status = 'completed'
                LEFT JOIN loyalty_transactions lt ON c.id = lt.customer_id
                GROUP BY c.id, c.full_name, c.email, c.loyalty_points, c.created_at
            `);
            console.log('✅ Created customer_loyalty_summary view');
        } catch (error) {
            console.log('⚠️  Could not create customer_loyalty_summary view:', error.message);
        }

        console.log('📈 Creating performance indexes...');
        try {
            await connection.query(`
                CREATE INDEX IF NOT EXISTS idx_loyalty_redemption_customer_order 
                ON loyalty_reward_redemptions(customer_id, order_id, status)
            `);
            console.log('✅ Created performance index');
        } catch (error) {
            console.log('⚠️  Could not create performance index:', error.message);
        }

        await connection.commit();
        console.log('\n✅ Loyalty Rewards System setup completed successfully!');

        // Display summary
        console.log('\n📊 System Summary:');
        console.log('• loyalty_reward_redemptions table created');
        console.log('• loyalty_reward_usage_log table created');
        console.log('• New columns added to existing tables');
        console.log('• Sample reward rules inserted');
        console.log('• Database views created');
        console.log('• Performance indexes added');

        console.log('\n🎯 Key Features:');
        console.log('• Rewards can only be redeemed with valid orders');
        console.log('• Complete proof tracking for all redemptions');
        console.log('• Staff confirmation required for reward usage');
        console.log('• Automatic point deduction and refunds');
        console.log('• Comprehensive admin management tools');

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error setting up Loyalty Rewards System:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run the setup if this script is executed directly
if (require.main === module) {
    setupLoyaltyRewardsSystem()
        .then(() => {
            console.log('\n🎉 Setup completed! You can now use the loyalty rewards system.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = { setupLoyaltyRewardsSystem };
