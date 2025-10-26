const db = require('../config/db');

async function runEmailVerificationMigration() {
    try {
        console.log('🔧 Running email verification migration...');

        // Check if columns already exist
        const [columns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'cafeiq' 
            AND TABLE_NAME = 'customers' 
            AND COLUMN_NAME IN ('email_verified', 'verification_token', 'verification_expires')
        `);

        const existingColumns = columns.map(col => col.COLUMN_NAME);

        if (existingColumns.includes('email_verified')) {
            console.log('✅ Email verification columns already exist!');
            return;
        }

        console.log('📝 Adding email verification columns...');

        // Add email verification columns
        await db.query(`
            ALTER TABLE customers 
            ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN verification_token VARCHAR(255) NULL,
            ADD COLUMN verification_expires DATETIME NULL
        `);

        console.log('📝 Creating verification token index...');

        // Add index for verification token
        await db.query(`
            CREATE INDEX idx_verification_token ON customers(verification_token)
        `);

        console.log('✅ Email verification migration completed successfully!');

        // Verify the migration
        const [newColumns] = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'cafeiq' 
            AND TABLE_NAME = 'customers' 
            AND COLUMN_NAME IN ('email_verified', 'verification_token', 'verification_expires')
        `);

        console.log('📊 Verification columns added:', newColumns.map(col => col.COLUMN_NAME));

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

// Run the migration
