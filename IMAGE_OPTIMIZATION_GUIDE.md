# Image Optimization Guide

This guide explains how to optimize images for faster website loading using WebP format, lazy loading, and responsive sizing.

## 🚀 Features

- **WebP Conversion**: Automatically converts images to WebP format for smaller file sizes
- **Multiple Sizes**: Creates 4 different image sizes for different use cases
- **Lazy Loading**: Images only load when they come into view
- **Responsive Images**: Serves appropriate image size based on device and viewport
- **Fallback Support**: JPEG fallback for older browsers
- **Automatic Optimization**: Processes images on upload

## 📁 Image Sizes Generated

| Size | Dimensions | Quality | Use Case |
|------|------------|---------|----------|
| **Tiny** | 50x38px | 60% | Lazy loading placeholders |
| **Small** | 300x225px | 75% | Mobile devices, thumbnails |
| **Medium** | 600x450px | 80% | Tablets, cards, lists |
| **Large** | 1200x900px | 85% | Desktop, full-size display |
| **Fallback** | 800x600px | 80% | JPEG for older browsers |

## 🛠️ Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install sharp
```

### 2. Upload Endpoint

The `/api/upload/menu-image` endpoint now automatically:
- Converts images to WebP format
- Creates multiple sizes
- Optimizes quality settings
- Returns URLs for all versions

### 3. Response Format

```json
{
  "success": true,
  "filename": "coffee-123",
  "versions": {
    "tiny": "http://localhost:5001/uploads/menu/coffee-123-tiny.webp",
    "small": "http://localhost:5001/uploads/menu/coffee-123-small.webp",
    "medium": "http://localhost:5001/uploads/menu/coffee-123-medium.webp",
    "large": "http://localhost:5001/uploads/menu/coffee-123-large.webp",
    "fallback": "http://localhost:5001/uploads/menu/coffee-123-fallback.jpg"
  }
}
```

## 🎨 Frontend Usage

### 1. OptimizedImage Component

```tsx
import OptimizedImage from './components/ui/OptimizedImage';

<OptimizedImage
  src={imageData.versions} // Pass the versions object
  alt="Coffee Description"
  className="w-full h-48 object-cover"
  lazy={true}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 2. Custom Hook

```tsx
import { useImageOptimization } from './hooks/useImageOptimization';

const { currentSrc, imageVersions, isLoading, error } = useImageOptimization({
  src: imageData.versions,
  priority: false
});
```

### 3. MenuItem Example

```tsx
<div className="menu-item bg-white rounded-lg shadow-md">
  <div className="relative w-full h-48 overflow-hidden">
    <OptimizedImage
      src={item.image_url}
      alt={item.name}
      className="w-full h-full object-cover"
      lazy={true}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  </div>
  {/* ... rest of component */}
</div>
```

## 🔧 Optimization Script

### Run Bulk Optimization

```bash
cd backend
node scripts/optimize-existing-images.js
```

This script will:
- Scan for existing images
- Create optimized versions
- Archive original files
- Generate optimization report

### API Endpoint

```bash
POST /api/upload/optimize-existing
```

## 📱 Responsive Design

The system automatically serves the best image size based on:

- **Device Type**: Mobile, tablet, desktop
- **Viewport Size**: Screen width
- **Pixel Density**: Retina displays get higher quality
- **Network Conditions**: Can be extended for adaptive quality

## 🎯 Performance Benefits

- **File Size Reduction**: WebP is 25-35% smaller than JPEG
- **Faster Loading**: Lazy loading reduces initial page load
- **Better UX**: Progressive image loading with placeholders
- **SEO Friendly**: Proper alt tags and loading attributes
- **Mobile Optimized**: Smaller images for mobile devices

## 🔍 Browser Support

| Browser | WebP Support | Fallback |
|---------|--------------|----------|
| Chrome | ✅ Full | WebP |
| Firefox | ✅ Full | WebP |
| Safari | ✅ Full (14+) | JPEG |
| Edge | ✅ Full | WebP |
| IE | ❌ None | JPEG |

## 🚨 Troubleshooting

### Common Issues

1. **Sharp Installation Error**
   ```bash
   npm rebuild sharp
   ```

2. **Memory Issues with Large Images**
   - Reduce max file size in upload config
   - Process images in batches

3. **WebP Not Loading**
   - Check if fallback JPEG is generated
   - Verify browser support

### Debug Mode

Enable debug logging in the upload route:

```javascript
console.log('Image processing:', { inputPath, outputPath, options });
```

## 📊 Monitoring

### Performance Metrics

- Image load times
- File size savings
- Browser compatibility
- User experience metrics

### Analytics

Track image performance with:

```javascript
// Track image load time
const startTime = performance.now();
img.onload = () => {
  const loadTime = performance.now() - startTime;
  analytics.track('image_load_time', { loadTime, imageSize });
};
```

## 🔮 Future Enhancements

- **AVIF Support**: Next-generation image format
- **Progressive JPEG**: For better perceived performance
- **CDN Integration**: Global image delivery
- **Adaptive Quality**: Based on network conditions
- **Image Compression**: Further size reduction

## 📚 Resources

- [WebP Documentation](https://developers.google.com/speed/webp)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)
- [Lazy Loading Best Practices](https://web.dev/lazy-loading-images/)
- [Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)

---

**Note**: Always test image optimization on different devices and browsers to ensure compatibility and performance.
