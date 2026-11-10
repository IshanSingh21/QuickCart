import React from 'react';
import { cn } from '../../utils/cn';

export interface ProductSkeletonProps {
  className?: string;
  count?: number;
}

export const ProductSkeleton: React.FC<ProductSkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-2xs animate-pulse',
        className
      )}
    >
      {/* Image Skeleton */}
      <div className="w-full aspect-[4/5] rounded-xl bg-gray-200" />

      {/* Content Skeleton */}
      <div className="flex flex-1 flex-col pt-3.5 pb-1 space-y-2.5">
        {/* Category & Badge line */}
        <div className="flex items-center justify-between">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="h-3 w-10 rounded bg-gray-100" />
        </div>

        {/* Title (2 lines) */}
        <div className="space-y-1.5">
          <div className="h-4 w-11/12 rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>

        {/* Rating line */}
        <div className="flex items-center gap-1 pt-0.5">
          <div className="h-3 w-20 rounded bg-gray-100" />
        </div>

        {/* Price & Action line */}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-50">
          <div className="h-6 w-20 rounded bg-gray-200" />
          <div className="h-9 w-9 rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>
  );
};

export const ProductSkeletonGrid: React.FC<{ count?: number; className?: string }> = ({
  count = 4,
  className
}) => {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductSkeleton key={index} />
      ))}
    </div>
  );
};
