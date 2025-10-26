const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = 'http://localhost:5001';
const CSV_FILE_PATH = path.join(__dirname, '../cafe-raw-materials.csv');

async function importCafeIngredients() {
    try {
        console.log('🚀 Starting café ingredients import...');

        // Read the CSV file
        if (!fs.existsSync(CSV_FILE_PATH)) {
            console.error('❌ CSV file not found:', CSV_FILE_PATH);
            return;
        }

        const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf8');
        const lines = csvContent.trim().split('\n');

        // Parse CSV data
        const ingredients = [];

        for (let i = 1; i < lines.length; i++) { // Skip header row
            const line = lines[i].trim();
            if (!line) continue;

            // Parse CSV line (handle quoted values)
            const values = [];
            let current = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
                const char = line[j];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim()); // Add the last value

            if (values.length >= 11) {
                ingredients.push({
                    name: values[0].replace(/"/g, ''),
                    category: values[1].replace(/"/g, ''),
                    sku: values[2].replace(/"/g, ''),
                    actual_unit: values[3].replace(/"/g, ''),
                    display_unit: values[4].replace(/"/g, ''),
                    conversion_rate: parseFloat(values[5]) || 0,
                    reorder_level: parseFloat(values[6]) || 0,
                    cost_per_actual_unit: parseFloat(values[7]) || 0,
                    storage_location: values[8].replace(/"/g, ''),
                    initial_quantity: parseFloat(values[9]) || 0,
                    days_of_stock: parseInt(values[10]) || 0
                });
            }
        }

        console.log(`📋 Found ${ingredients.length} ingredients to import`);

        if (ingredients.length === 0) {
            console.error('❌ No valid ingredients found in CSV');
            return;
        }

        // Import ingredients using the bulk API
        const response = await fetch(`${API_URL}/inventory/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ingredients }),
        });

        const data = await response.json();

        if (data.success) {
            const results = data.results || [];
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            console.log('\n✅ Import completed successfully!');
            console.log(`📊 Results: ${successCount} successful, ${failCount} failed`);

            if (failCount > 0) {
                console.log('\n❌ Failed imports:');
                results.filter(r => !r.success).forEach(result => {
                    console.log(`   - ${result.name}: ${result.message}`);
                });
            }

            console.log('\n🎉 Your café raw materials have been imported!');
            console.log('📍 Check your inventory at: /admin/enhanced-inventory');

        } else {
            console.error('❌ Import failed:', data.message);
        }

    } catch (error) {
        console.error('❌ Error during import:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Make sure your backend server is running:');
            console.log('   npm start (in backend directory)');
        }
    }
}

// Run the import
if (require.main === module) {
    importCafeIngredients();
}

module.exports = { importCafeIngredients };