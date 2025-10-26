const db = require('../config/db');

async function main() {
    const menuItems = [
        // Coffee Drinks
        {
            name: 'Espresso',
            description: 'Rich, full-bodied espresso shot',
            category: 'Coffee',
            base_price: 45.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Americano',
            description: 'Espresso with hot water',
            category: 'Coffee',
            base_price: 55.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Cappuccino',
            description: 'Espresso with steamed milk and foam',
            category: 'Coffee',
            base_price: 65.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Latte',
            description: 'Espresso with steamed milk',
            category: 'Coffee',
            base_price: 70.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Mocha',
            description: 'Espresso with chocolate and steamed milk',
            category: 'Coffee',
            base_price: 80.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Caramel Macchiato',
            description: 'Espresso with vanilla syrup, steamed milk, and caramel drizzle',
            category: 'Coffee',
            base_price: 85.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Ube Latte',
            description: 'Espresso with ube syrup and steamed milk',
            category: 'Coffee',
            base_price: 90.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },

        // Tea Drinks
        {
            name: 'Matcha Latte',
            description: 'Premium matcha powder with steamed milk',
            category: 'Tea',
            base_price: 75.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Chamomile Tea',
            description: 'Soothing herbal chamomile tea',
            category: 'Tea',
            base_price: 40.00,
            is_available: true,
            allow_customization: false,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: false
        },
        {
            name: 'Early Sunrise',
            description: 'Orange juice with grenadine syrup',
            category: 'Tea',
            base_price: 60.00,
            is_available: true,
            allow_customization: false,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: false
        },

        // Cold Drinks
        {
            name: 'Iced Coffee',
            description: 'Chilled coffee with ice',
            category: 'Beverages',
            base_price: 50.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Frappuccino',
            description: 'Blended coffee drink with ice and whipped cream',
            category: 'Beverages',
            base_price: 95.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Chocolate Frappuccino',
            description: 'Blended chocolate drink with ice and whipped cream',
            category: 'Beverages',
            base_price: 100.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Oreo Frappuccino',
            description: 'Blended drink with Oreo cookies and whipped cream',
            category: 'Beverages',
            base_price: 105.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Ube Colada',
            description: 'Tropical ube drink with pineapple juice and coconut cream',
            category: 'Beverages',
            base_price: 110.00,
            is_available: true,
            allow_customization: false,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: false
        },
        {
            name: 'Cherry Cola',
            description: 'Cola with cherry syrup',
            category: 'Beverages',
            base_price: 45.00,
            is_available: true,
            allow_customization: false,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: false
        },

        // Food Items
        {
            name: 'Hotdog',
            description: 'Classic hotdog with sausage and bun',
            category: 'Sandwiches',
            base_price: 35.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Chili Dog',
            description: 'Hotdog with chili con carne and cheese',
            category: 'Sandwiches',
            base_price: 50.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Nachos',
            description: 'Crispy nacho chips with cheese sauce',
            category: 'Snacks',
            base_price: 60.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'Loaded Nachos',
            description: 'Nachos with chili con carne, cheese sauce, and jalapeños',
            category: 'Snacks',
            base_price: 85.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true
        },
        {
            name: 'French Fries',
            description: 'Crispy golden french fries',
            category: 'Snacks',
            base_price: 40.00,
            is_available: true,
            allow_customization: false,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: false
        }
    ];

    let success = 0;
    let failed = 0;

    for (const item of menuItems) {
        try {
            const [result] = await db.query(`
                INSERT INTO menu_items (
                    name, description, category, base_price, display_price,
                    is_available, allow_customization, visible_in_customer_menu,
                    visible_in_pos, is_customizable, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                item.name,
                item.description,
                item.category,
                item.base_price,
                item.base_price, // display_price same as base_price
                item.is_available,
                item.allow_customization,
                item.visible_in_customer_menu,
                item.visible_in_pos,
                item.is_customizable
            ]);

            success += 1;
            console.log(`Added: ${item.name} (${item.category}) - ₱${item.base_price}`);
        } catch (e) {
            failed += 1;
            console.error(`Failed: ${item.name} -> ${e.message}`);
        }
    }

    console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
            console.error('Menu seed script fatal error:', err);
            process.exit(1);