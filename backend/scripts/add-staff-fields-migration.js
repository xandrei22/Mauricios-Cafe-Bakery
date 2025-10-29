// Migration script to add missing staff fields to users table
const db = require('../config/db');

async function addStaffFields() {
    try {
        console.log('🔧 Adding missing staff fields to users table...');

        // List of columns to add
        const columnsToAdd = [
            { name: 'first_name', type: 'VARCHAR(50)' },
            { name: 'last_name', type: 'VARCHAR(50)' },
            { name: 'age', type: 'INT' },
            { name: 'phone', type: 'VARCHAR(20)' },
            { name: 'address', type: 'TEXT' },
            { name: 'position', type: 'VARCHAR(100)' },
            { name: 'work_schedule', type: 'VARCHAR(100) DEFAULT "flexible"' },
            { name: 'date_hired', type: 'DATE' },
            { name: 'employee_id', type: 'VARCHAR(50)' },
            { name: 'emergency_contact', type: 'VARCHAR(100)' },
            { name: 'emergency_phone', type: 'VARCHAR(20)' },
            { name: 'birthday', type: 'DATE' },
            { name: 'gender', type: 'ENUM("male", "female", "other", "prefer_not_to_say")' },
            { name: 'status', type: 'ENUM("active", "inactive", "suspended") DEFAULT "active"' },
            { name: 'last_login', type: 'TIMESTAMP NULL' },
            { name: 'profile_picture', type: 'VARCHAR(255)' },
            { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
        ];

        // Add each column if it doesn't exist
        for (const column of columnsToAdd) {
            try {
                await db.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
                console.log(`✅ Added column: ${column.name}`);
            } catch (error) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    console.log(`✅ Column ${column.name} already exists`);
                } else {
                    console.error(`❌ Error adding column ${column.name}:`, error.message);
                }
            }
        }

        // Update the password column name if needed (some schemas use password_hash)
        try {
            await db.query('ALTER TABLE users CHANGE COLUMN password_hash password VARCHAR(255) NOT NULL');
            console.log('✅ Updated password column name');
        } catch (error) {
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                console.log('✅ Password column already has correct name');
            } else {
                console.error('❌ Error updating password column:', error.message);
            }
        }

        // Update role enum to include all roles
        try {
            await db.query('ALTER TABLE users MODIFY COLUMN role ENUM("admin", "staff", "manager", "customer") DEFAULT "customer"');
            console.log('✅ Updated role enum');
        } catch (error) {
            console.error('❌ Error updating role enum:', error.message);
        }

        console.log('🎉 Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

// Run the migration

