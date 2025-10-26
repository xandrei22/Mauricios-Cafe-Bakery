const db = require('../config/db');

async function main() {
    const menuItems = [
        // COFFEE SERIES
        {
            name: 'Americano',
            description: 'Rich espresso with hot water',
            category: 'Coffee',
            base_price: 99.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Cafe Latte',
            description: 'Espresso with steamed milk and foam',
            category: 'Coffee',
            base_price: 120.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Milk Foam', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Spanish Latte',
            description: 'Espresso with sweetened condensed milk and fresh milk',
            category: 'Coffee',
            base_price: 130.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Condensed Milk', quantity: 30, unit: 'ml', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 150, unit: 'ml', actual_quantity: 150, actual_unit: 'ml' },
                { name: 'Milk Foam', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Caramel Macchiato',
            description: 'Espresso with caramel syrup, steamed milk and foam',
            category: 'Coffee',
            base_price: 160.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Caramel syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Milk Foam', quantity: 40, unit: 'ml', actual_quantity: 40, actual_unit: 'ml' },
                { name: 'Caramel drizzle', quantity: 5, unit: 'ml', actual_quantity: 5, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Mocha',
            description: 'Espresso with chocolate syrup and steamed milk',
            category: 'Coffee',
            base_price: 160.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 160, unit: 'ml', actual_quantity: 160, actual_unit: 'ml' },
                { name: 'Chocolate syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Chocolate Chips / Dark Chocolate', quantity: 1, unit: 'g', actual_quantity: 1, actual_unit: 'g' }
            ]
        },
        {
            name: 'White Mocha',
            description: 'Espresso with white chocolate sauce and steamed milk',
            category: 'Coffee',
            base_price: 160.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 160, unit: 'ml', actual_quantity: 160, actual_unit: 'ml' },
                { name: 'White chocolate syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Dirty Strawberry Vanilla',
            description: 'Espresso with strawberry and vanilla syrups',
            category: 'Coffee',
            base_price: 160.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Strawberry syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Vanilla syrup', quantity: 15, unit: 'ml', actual_quantity: 15, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Strawberry drizzle', quantity: 5, unit: 'ml', actual_quantity: 5, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Toffee Nut Latte',
            description: 'Espresso with toffee nut syrup and steamed milk',
            category: 'Coffee',
            base_price: 150.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Toffee Nut Syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Toffee bits', quantity: 3, unit: 'g', actual_quantity: 3, actual_unit: 'g' }
            ]
        },
        {
            name: 'Butterscotch Latte',
            description: 'Espresso with butterscotch syrup and steamed milk',
            category: 'Coffee',
            base_price: 160.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Butterscotch Syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Ube Latte',
            description: 'Espresso with ube flavor syrup and fresh milk',
            category: 'Coffee',
            base_price: 135.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Ube Mix / Ube Syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Milk Foam', quantity: 30, unit: 'ml', actual_quantity: 30, actual_unit: 'ml' }
            ]
        },

        // MATCHA SERIES
        {
            name: 'Matcha Latte',
            description: 'Premium matcha powder with steamed milk',
            category: 'Tea',
            base_price: 160.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Matcha Powder', quantity: 3, unit: 'g', actual_quantity: 3, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Cloud Matcha',
            description: 'Matcha with cold milk and milk foam',
            category: 'Tea',
            base_price: 165.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Matcha Powder', quantity: 3, unit: 'g', actual_quantity: 3, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Milk Foam', quantity: 40, unit: 'ml', actual_quantity: 40, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Dirty Matcha',
            description: 'Matcha with espresso shot',
            category: 'Tea',
            base_price: 165.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Matcha Powder', quantity: 2, unit: 'g', actual_quantity: 2, actual_unit: 'g' },
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Creamy Matcha',
            description: 'Matcha with fresh milk and whipped cream',
            category: 'Tea',
            base_price: 170.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Matcha Powder', quantity: 3, unit: 'g', actual_quantity: 3, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 150, unit: 'ml', actual_quantity: 150, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' },
                { name: 'Condensed Milk', quantity: 15, unit: 'ml', actual_quantity: 15, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Sea Salt Matcha Latte',
            description: 'Matcha with sea salt crème',
            category: 'Tea',
            base_price: 175.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Matcha Powder', quantity: 3, unit: 'g', actual_quantity: 3, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Sea salt crème', quantity: 40, unit: 'ml', actual_quantity: 40, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Strawberry Matcha',
            description: 'Matcha with strawberry syrup',
            category: 'Tea',
            base_price: 165.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Matcha Powder', quantity: 2, unit: 'g', actual_quantity: 2, actual_unit: 'g' },
                { name: 'Strawberry syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 100, unit: 'g', actual_quantity: 100, actual_unit: 'g' }
            ]
        },
        {
            name: 'Ube Matcha',
            description: 'Matcha with ube syrup',
            category: 'Tea',
            base_price: 165.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Matcha Powder', quantity: 2, unit: 'g', actual_quantity: 2, actual_unit: 'g' },
                { name: 'Ube Mix / Ube Syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' }
            ]
        },

        // BASIC COFFEE
        {
            name: 'Iced Coffee',
            description: 'Brewed coffee with ice and sugar syrup',
            category: 'Beverages',
            base_price: 50.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 200, unit: 'ml', actual_quantity: 200, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 120, unit: 'g', actual_quantity: 120, actual_unit: 'g' },
                { name: 'Sugar (granulated)', quantity: 10, unit: 'ml', actual_quantity: 10, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Caramel Iced Coffee',
            description: 'Iced coffee with caramel syrup and whipped cream',
            category: 'Beverages',
            base_price: 65.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 200, unit: 'ml', actual_quantity: 200, actual_unit: 'ml' },
                { name: 'Caramel syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 120, unit: 'g', actual_quantity: 120, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Chocolate Iced Coffee',
            description: 'Iced coffee with chocolate syrup and whipped cream',
            category: 'Beverages',
            base_price: 65.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 200, unit: 'ml', actual_quantity: 200, actual_unit: 'ml' },
                { name: 'Chocolate syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 120, unit: 'g', actual_quantity: 120, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'White Chocolate Iced Coffee',
            description: 'Iced coffee with white chocolate syrup and whipped cream',
            category: 'Beverages',
            base_price: 65.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 200, unit: 'ml', actual_quantity: 200, actual_unit: 'ml' },
                { name: 'White chocolate syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 120, unit: 'g', actual_quantity: 120, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Ube Iced Coffee',
            description: 'Iced coffee with ube syrup and milk',
            category: 'Beverages',
            base_price: 65.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 200, unit: 'ml', actual_quantity: 200, actual_unit: 'ml' },
                { name: 'Ube Mix / Ube Syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 120, unit: 'g', actual_quantity: 120, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 40, unit: 'ml', actual_quantity: 40, actual_unit: 'ml' }
            ]
        },

        // SIGNATURE DRINKS
        {
            name: 'Irish Creme Latte',
            description: 'Espresso with Irish cream syrup and steamed milk',
            category: 'Beverages',
            base_price: 185.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Irish cream syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 160, unit: 'ml', actual_quantity: 160, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Sea Salt Creme Latte',
            description: 'Espresso with sea salt cream foam',
            category: 'Beverages',
            base_price: 145.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Sea salt cream foam', quantity: 40, unit: 'ml', actual_quantity: 40, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 160, unit: 'ml', actual_quantity: 160, actual_unit: 'ml' }
            ]
        },
        {
            name: 'The Monica',
            description: 'Espresso with brown sugar syrup and fresh milk',
            category: 'Beverages',
            base_price: 145.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Brown sugar syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Cinnamon powder', quantity: 1, unit: 'g', actual_quantity: 1, actual_unit: 'g' }
            ]
        },
        {
            name: 'Batangas Tablea',
            description: 'Traditional Batangas tablea with fresh milk',
            category: 'Beverages',
            base_price: 160.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Tablea (Batangas Tablea)', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Sugar (granulated)', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' }
            ]
        },
        {
            name: 'Ube Colada',
            description: 'Tropical ube drink with coconut cream and pineapple juice',
            category: 'Beverages',
            base_price: 190.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Ube Mix / Ube Syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Coconut Cream', quantity: 40, unit: 'ml', actual_quantity: 40, actual_unit: 'ml' },
                { name: 'Pineapple Juice', quantity: 60, unit: 'ml', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 120, unit: 'ml', actual_quantity: 120, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 100, unit: 'g', actual_quantity: 100, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Dazed Mocha',
            description: 'Espresso with caramel and white chocolate syrups',
            category: 'Beverages',
            base_price: 175.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 2, unit: 'shots', actual_quantity: 60, actual_unit: 'ml' },
                { name: 'Caramel syrup', quantity: 15, unit: 'ml', actual_quantity: 15, actual_unit: 'ml' },
                { name: 'White chocolate syrup', quantity: 20, unit: 'ml', actual_quantity: 20, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 160, unit: 'ml', actual_quantity: 160, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Chai Tea Latte',
            description: 'Chai tea concentrate with steamed milk',
            category: 'Tea',
            base_price: 145.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Chai tea concentrate', quantity: 30, unit: 'ml', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Cinnamon powder', quantity: 1, unit: 'g', actual_quantity: 1, actual_unit: 'g' }
            ]
        },
        {
            name: 'Butterbeer',
            description: 'Cream soda with butterscotch syrup and butter extract',
            category: 'Beverages',
            base_price: 155.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Cream soda', quantity: 150, unit: 'ml', actual_quantity: 150, actual_unit: 'ml' },
                { name: 'Butterscotch Syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Butter extract', quantity: 1, unit: 'ml', actual_quantity: 1, actual_unit: 'ml' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },

        // REFRESHING DRINKS
        {
            name: 'Cherry Cola with Creme',
            description: 'Cola with cherry syrup and half & half cream',
            category: 'Beverages',
            base_price: 175.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Cola', quantity: 150, unit: 'ml', actual_quantity: 150, actual_unit: 'ml' },
                { name: 'Cherry syrup', quantity: 15, unit: 'ml', actual_quantity: 15, actual_unit: 'ml' },
                { name: 'Half & half cream', quantity: 30, unit: 'ml', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 120, unit: 'g', actual_quantity: 120, actual_unit: 'g' }
            ]
        },
        {
            name: 'Lemon Soda',
            description: 'Lemon juice with sugar syrup and mint',
            category: 'Beverages',
            base_price: 155.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Lemon Juice', quantity: 30, unit: 'ml', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Sugar (granulated)', quantity: 10, unit: 'ml', actual_quantity: 10, actual_unit: 'ml' },
                { name: 'Mint leaf', quantity: 1, unit: 'pc', actual_quantity: 1, actual_unit: 'pc' }
            ]
        },
        {
            name: 'Strawberry Soda',
            description: 'Strawberry syrup with ice',
            category: 'Beverages',
            base_price: 155.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Strawberry syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 120, unit: 'g', actual_quantity: 120, actual_unit: 'g' }
            ]
        },
        {
            name: 'Cool Chamomile',
            description: 'Brewed chamomile tea with pineapple juice',
            category: 'Tea',
            base_price: 150.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Chamomile tea', quantity: 180, unit: 'ml', actual_quantity: 180, actual_unit: 'ml' },
                { name: 'Pineapple Juice', quantity: 40, unit: 'ml', actual_quantity: 40, actual_unit: 'ml' },
                { name: 'Simple syrup', quantity: 15, unit: 'ml', actual_quantity: 15, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Early Sunrise',
            description: 'Orange juice with lemon juice and grenadine',
            category: 'Tea',
            base_price: 155.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Orange Juice', quantity: 100, unit: 'ml', actual_quantity: 100, actual_unit: 'ml' },
                { name: 'Lemon Juice', quantity: 30, unit: 'ml', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Grenadine', quantity: 10, unit: 'ml', actual_quantity: 10, actual_unit: 'ml' }
            ]
        },

        // FRAPPE SERIES
        {
            name: 'Caramel Frap',
            description: 'Blended caramel frappuccino with whipped cream',
            category: 'Beverages',
            base_price: 180.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Caramel syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 100, unit: 'ml', actual_quantity: 100, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 150, unit: 'g', actual_quantity: 150, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Caramel drizzle', quantity: 5, unit: 'ml', actual_quantity: 5, actual_unit: 'ml' }
            ]
        },
        {
            name: 'Mocha Frap',
            description: 'Blended chocolate frappuccino with whipped cream',
            category: 'Beverages',
            base_price: 180.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Chocolate syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 100, unit: 'ml', actual_quantity: 100, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 150, unit: 'g', actual_quantity: 150, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Chocolate Chips / Dark Chocolate', quantity: 1, unit: 'g', actual_quantity: 1, actual_unit: 'g' }
            ]
        },
        {
            name: 'White Mocha Frap',
            description: 'Blended white chocolate frappuccino with whipped cream',
            category: 'Beverages',
            base_price: 180.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'White chocolate syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 100, unit: 'ml', actual_quantity: 100, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 150, unit: 'g', actual_quantity: 150, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Black Forest Frap',
            description: 'Blended black forest frappuccino with chocolate shavings',
            category: 'Beverages',
            base_price: 195.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Black forest syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Whole Milk', quantity: 100, unit: 'ml', actual_quantity: 100, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 150, unit: 'g', actual_quantity: 150, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Chocolate shavings', quantity: 3, unit: 'g', actual_quantity: 3, actual_unit: 'g' },
                { name: 'Cherry topping', quantity: 1, unit: 'pc', actual_quantity: 1, actual_unit: 'pc' }
            ]
        },
        {
            name: 'Choco Oreo Frap',
            description: 'Blended chocolate frappuccino with crushed Oreo',
            category: 'Beverages',
            base_price: 190.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Chocolate syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Oreo (crushable for frappes)', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 100, unit: 'ml', actual_quantity: 100, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 150, unit: 'g', actual_quantity: 150, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Oreo crumbs', quantity: 5, unit: 'g', actual_quantity: 5, actual_unit: 'g' }
            ]
        },
        {
            name: 'Strawberry Oreo Frap',
            description: 'Blended strawberry frappuccino with crushed Oreo',
            category: 'Beverages',
            base_price: 190.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Strawberry syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Vanilla syrup', quantity: 15, unit: 'ml', actual_quantity: 15, actual_unit: 'ml' },
                { name: 'Oreo (crushable for frappes)', quantity: 15, unit: 'g', actual_quantity: 15, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 100, unit: 'ml', actual_quantity: 100, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 150, unit: 'g', actual_quantity: 150, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Java Chip',
            description: 'Blended frappuccino with dark chocolate and chocolate chips',
            category: 'Beverages',
            base_price: 195.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Espresso Beans (Roast - ground per shot)', quantity: 1, unit: 'shot', actual_quantity: 30, actual_unit: 'ml' },
                { name: 'Dark chocolate syrup', quantity: 25, unit: 'ml', actual_quantity: 25, actual_unit: 'ml' },
                { name: 'Chocolate Chips / Dark Chocolate', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' },
                { name: 'Whole Milk', quantity: 100, unit: 'ml', actual_quantity: 100, actual_unit: 'ml' },
                { name: 'Ice (bagged)', quantity: 150, unit: 'g', actual_quantity: 150, actual_unit: 'g' },
                { name: 'Whipped Cream', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },

        // SAUSAGE SERIES
        {
            name: 'Classic Hotdog',
            description: 'Classic hotdog with sausage and bun',
            category: 'Sandwiches',
            base_price: 89.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Hotdog Sausages (regular)', quantity: 1, unit: 'pc', actual_quantity: 80, actual_unit: 'g' },
                { name: 'Hotdog Buns', quantity: 1, unit: 'pc', actual_quantity: 1, actual_unit: 'pc' },
                { name: 'Mayonnaise', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' },
                { name: 'Ketchup', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' },
                { name: 'Mustard', quantity: 5, unit: 'g', actual_quantity: 5, actual_unit: 'g' }
            ]
        },
        {
            name: 'Hungarian Sausage',
            description: 'Hungarian sausage with cheese sauce',
            category: 'Sandwiches',
            base_price: 130.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Hungarian sausage', quantity: 1, unit: 'pc', actual_quantity: 100, actual_unit: 'g' },
                { name: 'Hotdog Buns', quantity: 1, unit: 'pc', actual_quantity: 1, actual_unit: 'pc' },
                { name: 'Cheese Sauce', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' },
                { name: 'Ketchup', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' },
                { name: 'Mustard', quantity: 5, unit: 'g', actual_quantity: 5, actual_unit: 'g' }
            ]
        },
        {
            name: 'American Spicy Hotdog',
            description: 'Spicy sausage with chili con carne and cheese',
            category: 'Sandwiches',
            base_price: 120.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Spicy sausage', quantity: 1, unit: 'pc', actual_quantity: 80, actual_unit: 'g' },
                { name: 'Hotdog Buns', quantity: 1, unit: 'pc', actual_quantity: 1, actual_unit: 'pc' },
                { name: 'Chili con Carne', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' },
                { name: 'Cheese Sauce', quantity: 20, unit: 'g', actual_quantity: 20, actual_unit: 'g' }
            ]
        },
        {
            name: 'Chili Dog',
            description: 'Hotdog with chili con carne and cheese sauce',
            category: 'Sandwiches',
            base_price: 110.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Hotdog Sausages (regular)', quantity: 1, unit: 'pc', actual_quantity: 80, actual_unit: 'g' },
                { name: 'Hotdog Buns', quantity: 1, unit: 'pc', actual_quantity: 1, actual_unit: 'pc' },
                { name: 'Chili con Carne', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' },
                { name: 'Cheese Sauce', quantity: 15, unit: 'g', actual_quantity: 15, actual_unit: 'g' },
                { name: 'Fried onions', quantity: 5, unit: 'g', actual_quantity: 5, actual_unit: 'g' }
            ]
        },

        // QUICK BITES
        {
            name: 'Nachos Mauricios (Small)',
            description: 'Nacho chips with ground beef, cheese sauce, and chili con carne',
            category: 'Snacks',
            base_price: 150.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Nacho Chips', quantity: 80, unit: 'g', actual_quantity: 80, actual_unit: 'g' },
                { name: 'Ground Beef', quantity: 40, unit: 'g', actual_quantity: 40, actual_unit: 'g' },
                { name: 'Cheese Sauce', quantity: 40, unit: 'g', actual_quantity: 40, actual_unit: 'g' },
                { name: 'Chili con Carne', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' },
                { name: 'Salsa', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' },
                { name: 'Garlic white sauce', quantity: 15, unit: 'g', actual_quantity: 15, actual_unit: 'g' }
            ]
        },
        {
            name: 'Nachos Mauricios (Barkada)',
            description: 'Large portion nacho chips with ground beef, cheese sauce, and chili con carne',
            category: 'Snacks',
            base_price: 290.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'Nacho Chips', quantity: 160, unit: 'g', actual_quantity: 160, actual_unit: 'g' },
                { name: 'Ground Beef', quantity: 80, unit: 'g', actual_quantity: 80, actual_unit: 'g' },
                { name: 'Cheese Sauce', quantity: 80, unit: 'g', actual_quantity: 80, actual_unit: 'g' },
                { name: 'Chili con Carne', quantity: 60, unit: 'g', actual_quantity: 60, actual_unit: 'g' },
                { name: 'Salsa', quantity: 60, unit: 'g', actual_quantity: 60, actual_unit: 'g' },
                { name: 'Garlic white sauce', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' }
            ]
        },
        {
            name: 'Chili Fries (Small)',
            description: 'French fries with cheese sauce and chili con carne',
            category: 'Snacks',
            base_price: 90.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'French Fries (frozen)', quantity: 120, unit: 'g', actual_quantity: 120, actual_unit: 'g' },
                { name: 'Cheese Sauce', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' },
                { name: 'Chili con Carne', quantity: 30, unit: 'g', actual_quantity: 30, actual_unit: 'g' },
                { name: 'Ketchup', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' },
                { name: 'Mayonnaise', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' },
                { name: 'Garlic powder', quantity: 1, unit: 'g', actual_quantity: 1, actual_unit: 'g' }
            ]
        },
        {
            name: 'Chili Fries (Barkada)',
            description: 'Large portion french fries with cheese sauce and chili con carne',
            category: 'Snacks',
            base_price: 160.00,
            is_available: true,
            allow_customization: true,
            visible_in_customer_menu: true,
            visible_in_pos: true,
            is_customizable: true,
            ingredients: [
                { name: 'French Fries (frozen)', quantity: 200, unit: 'g', actual_quantity: 200, actual_unit: 'g' },
                { name: 'Cheese Sauce', quantity: 60, unit: 'g', actual_quantity: 60, actual_unit: 'g' },
                { name: 'Chili con Carne', quantity: 60, unit: 'g', actual_quantity: 60, actual_unit: 'g' },
                { name: 'Ketchup', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' },
                { name: 'Mayonnaise', quantity: 10, unit: 'g', actual_quantity: 10, actual_unit: 'g' },
                { name: 'Garlic powder', quantity: 1, unit: 'g', actual_quantity: 1, actual_unit: 'g' }
            ]
        }
    ];

    let success = 0;
    let failed = 0;

    for (const item of menuItems) {
        try {
            // Insert menu item
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

            const menuItemId = result.insertId;

            // Insert ingredients for this menu item
            if (item.ingredients && item.ingredients.length > 0) {
                for (const ingredient of item.ingredients) {
                    // Find the ingredient ID by name
                    const [ingredientRows] = await db.query(
                        'SELECT id FROM ingredients WHERE name = ?', [ingredient.name]
                    );

                    if (ingredientRows.length > 0) {
                        const ingredientId = ingredientRows[0].id;

                        // Insert menu item ingredient
                        await db.query(`
                            INSERT INTO menu_item_ingredients (
                                menu_item_id, ingredient_id, required_actual_amount,
                                required_display_amount, is_optional
                            ) VALUES (?, ?, ?, ?, ?)
                        `, [
                            menuItemId,
                            ingredientId,
                            ingredient.actual_quantity,
                            ingredient.actual_quantity, // display amount same as actual
                            false // not optional
                        ]);
                    } else {
                        console.warn(`Ingredient not found: ${ingredient.name} for menu item: ${item.name}`);
                    }
                }
            }

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
    console.error('Comprehensive menu seed script fatal error:', err);
    process.exit(1);
});