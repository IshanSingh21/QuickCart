import React from 'react';
import { cn } from '../../utils/cn';

export interface PriceDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  price: string | number;
  originalPrice?: string | number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDiscountBadge?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  currency = 'USD',
  size = 'md',
  showDiscountBadge = true,
  className,
  ...props
}) => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  const numOriginalPrice = originalPrice
    ? typeof originalPrice === 'string'
      ? parseFloat(originalPrice)
      : originalPrice
    : null;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numPrice || 0);

  const formattedOriginalPrice = numOriginalPrice
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(numOriginalPrice)
    : null;

  const discountPercentage =
    numOriginalPrice && numOriginalPrice > numPrice
      ? Math.round(((numOriginalPrice - numPrice) / numOriginalPrice) * 100)
      : null;

  const sizeClasses = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-semibold',
    lg: 'text-lg font-bold',
    xl: 'text-2xl font-bold tracking-tight'
  };

  const originalSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base'
  };

  return (
    <div className={cn('inline-flex items-baseline gap-2 tabular-nums', className)} {...props}>
      <span className={cn('text-gray-900', sizeClasses[size])}>{formattedPrice}</span>

      {formattedOriginalPrice && (
        <span className={cn('text-gray-400 line-through font-normal', originalSizeClasses[size])}>
          {formattedOriginalPrice}
        </span>
      )}

      {showDiscountBadge && discountPercentage && discountPercentage > 0 && (
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5">
          -{discountPercentage}%
        </span>
      )}
    </div>
  );
};
