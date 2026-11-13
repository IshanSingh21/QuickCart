import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  PackageCheck,
  PackageX,
  ShoppingBag
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { QuantitySelector } from '../components/ui/QuantitySelector';
import { ProductCard } from '../components/ui/ProductCard';
import { ProductGrid } from '../components/ui/ProductGrid';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductGallery } from '../features/products/components/ProductGallery';
import {
  useProductDetailQuery,
  useRelatedProductsQuery
} from '../features/products/hooks/useProducts';
import { useAddToCartMutation } from '../features/cart/hooks/useCartActions';
import { useUIStore } from '../store/ui-store';
import { Product } from '../types';
import { formatErrorMessage } from '../utils/error-handler';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch
  } = useProductDetailQuery(slug);

  const { data: relatedProducts = [] } = useRelatedProductsQuery(
    product?.category?.slug,
    product?.id
  );

  const addToCartMutation = useAddToCartMutation();
  const openCartDrawer = useUIStore((state) => state.openCartDrawer);

  const [quantity, setQuantity] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addingRelatedId, setAddingRelatedId] = useState<string | null>(null);

  useEffect(() => {
    setQuantity(1);
    setAddedSuccess(false);
    setAddError(null);
  }, [product?.id]);

  const handleAddToCart = async () => {
    if (!product || product.stock <= 0) return;
    setAddError(null);

    try {
      await addToCartMutation.mutateAsync({ product, quantity });
      setAddedSuccess(true);
      openCartDrawer();
      window.setTimeout(() => setAddedSuccess(false), 2000);
    } catch (err) {
      setAddError(formatErrorMessage(err));
    }
  };

  const handleAddRelatedToCart = async (related: Product) => {
    setAddingRelatedId(related.id);
    try {
      await addToCartMutation.mutateAsync({ product: related, quantity: 1 });
      openCartDrawer();
    } catch (err) {
      setAddError(formatErrorMessage(err));
    } finally {
      setAddingRelatedId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse" aria-label="Loading product details">
          <div className="lg:col-span-6 space-y-3">
            <div className="aspect-square rounded-2xl bg-gray-200" />
            <div className="grid grid-cols-4 gap-2.5">
              <div className="aspect-square rounded-xl bg-gray-200" />
              <div className="aspect-square rounded-xl bg-gray-200" />
              <div className="aspect-square rounded-xl bg-gray-200" />
            </div>
          </div>
          <div className="lg:col-span-6 space-y-5 pt-4">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-9 w-3/4 bg-gray-200 rounded" />
            <div className="h-8 w-28 bg-gray-200 rounded" />
            <div className="h-24 w-full bg-gray-200 rounded" />
            <div className="h-12 w-full bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    const isNotFound = axios.isAxiosError(error) && error.response?.status === 404;

    if (isNotFound) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16">
          <EmptyState
            icon={<PackageX className="w-8 h-8" />}
            title="Product not found"
            description="This product may have been discontinued or removed from the catalog."
            action={
              <Link to="/products">
                <Button size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back to Products
                </Button>
              </Link>
            }
          />
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <ErrorState
          title="Unable to load product"
          message={formatErrorMessage(error)}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const isOutOfStock = product.stock <= 0;
  const maxSelectableQuantity = Math.max(1, Math.min(product.stock, 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <Link to="/" className="hover:text-gray-900 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <Link to="/products" className="hover:text-gray-900 transition-colors">
          Products
        </Link>
        {product.category && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link
              to={`/products?category=${encodeURIComponent(product.category.slug)}`}
              className="hover:text-gray-900 transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-medium text-gray-900 truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-6">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* Right: Specifications, Stock & Purchase Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3 border-b border-gray-200/80 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {product.category ? (
                <Link to={`/products?category=${encodeURIComponent(product.category.slug)}`}>
                  <Badge variant="primary" size="sm">
                    {product.category.name}
                  </Badge>
                </Link>
              ) : (
                <Badge variant="default" size="sm">Catalog</Badge>
              )}

              <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200/70">
                SKU: {product.sku}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-950 tracking-tight leading-tight">
              {product.name}
            </h1>

            <div className="pt-1 flex flex-wrap items-center justify-between gap-4">
              <PriceDisplay price={product.price} size="lg" />

              {isOutOfStock ? (
                <Badge variant="out-of-stock" size="md">
                  Out of Stock
                </Badge>
              ) : product.stock <= 5 ? (
                <Badge variant="warning" size="md">
                  Only {product.stock} left in stock
                </Badge>
              ) : (
                <Badge variant="in-stock" size="md" dot>
                  In Stock ({product.stock} available)
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Overview
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Quantity & Add to Cart Controls */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Quantity
                </span>
                <QuantitySelector
                  value={quantity}
                  min={1}
                  max={maxSelectableQuantity}
                  disabled={isOutOfStock || addToCartMutation.isPending}
                  onChange={setQuantity}
                />
              </div>

              <div className="text-right text-xs text-gray-500">
                <div className="flex items-center justify-end gap-1.5 font-medium text-gray-700">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isOutOfStock
                      ? 'Unavailable'
                      : `${product.stock} unit${product.stock === 1 ? '' : 's'} ready to ship`}
                  </span>
                </div>
              </div>
            </div>

            {addError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={isOutOfStock}
              isLoading={addToCartMutation.isPending}
              onClick={handleAddToCart}
              leftIcon={
                addedSuccess ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <ShoppingBag className="w-5 h-5" />
                )
              }
            >
              {isOutOfStock
                ? 'Out of Stock'
                : addedSuccess
                ? 'Added to Cart'
                : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>

      {/* Safely Derived Related Products (Same Category) */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-gray-200/80 pt-12 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary-600 block mb-1">
                Same Category
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight">
                More in {product.category?.name}
              </h2>
            </div>
            {product.category && (
              <Link
                to={`/products?category=${encodeURIComponent(product.category.slug)}`}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                View all →
              </Link>
            )}
          </div>

          <ProductGrid columns={4}>
            {relatedProducts.map((related) => {
              const primaryImage = related.images[0];
              return (
                <ProductCard
                  key={related.id}
                  id={related.id}
                  name={related.name}
                  slug={related.slug}
                  sku={related.sku}
                  price={related.price}
                  imageUrl={primaryImage?.url}
                  imageAlt={primaryImage?.altText || related.name}
                  categoryName={related.category?.name}
                  categorySlug={related.category?.slug}
                  stock={related.stock}
                  isAddingToCart={addingRelatedId === related.id}
                  onAddToCart={() => void handleAddRelatedToCart(related)}
                />
              );
            })}
          </ProductGrid>
        </section>
      )}
    </div>
  );
};
