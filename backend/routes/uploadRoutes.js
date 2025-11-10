const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { uploadImageWithVariants, deleteImage } = require('../services/cloudinaryService');

const router = express.Router();

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit (Cloudinary can handle larger files)
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

// Upload menu image to Cloudinary with WebP optimization
router.post('/menu-image', upload.single('image'), async(req, res) => {
    try {
        console.log('📸 Image upload request received (Cloudinary)');
        console.log('Request body:', req.body);
        console.log('Request file:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        } : 'No file');

        if (!req.file) {
            console.log('❌ No image file provided');
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        // Generate unique public ID
        const baseName = `menu-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const folder = 'mauricios-cafe/menu';

        // Validate buffer exists
        if (!req.file.buffer || req.file.buffer.length === 0) {
            console.log('❌ Empty file buffer');
            return res.status(400).json({
                success: false,
                error: 'File buffer is empty'
            });
        }

        console.log('📤 Uploading to Cloudinary:', {
            bufferSize: req.file.buffer.length,
            mimetype: req.file.mimetype,
            originalname: req.file.originalname
        });

        // Upload to Cloudinary with all variants
        const result = await uploadImageWithVariants(req.file.buffer, {
            folder,
            baseName
        });

        console.log('✅ Image uploaded to Cloudinary successfully');
        console.log('Cloudinary result:', {
            publicId: result.publicId,
            versions: Object.keys(result.versions)
        });

        // Format response to match existing frontend expectations
        const formattedVersions = {
            tiny: result.versions.tiny.url,
            small: result.versions.small.url,
            medium: result.versions.medium.url,
            large: result.versions.large.url,
            original: result.versions.original.url,
            fallback: result.versions.fallback.url
        };

        res.json({
            success: true,
            filename: baseName,
            publicId: result.publicId,
            versions: formattedVersions,
            message: 'Image uploaded to Cloudinary and optimized successfully'
        });

    } catch (error) {
        console.error('❌ Error uploading image to Cloudinary:', error);
        console.error('Error details:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to upload image to Cloudinary',
            details: error.message
        });
    }
});

// Delete image from Cloudinary
router.delete('/menu-image/:publicId', async(req, res) => {
    try {
        const { publicId } = req.params;

        if (!publicId) {
            return res.status(400).json({
                success: false,
                error: 'Public ID is required'
            });
        }

        const result = await deleteImage(publicId);

        if (result.success) {
            res.json({
                success: true,
                message: 'Image deleted from Cloudinary successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Image not found in Cloudinary'
            });
        }
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete image from Cloudinary',
            details: error.message
        });
    }
});

// Test Cloudinary connection
router.get('/test-cloudinary', async(req, res) => {
    try {
        const { cloudinary } = require('../services/cloudinaryService');
        const result = await cloudinary.api.ping();
        res.json({
            success: true,
            message: 'Cloudinary connection successful',
            cloudinary: result
        });
    } catch (error) {
        console.error('Cloudinary test error:', error);
        res.status(500).json({
            success: false,
            error: 'Cloudinary connection failed',
            details: error.message,
            hint: 'Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables'
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
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
    console.error('Upload error stack:', error.stack);
    res.status(500).json({
        success: false,
        error: 'Upload failed',
        details: error.message || 'Unknown error'
    });
});

module.exports = router;