const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const router = express.Router();

// Ensure uploads directory exists
const dir = path.join(__dirname, '..', 'uploads', 'menu');
fs.mkdirSync(dir, { recursive: true });

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit (increased for high-res images)
    },
    fileFilter: (req, file, cb) => {
        // Only allow images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Process and optimize uploaded image
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
        console.error('Image processing error:', error);
        return false;
    }
}

// Upload menu image with optimization
router.post('/menu-image', upload.single('image'), async(req, res) => {
    try {
        console.log('📸 Image upload request received');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);

        if (!req.file) {
            console.log('❌ No image file provided');
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        const originalPath = req.file.path;
        const filename = req.file.filename;
        const baseName = path.parse(filename).name;

        // Create optimized versions
        const optimizedVersions = {};

        // Large version (for full-size display)
        const largePath = path.join(dir, `${baseName}-large.webp`);
        await processImage(originalPath, largePath, { width: 1200, height: 900, quality: 85 });

        // Medium version (for cards and lists)
        const mediumPath = path.join(dir, `${baseName}-medium.webp`);
        await processImage(originalPath, mediumPath, { width: 600, height: 450, quality: 80 });

        // Small version (for thumbnails)
        const smallPath = path.join(dir, `${baseName}-small.webp`);
        await processImage(originalPath, smallPath, { width: 300, height: 225, quality: 75 });

        // Tiny version (for lazy loading placeholders)
        const tinyPath = path.join(dir, `${baseName}-tiny.webp`);
        await processImage(originalPath, tinyPath, { width: 50, height: 38, quality: 60 });

        // Create a JPEG fallback for older browsers
        const jpegPath = path.join(dir, `${baseName}-fallback.jpg`);
        await processImage(originalPath, jpegPath, { width: 800, height: 600, quality: 80, format: 'jpeg' });

        // Clean up original file
        fs.unlinkSync(originalPath);

        // Return URLs for all versions
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
        optimizedVersions.large = `/uploads/menu/${path.basename(largePath)}`;
        optimizedVersions.medium = `/uploads/menu/${path.basename(mediumPath)}`;
        optimizedVersions.small = `/uploads/menu/${path.basename(smallPath)}`;
        optimizedVersions.tiny = `/uploads/menu/${path.basename(tinyPath)}`;
        optimizedVersions.fallback = `/uploads/menu/${path.basename(jpegPath)}`;

        console.log('✅ Image uploaded and optimized successfully');
        console.log('Optimized versions:', optimizedVersions);

        res.json({
            success: true,
            filename: baseName,
            versions: optimizedVersions,
            message: 'Image uploaded and optimized successfully'
        });

    } catch (error) {
        console.error('❌ Error uploading image:', error);
        console.error('Error details:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to upload and optimize image'
        });
    }
});

// Bulk image optimization endpoint
router.post('/optimize-existing', async(req, res) => {
    try {
        const files = fs.readdirSync(dir);
        const imageFiles = files.filter(file =>
            /\.(jpg|jpeg|png|gif|bmp)$/i.test(file)
        );

        const results = [];
        for (const file of imageFiles) {
            const filePath = path.join(dir, file);
            const baseName = path.parse(file).name;

            try {
                // Create optimized versions
                const largePath = path.join(dir, `${baseName}-large.webp`);
                const mediumPath = path.join(dir, `${baseName}-medium.webp`);
                const smallPath = path.join(dir, `${baseName}-small.webp`);
                const tinyPath = path.join(dir, `${baseName}-tiny.webp`);

                await processImage(filePath, largePath, { width: 1200, height: 900, quality: 85 });
                await processImage(filePath, mediumPath, { width: 600, height: 450, quality: 80 });
                await processImage(filePath, smallPath, { width: 300, height: 225, quality: 75 });
                await processImage(filePath, tinyPath, { width: 50, height: 38, quality: 60 });

                results.push({ file, status: 'success' });
            } catch (error) {
                results.push({ file, status: 'error', error: error.message });
            }
        }

        res.json({
            success: true,
            message: 'Bulk optimization completed',
            results
        });

    } catch (error) {
        console.error('Error in bulk optimization:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk optimization'
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 5MB.'
            });
        }
    }

    if (error.message === 'Only image files are allowed') {
        return res.status(400).json({
            success: false,
            error: 'Only image files are allowed'
        });
    }

    console.error('Upload error:', error);
    res.status(500).json({
        success: false,
        error: 'Upload failed'
    });
});

module.exports = router;