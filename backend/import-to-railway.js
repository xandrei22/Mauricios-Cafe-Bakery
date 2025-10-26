const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Adjust path to your .env

async function importSqlFile() {
    let connection;
    try {
        console.log('🔄 Attempting to connect to the database for import...');

        // Use MYSQL_URL if available, otherwise fallback to individual params
        let connectionConfig;
        if (process.env.MYSQL_URL) {
            const url = new URL(process.env.MYSQL_URL);
            connectionConfig = {
                host: url.hostname,
                port: url.port || 3306,
                user: url.username,
                password: url.password,
                database: url.pathname.substring(1),
                multipleStatements: true // Important for importing SQL dumps
            };
        } else {
            connectionConfig = {
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'cafe_management',
                multipleStatements: true // Important for importing SQL dumps
            };
        }

        connection = await mysql.createConnection(connectionConfig);
        console.log('✅ Connected to MySQL database:', connectionConfig.database);

        const sqlFilePath = path.join(__dirname, 'railway-database-setup.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        console.log(`🔄 Importing SQL file: ${sqlFilePath}`);
        await connection.query(sql);
        console.log('🎉 SQL file imported successfully!');

    } catch (error) {
        console.error('❌ Database import failed:', error.message);
        console.error('Full error details:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

importSqlFile();