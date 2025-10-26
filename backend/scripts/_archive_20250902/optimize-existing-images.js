const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads', 'menu');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    console.log('Uploads directory does not exist. Creating...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads directory created.');
    process.exit(0);
}

// Process and optimize image
async function processImage(inputPath, outputPath, options = {}) {
    const {
        width = 800,
            height = 600,
            quality = 80,
            format = 'webp'
    } = options;

    try {
        let pipeline = sharp(inputPath)
            .resize(width, height, {
                fit: 'inside',
                withoutEnlargement: true
            });

        if (format === 'webp') {
            pipeline = pipeline.webp({ quality });
        } else if (format === 'jpeg') {
            pipeline = pipeline.jpeg({ quality });
        } else if (format === 'png') {
            pipeline = pipeline.png({ quality });
        }

        await pipeline.toFile(outputPath);
        return true;
    } catch (error) {
        console.error(`Error processing ${inputPath}:`, error.message);
        return false;
    }
}

// Get file size in MB
function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return (stats.size / (1024 * 1024)).toFixed(2);
}

// Main optimization function
async function optimizeExistingImages() {
    try {
        console.log('🔍 Scanning for existing images...');

        const files = fs.readdirSync(uploadsDir);
        const imageFiles = files.filter(file =>
            /\.(jpg|jpeg|png|gif|bmp)$/i.test(file) &&
            !file.includes('-large') &&
            !file.includes('-medium') &&
            !file.includes('-small') &&
            !file.includes('-tiny') &&
            !file.includes('-fallback')
        );

        if (imageFiles.length === 0) {
            console.log('✅ No images found to optimize.');
            return;
        }

        console.log(`📸 Found ${imageFiles.length} images to optimize:`);
        imageFiles.forEach(file => console.log(`   - ${file}`));

        let successCount = 0;
        let errorCount = 0;
        const results = [];

        for (const file of imageFiles) {
            const filePath = path.join(uploadsDir, file);
            const baseName = path.parse(file).name;
            const originalSize = getFileSize(filePath);

            console.log(`\n🔄 Processing: ${file} (${originalSize} MB)`);

            try {
                // Create optimized versions
                const largePath = path.join(uploadsDir, `${baseName}-large.webp`);
                const mediumPath = path.join(uploadsDir, `${baseName}-medium.webp`);
                const smallPath = path.join(uploadsDir, `${baseName}-small.webp`);
                const tinyPath = path.join(uploadsDir, `${baseName}-tiny.webp`);
                const jpegPath = path.join(uploadsDir, `${baseName}-fallback.jpg`);

                console.log(`   Creating large version (1200x900)...`);
                await processImage(filePath, largePath, { width: 1200, height: 900, quality: 85 });

                console.log(`   Creating medium version (600x450)...`);
                await processImage(filePath, mediumPath, { width: 600, height: 450, quality: 80 });

                console.log(`   Creating small version (300x225)...`);
                await processImage(filePath, smallPath, { width: 300, height: 225, quality: 75 });

                console.log(`   Creating tiny version (50x38)...`);
                await processImage(filePath, tinyPath, { width: 50, height: 38, quality: 60 });

                console.log(`   Creating JPEG fallback...`);
                await processImage(filePath, jpegPath, { width: 800, height: 600, quality: 80, format: 'jpeg' });

                // Calculate total size of optimized versions
                const largeSize = getFileSize(largePath);
                const mediumSize = getFileSize(mediumPath);
                const smallSize = getFileSize(smallPath);
                const tinySize = getFileSize(tinyPath);
                const jpegSize = getFileSize(jpegPath);
                const totalOptimizedSize = (parseFloat(largeSize) + parseFloat(mediumSize) + parseFloat(smallSize) + parseFloat(tinySize) + parseFloat(jpegSize)).toFixed(2);

                console.log(`   ✅ Optimization complete!`);
                console.log(`      Original: ${originalSize} MB`);
                console.log(`      Optimized: ${totalOptimizedSize} MB`);
                console.log(`      Savings: ${(parseFloat(originalSize) - parseFloat(totalOptimizedSize)).toFixed(2)} MB`);

                // Archive original file
                const archivePath = path.join(uploadsDir, 'archive', file);
                fs.mkdirSync(path.dirname(archivePath), { recursive: true });
                fs.renameSync(filePath, archivePath);
                console.log(`      Original archived to: archive/${file}`);

                results.push({
                    file,
                    status: 'success',
                    originalSize,
                    optimizedSize: totalOptimizedSize,
                    savings: (parseFloat(originalSize) - parseFloat(totalOptimizedSize)).toFixed(2)
                });
                successCount++;

            } catch (error) {
                console.error(`   ❌ Error processing ${file}:`, error.message);
                results.push({ file, status: 'error', error: error.message });
                errorCount++;
            }
        }

        // Summary
        console.log('\n📊 Optimization Summary:');
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        console.log(`   📁 Total processed: ${imageFiles.length}`);

        if (successCount > 0) {
            const totalOriginalSize = results
                .filter(r => r.status === 'success')
                .reduce((sum, r) => sum + parseFloat(r.originalSize), 0);
            const totalOptimizedSize = results
                .filter(r => r.status === 'success')
                .reduce((sum, r) => sum + parseFloat(r.optimizedSize), 0);
            const totalSavings = totalOriginalSize - totalOptimizedSize;

            console.log(`\n💰 Total size savings: ${totalSavings.toFixed(2)} MB`);
            console.log(`   Original total: ${totalOriginalSize.toFixed(2)} MB`);
            console.log(`   Optimized total: ${totalOptimizedSize.toFixed(2)} MB`);
        }

        // Save results to file
        const resultsPath = path.join(uploadsDir, 'optimization-results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n📄 Results saved to: ${resultsPath}`);

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run the optimization
if (require.main === module) {
    console.log('🚀 Starting image optimization process...\n');
    optimizeExistingImages()
        .then(() => {
            console.log('\n🎉 Image optimization process completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Image optimization failed:', error);
            process.exit(1);
        });
}

module.exports = { optimizeExistingImages, processImage };