const db = require('../config/db');

async function fixDuplicateMenuItems() {
    try {
        console.log('🔍 Checking for duplicate menu items...');

        // First, let's see what duplicates exist
        const [duplicates] = await db.query(`
            SELECT name, COUNT(*) as count, GROUP_CONCAT(id ORDER BY id DESC) as ids
            FROM menu_items 
            GROUP BY name 
            HAVING COUNT(*) > 1
            ORDER BY count DESC
        `);

        if (duplicates.length === 0) {
            console.log('✅ No duplicate menu items found!');
            return;
        }

        console.log(`❌ Found ${duplicates.length} duplicate menu items:`);
        duplicates.forEach(dup => {
            console.log(`  - "${dup.name}" appears ${dup.count} times (IDs: ${dup.ids})`);
        });

        console.log('\n🔧 Fixing duplicates by keeping the most recent version...');

        for (const duplicate of duplicates) {
            const ids = duplicate.ids.split(',').map(id => parseInt(id));
            const keepId = ids[0]; // First ID is the highest (most recent)
            const deleteIds = ids.slice(1); // Delete the rest

            console.log(`  - Keeping ID ${keepId} for "${duplicate.name}"`);
            console.log(`  - Deleting IDs: ${deleteIds.join(', ')}`);

            // Delete the older duplicates
            for (const deleteId of deleteIds) {
                await db.query('DELETE FROM menu_items WHERE id = ?', [deleteId]);
                console.log(`    ✓ Deleted menu item ID ${deleteId}`);
            }
        }

        console.log('\n✅ Duplicate menu items fixed!');

        // Verify the fix
        const [remainingDuplicates] = await db.query(`
            SELECT name, COUNT(*) as count
            FROM menu_items 
            GROUP BY name 
            HAVING COUNT(*) > 1
        `);

        if (remainingDuplicates.length === 0) {
            console.log('✅ Verification passed - no more duplicates!');
        } else {
            console.log('❌ Still found duplicates:', remainingDuplicates);
        }

    } catch (error) {
        console.error('❌ Error fixing duplicate menu items:', error);
    } finally {
        process.exit(0);
    }
}

// Run the fix
