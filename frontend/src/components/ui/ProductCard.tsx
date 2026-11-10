import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { ShoppingBag, Star, Check } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { PriceDisplay } from './PriceDisplay';
import { Badge } from './Badge';

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  originalPrice?: string | number;
  imageUrl?: string;
  categoryName?: string;
  categorySlug?: string;
  stock?: number;
  rating?: number;
  reviewCount?: number;
  badgeText?: string;
  badgeVariant?: 'new' | 'sale' | 'primary' | 'default';
  isAddedToCart?: boolean;
  onAddToCart?: (id: string, e: React.MouseEvent) => void;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  slug,
  price,
  originalPrice,
  imageUrl,
  categoryName,
  stock = 10,
  rating = 4.8,
  reviewCount = 24,
  badgeText,
  badgeVariant = 'new',
  isAddedToCart = false,
  onAddToCart,
  className
}) => {
  const isOutOfStock = stock <= 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock && onAddToCart) {
      onAddToCart(id, e);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-3 transition-all duration-300 hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5',
        isOutOfStock && 'opacity-75',
        className
      )}
    >
      {/* Product Image Wrapper */}
      <Link to={`/products/${slug}`} className="relative block overflow-hidden rounded-xl bg-gray-50">
        <ImageWithFallback
          src={imageUrl}
          alt={name}
          aspectRatio="portrait"
          className="transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Floating Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {badgeText && (
            <Badge variant={badgeVariant} size="sm">
              {badgeText}
            </Badge>
          )}
          {isOutOfStock ? (
            <Badge variant="out-of-stock" size="sm">
              Sold Out
            </Badge>
          ) : stock <= 5 ? (
            <Badge variant="warning" size="sm">
              Only {stock} left
            </Badge>
          ) : null}
        </div>
      </Link>

      {/* Product Details */}
      <div className="flex flex-1 flex-col pt-3.5 pb-1">
        {/* Category & Rating */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          {categoryName ? (
            <span className="font-medium text-primary-600 uppercase tracking-wider text-[10px]">
              {categoryName}
            </span>
          ) : (
            <span className="text-gray-400 text-[10px]">TECH</span>
          )}

          <div className="flex items-center gap-1 text-amber-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="font-medium text-gray-700 text-xs">{rating.toFixed(1)}</span>
            <span className="text-gray-400 text-[10px]">({reviewCount})</span>
          </div>
        </div>

        {/* Product Title */}
        <Link to={`/products/${slug}`} className="group/title block">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover/title:text-primary-600 transition-colors">
            {name}
          </h3>
        </Link>

        {/* Price & Add to Cart Button */}
        <div className="mt-auto pt-3.5 flex items-center justify-between border-t border-gray-100/80">
          <PriceDisplay price={price} originalPrice={originalPrice} size="md" />

          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
              isAddedToCart
                ? 'bg-emerald-600 text-white'
                : isOutOfStock
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-600 hover:text-white active:scale-95 shadow-2xs'
            )}
            title={isOutOfStock ? 'Out of stock' : isAddedToCart ? 'Added to cart' : 'Add to cart'}
            aria-label={`Add ${name} to shopping cart`}
          >
            {isAddedToCart ? <Check className="w-4 h-4 stroke-[2.5]" /> : <ShoppingBag className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
