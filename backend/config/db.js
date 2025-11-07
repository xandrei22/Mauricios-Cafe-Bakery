const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse MYSQL_URL if provided, otherwise use individual parameters
// Works with both Render and Railway
// Railway provides: MYSQL_URL OR MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
// Render provides: MYSQL_URL OR DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
let connectionConfig;

// ✅ Railway: Prefer MYSQL_PUBLIC_URL for external connections (Render), MYSQL_URL for internal (Railway)
// ✅ Render: Use MYSQL_URL
const mysqlUrl = process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL;

if (mysqlUrl) {
    // ✅ Parse MYSQL_URL or MYSQL_PUBLIC_URL
    try {
        // Replace "mysql://" with "http://" to make URL parsing work
        const url = new URL(mysqlUrl.replace('mysql://', 'http://'));

        connectionConfig = {
            host: url.hostname,
            port: url.port || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.substring(1), // remove leading '/'
            waitForConnections: true,
            connectionLimit: 20,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 10000,
            connectTimeout: 20000,
        };

        const source = process.env.MYSQL_PUBLIC_URL ? 'MYSQL_PUBLIC_URL (Railway external)' : 'MYSQL_URL';
        console.log(`✅ Using ${source} configuration`);
        console.log('📊 Parsed connection details:', {
            host: connectionConfig.host,
            port: connectionConfig.port,
            database: connectionConfig.database,
            user: connectionConfig.user,
            hasPassword: !!connectionConfig.password,
            isInternal: connectionConfig.host.includes('.railway.internal')
        });
    } catch (error) {
        console.error('❌ Failed to parse MySQL URL:', error.message);
        console.error(
            '💡 MySQL URL value (first 50 chars):',
            mysqlUrl ? mysqlUrl.substring(0, 50) : '(undefined)'
        );
        // Fall through to use individual variables
    }
}

// If MYSQL_URL parsing failed or not provided, try Railway variables first, then Render variables
if (!connectionConfig) {
    // ✅ Railway provides BOTH formats:
    //   - With underscores: MYSQL_DATABASE, MYSQL_PORT, MYSQL_USER, MYSQL_ROOT_PASSWORD
    //   - Without underscores: MYSQLDATABASE, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLHOST
    // Check both formats for maximum compatibility
    const railwayHost = process.env.MYSQLHOST || process.env.MYSQL_HOST;
    const railwayUser = process.env.MYSQLUSER || process.env.MYSQL_USER || process.env.MYSQL_ROOT_USER;
    const railwayPassword = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD;
    const railwayDatabase = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE;
    const railwayPort = process.env.MYSQLPORT || process.env.MYSQL_PORT;

    // ✅ Render uses: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
    const renderHost = process.env.DB_HOST;
    const renderUser = process.env.DB_USER;
    const renderPassword = process.env.DB_PASSWORD;
    const renderDatabase = process.env.DB_NAME;
    const renderPort = process.env.DB_PORT;

    // Prefer Railway variables if present, otherwise use Render variables
    connectionConfig = {
        host: railwayHost || renderHost || 'localhost',
        user: railwayUser || renderUser || 'root',
        password: railwayPassword || renderPassword || '',
        database: railwayDatabase || renderDatabase || 'cafeiq',
        port: railwayPort || renderPort || 3306,
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 20000,
    };

    if (railwayHost || railwayDatabase) {
        console.log('✅ Using Railway MYSQL* environment variables');
        console.log('📊 Railway variables found:', {
            hasHost: !!railwayHost,
            hasUser: !!railwayUser,
            hasPassword: !!railwayPassword,
            hasDatabase: !!railwayDatabase,
            hasPort: !!railwayPort
        });
    } else if (renderHost) {
        console.log('✅ Using Render DB_* environment variables');
    } else {
        console.log('⚠️ Using fallback/default database configuration');
    }
}

// Create a connection pool for better performance
const pool = mysql.createPool(connectionConfig);

// Test the connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Database connection pool established successfully');
        console.log('📊 Connection details:', {
            host: connectionConfig.host,
            port: connectionConfig.port,
            database: connectionConfig.database,
            user: connectionConfig.user
        });
        connection.release();
    })
    .catch(err => {
        console.error('❌ Failed to establish database connection pool:', err.message);
        console.error('🔧 Connection config used:', {
            host: connectionConfig.host,
            port: connectionConfig.port,
            database: connectionConfig.database,
            user: connectionConfig.user,
            hasPassword: !!connectionConfig.password
        });
        console.error('🔍 Environment variables check:');
        console.error('  - MYSQL_URL:', process.env.MYSQL_URL ? 'SET' : 'NOT SET');
        console.error('  - MYSQL_PUBLIC_URL (Railway external):', process.env.MYSQL_PUBLIC_URL ? 'SET' : 'NOT SET');
        console.error('  - MYSQLHOST / MYSQL_HOST (Railway):', (process.env.MYSQLHOST || process.env.MYSQL_HOST) ? 'SET' : 'NOT SET');
        console.error('  - MYSQLUSER / MYSQL_USER (Railway):', (process.env.MYSQLUSER || process.env.MYSQL_USER || process.env.MYSQL_ROOT_USER) ? 'SET' : 'NOT SET');
        console.error('  - MYSQLPASSWORD / MYSQL_PASSWORD (Railway):', (process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQL_ROOT_PASSWORD) ? 'SET' : 'NOT SET');
        console.error('  - MYSQLDATABASE / MYSQL_DATABASE (Railway):', (process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE) ? 'SET' : 'NOT SET');
        console.error('  - MYSQLPORT / MYSQL_PORT (Railway):', (process.env.MYSQLPORT || process.env.MYSQL_PORT) ? 'SET' : 'NOT SET');
        console.error('  - DB_HOST (Render):', process.env.DB_HOST ? 'SET' : 'NOT SET');
        console.error('  - DB_USER (Render):', process.env.DB_USER ? 'SET' : 'NOT SET');
        console.error('  - DB_NAME (Render):', process.env.DB_NAME ? 'SET' : 'NOT SET');
        console.error('💡 Troubleshooting:');
        console.error('  1. Railway (backend on Railway): Use MYSQL_URL (internal connection)');
        console.error('  2. Railway (backend on Render/other): Use MYSQL_PUBLIC_URL (external connection)');
        console.error('  3. Railway (individual vars): MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT');
        console.error('  4. Render: Check MYSQL_URL or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
        console.error('  5. Ensure database service is running and accessible');
        console.error('  6. Check firewall/network settings');
        console.error('  7. If using Railway database from Render backend, ensure MYSQL_PUBLIC_URL is set');
        console.error('💡 Full error:', err);
    });

// Create a wrapper object that provides both pool methods and backward compatibility
const db = {
    // Pool methods
    getConnection: () => pool.getConnection(),
    query: (sql, params) => pool.query(sql, params),
    execute: (sql, params) => pool.execute(sql, params),

    // Additional pool methods
    beginTransaction: () => pool.getConnection().then(conn => conn.beginTransaction()),
    commit: (connection) => connection.commit(),
    rollback: (connection) => connection.rollback(),
    release: (connection) => connection.release(),
    pool
};

// Export the wrapper object
module.exports = db;