import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { ImageOff, Package } from 'lucide-react';

export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  altText?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = '',
  className,
  aspectRatio = 'square',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[4/5]',
    auto: 'aspect-auto'
  };

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'w-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 select-none rounded-lg p-4 border border-gray-100',
          aspectClasses[aspectRatio],
          className
        )}
        title={alt || 'Product image unavailable'}
      >
        <div className="w-12 h-12 rounded-full bg-gray-200/80 flex items-center justify-center text-gray-400 mb-2">
          {alt ? <Package className="w-6 h-6 stroke-[1.5]" /> : <ImageOff className="w-6 h-6 stroke-[1.5]" />}
        </div>
        <span className="text-[11px] font-medium text-gray-500 text-center line-clamp-1 max-w-[85%]">
          {alt || 'Image unavailable'}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-gray-100 rounded-lg', aspectClasses[aspectRatio], className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200/60 animate-pulse flex items-center justify-center z-10">
          <Package className="w-6 h-6 text-gray-300" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={cn(
          'w-full h-full object-cover transition-all duration-300',
          isLoading ? 'scale-105 blur-sm opacity-0' : 'scale-100 blur-0 opacity-100'
        )}
        {...props}
      />
    </div>
  );
};
