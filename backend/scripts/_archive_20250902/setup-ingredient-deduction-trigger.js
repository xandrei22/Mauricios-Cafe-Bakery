const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function setupIngredientDeductionTrigger() {
    console.log('🚀 Setting up ingredient deduction trigger system...');

    try {
        const connection = await db.getConnection();

        try {
            // Read the SQL file
            const sqlFilePath = path.join(__dirname, '../config/ingredient-deduction-trigger.sql');
            const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

            console.log('📖 SQL file content loaded');

            // Split SQL statements (remove DELIMITER sections)
            const statements = sqlContent
                .replace(/DELIMITER \/\/[\s\S]*?DELIMITER ;/g, '') // Remove DELIMITER sections
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            console.log(`📝 Found ${statements.length} SQL statements to execute`);

            // Execute each statement
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement.trim()) {
                    try {
                        console.log(`🔧 Executing statement ${i + 1}/${statements.length}...`);
                        await connection.query(statement);
                        console.log(`✅ Statement ${i + 1} executed successfully`);
                    } catch (error) {
                        if (error.code === 'ER_TRG_ALREADY_EXISTS') {
                            console.log(`⚠️  Trigger already exists, skipping...`);
                        } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                            console.log(`⚠️  Table already exists, skipping...`);
                        } else {
                            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                            // Continue with other statements
                        }
                    }
                }
            }

            // Verify the setup
            console.log('\n🔍 Verifying setup...');

            // Check if trigger exists
            const [triggers] = await connection.query(`
                SHOW TRIGGERS LIKE 'orders'
            `);

            const triggerExists = triggers.some(trigger =>
                trigger.Trigger === 'trigger_ingredient_deduction_after_payment'
            );

            if (triggerExists) {
                console.log('✅ Database trigger created successfully');
            } else {
                console.log('❌ Database trigger not found');
            }

            // Check if queue table exists
            const [tables] = await connection.query(`
                SHOW TABLES LIKE 'ingredient_deduction_queue'
            `);

            if (tables.length > 0) {
                console.log('✅ Ingredient deduction queue table created successfully');
            } else {
                console.log('❌ Ingredient deduction queue table not found');
            }

            // Check if system logs table exists
            const [logTables] = await connection.query(`
                SHOW TABLES LIKE 'system_logs'
            `);

            if (logTables.length > 0) {
                console.log('✅ System logs table created successfully');
            } else {
                console.log('❌ System logs table not found');
            }

            console.log('\n🎉 Ingredient deduction trigger setup completed!');
            console.log('\n📋 Next steps:');
            console.log('1. Start the queue service in your main server file');
            console.log('2. Test with a payment to ensure deduction works');
            console.log('3. Monitor the queue service logs');

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Failed to setup ingredient deduction trigger:', error);
        throw error;
    }
}

// Run the setup if this script is executed directly
if (require.main === module) {
    setupIngredientDeductionTrigger()
        .then(() => {
            console.log('✅ Setup completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Setup failed:', error);
            process.exit(1);
        });
}

module.exports = { setupIngredientDeductionTrigger };