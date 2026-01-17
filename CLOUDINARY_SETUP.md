# Cloudinary Integration Setup

This guide explains how to set up and use Cloudinary for image management with WebP optimization.

## 🔑 Environment Variables

Add these to your `.env` file in the backend directory:

```env
CLOUDINARY_CLOUD_NAME=dlxci9ffq
CLOUDINARY_API_KEY=554495784368752
CLOUDINARY_API_SECRET=W7qNXZvKGwwJ-tx3QoHzUpo8ATg
```

## 📦 Installation

1. Install the Cloudinary package:
```bash
cd backend
npm install cloudinary
```

2. The package is already added to `package.json`, so just run:
```bash
npm install
```

## 🚀 Features

- **Automatic WebP Conversion**: All images are automatically converted to WebP format
- **Multiple Size Variants**: Creates 5 different sizes automatically:
  - **Tiny**: 50x50px (for lazy loading placeholders)
  - **Small**: 300x300px (for mobile devices)
  - **Medium**: 600x600px (for tablets)
  - **Large**: 1200x1200px (for desktop)
  - **Original**: Full resolution with optimization
  - **Fallback**: JPEG version for older browsers
- **Automatic Optimization**: Cloudinary automatically optimizes quality and format
- **CDN Delivery**: Images are served from Cloudinary's global CDN
- **Responsive Images**: URLs are generated on-the-fly for different sizes

## 📡 API Endpoints

### Upload Image
**POST** `/api/upload/menu-image`

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `image`
- Max file size: 10MB

**Response:**
```json
{
  "success": true,
  "filename": "menu-1234567890-abc123",
  "publicId": "mauricios-cafe/menu/menu-1234567890-abc123",
  "versions": {
    "tiny": "https://res.cloudinary.com/Root/image/upload/...",
    "small": "https://res.cloudinary.com/Root/image/upload/...",
    "medium": "https://res.cloudinary.com/Root/image/upload/...",
    "large": "https://res.cloudinary.com/Root/image/upload/...",
    "original": "https://res.cloudinary.com/Root/image/upload/...",
    "fallback": "https://res.cloudinary.com/Root/image/upload/..."
  },
  "message": "Image uploaded to Cloudinary and optimized successfully"
}
```

### Delete Image
**DELETE** `/api/upload/menu-image/:publicId`

**Response:**
```json
{
  "success": true,
  "message": "Image deleted from Cloudinary successfully"
}
```

## 💻 Usage in Frontend

The response format matches the existing frontend expectations, so no changes are needed in the frontend code. The `versions` object contains Cloudinary URLs that can be used directly:

```tsx
// Example usage
const imageVersions = response.data.versions;
<img src={imageVersions.medium} alt="Menu item" />
```

## 🎨 Image Transformations

Cloudinary automatically:
- Converts images to WebP format
- Optimizes quality based on size
- Maintains aspect ratio
- Serves images via CDN for fast delivery

## 📁 Folder Structure

Images are organized in Cloudinary as:
- `mauricios-cafe/menu/` - Menu item images
- `mauricios-cafe/receipts/` - Receipt images (if needed)
- `mauricios-cafe/profile/` - Profile pictures (if needed)

## 🔒 Security

- All images are served over HTTPS
- Public IDs are unique and unguessable
- Images can be deleted via API with proper authentication

## 📝 Notes

- The old local file storage system has been replaced with Cloudinary
- Existing local images will continue to work, but new uploads go to Cloudinary
- Cloudinary handles all image optimization automatically
- No need to manage local storage or file cleanup

