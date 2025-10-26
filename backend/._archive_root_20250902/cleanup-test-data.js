const db = require('./config/db');

async function cleanupTestData() {
    try {
        console.log('🧹 Cleaning up test data...');
        
        // Clean up test menu items
        const [menuResult] = await db.query('DELETE FROM menu_items WHERE name LIKE "Test%"');
        console.log(`✅ Cleaned up ${menuResult.affectedRows} test menu items`);
        
        // Clean up test ingredients
        const [ingredientResult] = await db.query('DELETE FROM ingredients WHERE name LIKE "Test%"');
        console.log(`✅ Cleaned up ${ingredientResult.affectedRows} test ingredients`);
        
        console.log('🎉 Test data cleanup completed!');
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
    } finally {
        await db.end();
    }
}

cleanupTestData();
