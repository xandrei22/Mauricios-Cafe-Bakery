import React, { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: string;
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

interface ImageVersions {
  tiny: string;
  small: string;
  medium: string;
  large: string;
  fallback: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  lazy = true,
  placeholder,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [imageVersions, setImageVersions] = useState<ImageVersions | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Parse image versions from src if it's a JSON string
  useEffect(() => {
    try {
      if (src.startsWith('{') || src.includes('versions')) {
        const parsed = typeof src === 'string' ? JSON.parse(src) : src;
        if (parsed.versions) {
          setImageVersions(parsed.versions);
          setCurrentSrc(parsed.versions.medium || parsed.versions.fallback);
        } else {
          setCurrentSrc(src);
        }
      } else {
        // Handle single URL (like the medium version URL)
        setCurrentSrc(src);
        setImageVersions(null);
      }
    } catch (error) {
      setCurrentSrc(src);
      setImageVersions(null);
    }
  }, [src]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );

    observerRef.current = observer;
    observer.observe(imgRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    if (imageVersions?.fallback && currentSrc !== imageVersions.fallback) {
      setCurrentSrc(imageVersions.fallback);
    }
    onError?.();
  };

  // Get appropriate image source based on viewport
  const getResponsiveSrc = () => {
    if (!imageVersions) return currentSrc;

    // Use different sizes based on viewport
    if (window.innerWidth <= 768) {
      return imageVersions.small;
    } else if (window.innerWidth <= 1200) {
      return imageVersions.medium;
    } else {
      return imageVersions.large;
    }
  };

  // Update image source on resize
  useEffect(() => {
    const handleResize = () => {
      if (imageVersions) {
        setCurrentSrc(getResponsiveSrc());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageVersions]);

  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`${className} bg-gray-200 animate-pulse`}
        style={{
          width: width || '100%',
          height: height || '200px'
        }}
        aria-label={alt}
      />
    );
  }

  return (
    <picture>
      {/* WebP format for modern browsers */}
      {imageVersions?.large && (
        <source
          media="(min-width: 1200px)"
          srcSet={imageVersions.large}
          type="image/webp"
        />
      )}
      {imageVersions?.medium && (
        <source
          media="(min-width: 768px)"
          srcSet={imageVersions.medium}
          type="image/webp"
        />
      )}
      {imageVersions?.small && (
        <source
          media="(max-width: 767px)"
          srcSet={imageVersions.small}
          type="image/webp"
        />
      )}
      
      {/* Fallback image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        width={width}
        height={height}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          objectFit: 'cover',
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto'
        }}
      />
    </picture>
  );
};

export default OptimizedImage;
