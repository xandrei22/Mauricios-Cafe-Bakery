const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'Root';
const apiKey = process.env.CLOUDINARY_API_KEY || '554495784368752';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'W7qNXZvKGwwJ-tx3QoHzUpo8ATg';

console.log('🔧 Cloudinary Config:', {
    cloud_name: cloudName,
    api_key: apiKey ? `${apiKey.substring(0, 5)}...` : 'NOT SET',
    api_secret: apiSecret ? '***SET***' : 'NOT SET'
});

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true // Use HTTPS
});

/**
 * Upload image to Cloudinary with WebP optimization
 * @param {Buffer|string} image - Image buffer or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadImage(image, options = {}) {
    const {
        folder = 'mauricios-cafe',
            publicId = null,
            transformation = [],
            format = 'webp',
            quality = 'auto:good'
    } = options;

    try {
        const uploadOptions = {
            folder,
            format,
            quality,
            fetch_format: 'auto', // Auto-optimize format
            flags: 'progressive', // Progressive JPEG
            ...(publicId && { public_id: publicId })
        };

        // Add transformations if provided
        if (transformation.length > 0) {
            uploadOptions.transformation = transformation;
        }

        let result;
        if (Buffer.isBuffer(image)) {
            // Upload from buffer
            result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload_stream error:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                // Handle stream errors
                uploadStream.on('error', (error) => {
                    console.error('Cloudinary stream error:', error);
                    reject(error);
                });

                const stream = Readable.from(image);

                // Handle source stream errors
                stream.on('error', (error) => {
                    console.error('Source stream error:', error);
                    reject(error);
                });

                stream.pipe(uploadStream);
            });
        } else {
            // Upload from file path
            result = await cloudinary.uploader.upload(image, uploadOptions);
        }

        return {
            success: true,
            publicId: result.public_id,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            version: result.version
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

/**
 * Upload image with multiple size variants (responsive images)
 * @param {Buffer|string} image - Image buffer or file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Object with all size variants
 */
async function uploadImageWithVariants(image, options = {}) {
    const {
        folder = 'mauricios-cafe',
            publicId = null,
            baseName = `img-${Date.now()}`
    } = options;

    try {
        // Define size variants
        const variants = {
            tiny: { width: 50, height: 50, quality: 'auto:low' },
            small: { width: 300, height: 300, quality: 'auto:good' },
            medium: { width: 600, height: 600, quality: 'auto:good' },
            large: { width: 1200, height: 1200, quality: 'auto:best' },
            original: { quality: 'auto:best' }
        };

        const results = {};

        // Upload original first to get base public_id
        const finalPublicId = publicId || baseName;
        const originalResult = await uploadImage(image, {
            folder,
            publicId: finalPublicId,
            format: 'webp',
            quality: 'auto:best'
        });

        // Cloudinary returns public_id with folder included
        const fullPublicId = originalResult.publicId;

        results.original = {
            url: originalResult.url,
            width: originalResult.width,
            height: originalResult.height
        };

        // Generate responsive URLs for each variant
        // Cloudinary can generate these on-the-fly, but we'll create them explicitly
        for (const [size, config] of Object.entries(variants)) {
            if (size === 'original') continue;

            const transformation = [];
            if (config.width) {
                transformation.push({ width: config.width, height: config.height, crop: 'limit' });
            }
            transformation.push({ quality: config.quality, format: 'webp' });

            // Use the full public_id (already includes folder from Cloudinary)
            const variantUrl = cloudinary.url(fullPublicId, {
                transformation,
                secure: true
            });

            results[size] = {
                url: variantUrl,
                width: config.width || originalResult.width,
                height: config.height || originalResult.height
            };
        }

        // Also create a fallback JPEG version
        const jpegUrl = cloudinary.url(fullPublicId, {
            transformation: [
                { width: 800, height: 600, crop: 'limit' },
                { quality: 'auto:good', format: 'jpg' }
            ],
            secure: true
        });

        results.fallback = {
            url: jpegUrl,
            width: 800,
            height: 600,
            format: 'jpg'
        };

        return {
            success: true,
            publicId: originalResult.publicId,
            versions: results,
            message: 'Image uploaded with all variants successfully'
        };
    } catch (error) {
        console.error('Error uploading image variants:', error);
        throw error;
    }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteImage(publicId) {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return {
            success: result.result === 'ok',
            result: result.result
        };
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw error;
    }
}

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
function getImageUrl(publicId, options = {}) {
    const {
        width,
        height,
        quality = 'auto:good',
        format = 'webp',
        crop = 'limit'
    } = options;

    const transformation = [];

    if (width || height) {
        transformation.push({
            width,
            height,
            crop
        });
    }

    transformation.push({
        quality,
        format
    });

    return cloudinary.url(publicId, {
        transformation,
        secure: true
    });
}

module.exports = {
    uploadImage,
    uploadImageWithVariants,
    deleteImage,
    getImageUrl,
    cloudinary
};