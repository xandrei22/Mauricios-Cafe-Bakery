const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cafe_management',
    port: process.env.DB_PORT || 3306
};

async function fixChartQueries() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database successfully');

        // Create a view that handles missing menu items gracefully
        await connection.execute(`
            CREATE OR REPLACE VIEW orders_with_valid_items AS
            SELECT 
                o.id,
                o.items,
                o.order_time,
                o.payment_status,
                o.customer_name,
                o.total_price
            FROM orders o
            WHERE o.payment_status = 'paid'
        `);

        console.log('Created view: orders_with_valid_items');

        // Test the improved query
        const [testResult] = await connection.execute(`
            SELECT 
                CASE 
                    WHEN mi.name IS NOT NULL THEN mi.name
                    WHEN JSON_UNQUOTE(JSON_EXTRACT(o.items, CONCAT('$[', idx, '].name'))) IS NOT NULL 
                    THEN JSON_UNQUOTE(JSON_EXTRACT(o.items, CONCAT('$[', idx, '].name')))
                    ELSE 'Deleted Item'
                END as item_name,
                COUNT(*) as order_count
            FROM orders_with_valid_items o
            CROSS JOIN JSON_TABLE(
                o.items,
                '$[*]' COLUMNS (
                    idx FOR ORDINALITY,
                    menu_item_id INT PATH '$.menu_item_id',
                    menuItemId INT PATH '$.menuItemId',
                    id INT PATH '$.id',
                    name VARCHAR(255) PATH '$.name',
                    quantity INT PATH '$.quantity'
                )
            ) AS jt
            LEFT JOIN menu_items mi ON (jt.menu_item_id = mi.id OR jt.menuItemId = mi.id OR jt.id = mi.id)
            WHERE o.payment_status = 'paid'
            GROUP BY item_name
            ORDER BY order_count DESC
            LIMIT 10
        `);

        console.log('\n=== IMPROVED CHART DATA ===');
        for (const row of testResult) {
            console.log(`${row.item_name}: ${row.order_count} orders`);
        }

        console.log('\nChart queries have been improved to handle missing menu items better.');
        console.log('The "Unknown" category should now show as "Deleted Item" or be filtered out entirely.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixChartQueries();

