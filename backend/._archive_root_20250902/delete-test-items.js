const db = require('./config/db');

async function deleteTestItems() {
  let connection;
  
  try {
    // Get connection from the pool
    connection = await db.getConnection();
    
    console.log('Connected to database successfully');
    
    // Delete menu items created on the specific date
    const [result] = await connection.execute(`
      DELETE FROM menu_items 
      WHERE DATE(created_at) = '2025-08-10'
    `);
    
    console.log(`Deleted ${result.affectedRows} menu items`);
    
    // Also delete any related records in other tables (only if they exist)
    try {
      const [ingredientsResult] = await connection.execute(`
        DELETE mi FROM menu_item_ingredients mi
        INNER JOIN menu_items m ON mi.menu_item_id = m.id
        WHERE DATE(m.created_at) = '2025-08-10'
      `);
      console.log(`Deleted ${ingredientsResult.affectedRows} related ingredient records`);
    } catch (error) {
      console.log('No menu_item_ingredients table found or no related records to delete');
    }
    
    try {
      const [variantsResult] = await connection.execute(`
        DELETE mv FROM menu_item_variants mv
        INNER JOIN menu_items m ON mv.menu_item_id = m.id
        WHERE DATE(m.created_at) = '2025-08-10'
      `);
      console.log(`Deleted ${variantsResult.affectedRows} related variant records`);
    } catch (error) {
      console.log('No menu_item_variants table found or no related records to delete');
    }
    
    console.log('Cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error deleting test items:', error);
  } finally {
    if (connection) {
      connection.release();
      console.log('Database connection released');
    }
  }
}

// Run the cleanup
deleteTestItems();

async function deleteTestItems() {
  let connection;
  
  try {
    // Get connection from the pool
    connection = await db.getConnection();
    
    console.log('Connected to database successfully');
    
    // Delete menu items created on the specific date
    const [result] = await connection.execute(`
      DELETE FROM menu_items 
      WHERE DATE(created_at) = '2025-08-10'
    `);
    
    console.log(`Deleted ${result.affectedRows} menu items`);
    
    // Also delete any related records in other tables (only if they exist)
    try {
      const [ingredientsResult] = await connection.execute(`
        DELETE mi FROM menu_item_ingredients mi
        INNER JOIN menu_items m ON mi.menu_item_id = m.id
        WHERE DATE(m.created_at) = '2025-08-10'
      `);
      console.log(`Deleted ${ingredientsResult.affectedRows} related ingredient records`);
    } catch (error) {
      console.log('No menu_item_ingredients table found or no related records to delete');
    }
    
    try {
      const [variantsResult] = await connection.execute(`
        DELETE mv FROM menu_item_variants mv
        INNER JOIN menu_items m ON mv.menu_item_id = m.id
        WHERE DATE(m.created_at) = '2025-08-10'
      `);
      console.log(`Deleted ${variantsResult.affectedRows} related variant records`);
    } catch (error) {
      console.log('No menu_item_variants table found or no related records to delete');
    }
    
    console.log('Cleanup completed successfully!');
    
  } catch (error) {
    console.error('Error deleting test items:', error);
  } finally {
    if (connection) {
      connection.release();
      console.log('Database connection released');
    }
  }
}

// Run the cleanup
deleteTestItems();
