require('dotenv').config();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function addEmailVerificationColumns() {
    try {
        console.log('🔧 Adding email verification columns to customers table...\n');

        // Read and execute the SQL file
        const sqlFile = path.join(__dirname, 'add-email-verification-columns.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        // Split by semicolons and execute each statement
        const statements = sql.split(';').filter(s => s.trim());

        for (const statement of statements) {
            if (statement.trim()) {
                console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
                await db.query(statement);
            }
        }

        console.log('✅ Email verification columns added successfully!\n');

        // Verify the columns exist
        const [columns] = await db.query('DESCRIBE customers');
        const emailVerifiedField = columns.find(col => col.Field === 'email_verified');
        const verificationTokenField = columns.find(col => col.Field === 'verification_token');
        const verificationExpiresField = columns.find(col => col.Field === 'verification_expires');

        console.log('📊 Verification:');
        console.log('- email_verified:', emailVerifiedField ? '✓ EXISTS' : '✗ MISSING');
        console.log('- verification_token:', verificationTokenField ? '✓ EXISTS' : '✗ MISSING');
        console.log('- verification_expires:', verificationExpiresField ? '✓ EXISTS' : '✗ MISSING');

    } catch (error) {
        console.error('❌ Error:', error.message);

        // If column already exists, that's fine
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('✅ Columns already exist, skipping');
        } else {
            throw error;
        }
    } finally {
        process.exit(0);
    }
}























