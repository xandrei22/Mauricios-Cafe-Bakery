import { useState, useEffect } from 'react';

interface ImageVersions {
  tiny: string;
  small: string;
  medium: string;
  large: string;
  fallback: string;
}

interface UseImageOptimizationOptions {
  src: string | ImageVersions;
  sizes?: string;
  priority?: boolean;
}

interface UseImageOptimizationReturn {
  currentSrc: string;
  imageVersions: ImageVersions | null;
  isLoading: boolean;
  error: string | null;
  preloadImages: () => void;
}

export const useImageOptimization = ({
  src,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false
}: UseImageOptimizationOptions): UseImageOptimizationReturn => {
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [imageVersions, setImageVersions] = useState<ImageVersions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse image source and versions
  useEffect(() => {
    try {
      if (typeof src === 'string') {
        if (src.startsWith('{') || src.includes('versions')) {
          const parsed = JSON.parse(src);
          if (parsed.versions) {
            setImageVersions(parsed.versions);
            setCurrentSrc(parsed.versions.medium || parsed.versions.fallback);
          } else {
            setCurrentSrc(src);
          }
        } else {
          setCurrentSrc(src);
        }
      } else {
        setImageVersions(src);
        setCurrentSrc(src.medium || src.fallback);
      }
      setIsLoading(false);
    } catch (error) {
      setError('Failed to parse image source');
      setIsLoading(false);
    }
  }, [src]);

  // Get appropriate image source based on viewport and device pixel ratio
  const getOptimalSrc = (): string => {
    if (!imageVersions) return currentSrc;

    const viewportWidth = window.innerWidth;
    const pixelRatio = window.devicePixelRatio || 1;

    // Determine optimal size based on viewport and pixel density
    if (viewportWidth <= 480) {
      // Mobile devices
      return pixelRatio > 1 ? imageVersions.small : imageVersions.tiny;
    } else if (viewportWidth <= 768) {
      // Tablets
      return pixelRatio > 1 ? imageVersions.medium : imageVersions.small;
    } else if (viewportWidth <= 1200) {
      // Small desktops
      return imageVersions.medium;
    } else {
      // Large desktops
      return imageVersions.large;
    }
  };

  // Update image source on resize
  useEffect(() => {
    const handleResize = () => {
      if (imageVersions) {
        setCurrentSrc(getOptimalSrc());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageVersions]);

  // Preload images for better performance
  const preloadImages = () => {
    if (!imageVersions) return;

    const imagesToPreload = [
      imageVersions.tiny,
      imageVersions.small,
      imageVersions.medium,
      imageVersions.large
    ];

    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  };

  // Auto-preload if priority is true
  useEffect(() => {
    if (priority && imageVersions) {
      preloadImages();
    }
  }, [priority, imageVersions]);

  return {
    currentSrc,
    imageVersions,
    isLoading,
    error,
    preloadImages
  };
};

// Hook for managing image loading states
export const useImageLoading = (src: string) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) return;

    setIsLoaded(false);
    setHasError(false);

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setHasError(true);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { isLoaded, hasError };
};
