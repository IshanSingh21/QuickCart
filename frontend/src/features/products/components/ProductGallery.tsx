import React, { useMemo, useState, useEffect } from 'react';
import { ProductImage } from '../../../types';
import { ImageWithFallback } from '../../../components/ui/ImageWithFallback';
import { cn } from '../../../utils/cn';

export interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, productName }) => {
  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    });
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [sortedImages]);

  const activeImage = sortedImages[activeIndex];

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-2 shadow-2xs">
        <ImageWithFallback
          src={activeImage?.url}
          alt={activeImage?.altText || productName}
          aspectRatio="square"
          className="rounded-xl"
        />
      </div>

      {/* Multi-Image Thumbnail Selector */}
      {sortedImages.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5" role="list" aria-label="Product gallery thumbnails">
          {sortedImages.map((img, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={img.id || `${img.url}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-white p-1 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500',
                  isSelected
                    ? 'border-primary-600 ring-2 ring-primary-500/20 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 opacity-80 hover:opacity-100'
                )}
                aria-label={`View image ${idx + 1} of ${sortedImages.length}`}
                aria-current={isSelected ? 'true' : undefined}
              >
                <ImageWithFallback
                  src={img.url}
                  alt={img.altText || `${productName} view ${idx + 1}`}
                  aspectRatio="square"
                  className="rounded-lg"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
