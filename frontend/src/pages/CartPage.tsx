import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Trash2,
  ShieldCheck,
  Truck,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useAuthStore } from '../store/auth-store';
import {
  useCartData,
  useUpdateCartQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
  UnifiedCartItem
} from '../features/cart/hooks/useCartActions';
import { Button } from '../components/ui/Button';
import { PriceDisplay } from '../components/ui/PriceDisplay';
import { QuantitySelector } from '../components/ui/QuantitySelector';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { formatErrorMessage } from '../utils/error-handler';

const FREE_SHIPPING_THRESHOLD = 100;

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const {
    items,
    subtotal,
    itemCount,
    distinctCount,
    hasUnavailableItems,
    isServerAuthoritative,
    isLoading,
    isError,
    error,
    refetch
  } = useCartData();

  const updateMutation = useUpdateCartQuantityMutation();
  const removeMutation = useRemoveCartItemMutation();
  const clearMutation = useClearCartMutation();

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const subtotalNumber = parseFloat(subtotal) || 0;
  const freeShippingUnlocked = subtotalNumber >= FREE_SHIPPING_THRESHOLD;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalNumber);
  const freeShippingProgress = Math.min(100, (subtotalNumber / FREE_SHIPPING_THRESHOLD) * 100);

  const handleQuantityChange = async (item: UnifiedCartItem, newQuantity: number) => {
    if (updatingItemId) return;
    setErrorMessage(null);
    setUpdatingItemId(item.id);

    try {
      await updateMutation.mutateAsync({
        itemId: item.itemId,
        productId: item.productId,
        quantity: newQuantity
      });
    } catch (err) {
      setErrorMessage(formatErrorMessage(err));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (item: UnifiedCartItem) => {
    if (updatingItemId) return;
    setErrorMessage(null);
    setUpdatingItemId(item.id);

    try {
      await removeMutation.mutateAsync({
        itemId: item.itemId,
        productId: item.productId
      });
    } catch (err) {
      setErrorMessage(formatErrorMessage(err));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleClearCart = async () => {
    setErrorMessage(null);
    try {
      await clearMutation.mutateAsync();
      setIsClearModalOpen(false);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err));
    }
  };

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login?from=/checkout');
      return;
    }
    navigate('/checkout');
  };

  // 1. Loading State
  if (isLoading) {
    return <CartSkeletonView />;
  }

  // 2. Error State
  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ErrorState
          title="Could not load shopping cart"
          message={error?.message || 'We encountered an error loading your cart details.'}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  // 3. Empty State
  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-gray-500">
            <li>
              <Link to="/" className="hover:text-primary-600">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-gray-900">Cart</li>
          </ol>
        </nav>

        <EmptyState
          icon={<ShoppingBag className="w-8 h-8 text-primary-600" />}
          title="Your Shopping Cart is Empty"
          description="You have not added any products yet. Explore our curated selection of high-performance tech gear."
          action={
            <Link to="/products">
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore Products
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  // 4. Active Cart View
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Breadcrumb & Return Link */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-xs text-gray-500">
            <li>
              <Link to="/" className="hover:text-primary-600">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="font-semibold text-gray-900">Cart</li>
          </ol>
        </nav>

        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Continue Shopping
        </Link>
      </div>

      {/* Page Title & Action Bar */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight">
            Shopping Cart
          </h1>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} ({distinctCount} unique)
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsClearModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-rose-600 transition-colors p-1"
          aria-label="Clear all items from cart"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Cart
        </button>
      </div>

      {/* Guest Mode Banner */}
      {!isAuthenticated && (
        <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p>
              <strong className="font-semibold">Shopping as Guest:</strong> Items are saved in this
              browser. Sign in to synchronize your items across devices and access saved shipping addresses.
            </p>
          </div>
          <Link to="/login?from=/cart">
            <Button size="sm" variant="outline" className="border-amber-300 bg-white hover:bg-amber-100">
              Sign In to Sync
            </Button>
          </Link>
        </div>
      )}

      {/* Free Shipping Progress Bar */}
      <div className="mt-6 p-4 rounded-2xl bg-gray-50/90 border border-gray-200/80">
        <div className="flex items-center justify-between text-xs font-medium text-gray-800 mb-2">
          <div className="flex items-center gap-1.5">
            {freeShippingUnlocked ? (
              <>
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-emerald-800">
                  You have qualified for Free Standard Shipping!
                </span>
              </>
            ) : (
              <>
                <Truck className="w-4 h-4 text-primary-600" />
                <span>
                  Add{' '}
                  <strong className="font-bold text-gray-950">
                    ${remainingForFreeShipping.toFixed(2)}
                  </strong>{' '}
                  more for <strong className="text-primary-700">FREE Standard Shipping</strong>
                </span>
              </>
            )}
          </div>
          <span className="text-[11px] font-semibold text-gray-500">
            ${subtotalNumber.toFixed(2)} / ${FREE_SHIPPING_THRESHOLD.toFixed(2)}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              freeShippingUnlocked ? 'bg-emerald-500' : 'bg-primary-600'
            }`}
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      {/* Mutation Error / Stock Conflict Alert */}
      {errorMessage && (
        <div
          className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-3"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-900">Cart Update Conflict</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-700 font-semibold"
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unavailable Items Alert */}
      {hasUnavailableItems && (
        <div
          className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3"
          role="alert"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-950">Inventory Availability Notice</p>
            <p className="mt-0.5">
              One or more items in your cart exceed available inventory or are currently unavailable.
              Please adjust quantities to match available stock before proceeding to checkout.
            </p>
          </div>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column: Cart Items Table / List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs divide-y divide-gray-100 overflow-hidden">
            {items.map((item) => {
              const isItemUpdating = updatingItemId === item.id;
              const isOutOfStock = !item.isAvailable || item.availableStock < item.quantity;
              const isLowStock =
                item.isAvailable && item.availableStock <= 5 && item.availableStock > 0;

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-opacity ${
                    isItemUpdating ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {/* Thumbnail Image */}
                  <Link
                    to={`/products/${item.slug}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-50 border border-gray-100 shrink-0 overflow-hidden focus:outline-hidden focus:ring-2 focus:ring-primary-500"
                  >
                    <ImageWithFallback
                      src={item.image ?? undefined}
                      alt={item.name}
                      aspectRatio="square"
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/products/${item.slug}`}
                        className="text-sm sm:text-base font-bold text-gray-900 hover:text-primary-600 transition-colors line-clamp-1"
                      >
                        {item.name}
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span>SKU: {item.sku}</span>
                      {item.category && (
                        <>
                          <span>•</span>
                          <span>{item.category.name}</span>
                        </>
                      )}
                    </div>

                    {/* Stock Status Badges */}
                    <div className="pt-1 flex items-center gap-2">
                      {isOutOfStock ? (
                        <Badge variant="error" size="sm" dot>
                          {item.availableStock <= 0
                            ? 'Out of Stock'
                            : `Only ${item.availableStock} in stock`}
                        </Badge>
                      ) : isLowStock ? (
                        <Badge variant="warning" size="sm" dot>
                          Only {item.availableStock} left
                        </Badge>
                      ) : (
                        <Badge variant="in-stock" size="sm" dot>
                          In Stock
                        </Badge>
                      )}
                    </div>

                    {/* Unit Price */}
                    <div className="pt-1">
                      <PriceDisplay price={item.currentPrice} size="sm" />
                    </div>
                  </div>

                  {/* Quantity and Line Total */}
                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 sm:hidden">
                        Quantity
                      </span>
                      <QuantitySelector
                        size="md"
                        value={item.quantity}
                        min={1}
                        max={Math.max(1, item.availableStock)}
                        disabled={isItemUpdating}
                        onChange={(qty) => void handleQuantityChange(item, qty)}
                      />
                    </div>

                    <div className="flex flex-col items-end min-w-[5rem]">
                      <span className="text-[10px] uppercase font-bold text-gray-400 sm:hidden">
                        Line Total
                      </span>
                      <PriceDisplay
                        price={item.lineTotal}
                        size="md"
                        className="font-bold text-gray-950"
                      />
                    </div>

                    {/* Remove Action Button */}
                    <button
                      type="button"
                      onClick={() => void handleRemoveItem(item)}
                      disabled={isItemUpdating}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Price Authority Notice */}
          <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {isServerAuthoritative
                ? 'Pricing and line items verified by backend PostgreSQL service.'
                : 'Guest cart saved locally. Totals verified with backend upon checkout.'}
            </span>
            <span className="text-gray-400">Inventory reserved at order submission</span>
          </div>
        </div>

        {/* Right Column: Order Summary Sidebar */}
        <div className="mt-8 lg:mt-0 lg:col-span-4 sticky top-24">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-950">Order Summary</h2>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal ({itemCount})</span>
                <PriceDisplay price={subtotal} size="sm" className="font-semibold text-gray-900" />
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Estimated Shipping</span>
                <span className="font-semibold text-gray-900">
                  {freeShippingUnlocked ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    'Calculated at checkout'
                  )}
                </span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Estimated Sales Tax</span>
                <span className="font-semibold text-gray-900">Calculated at checkout</span>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between">
                <span className="text-sm font-bold text-gray-950">Estimated Total</span>
                <div className="text-right">
                  <PriceDisplay price={subtotal} size="xl" />
                  <span className="text-[10px] text-gray-400 block mt-0.5">USD</span>
                </div>
              </div>
            </div>

            {/* Checkout Action Button */}
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full py-3.5 text-sm font-semibold shadow-xs"
                disabled={items.length === 0 || hasUnavailableItems}
                onClick={handleProceedToCheckout}
                rightIcon={
                  isAuthenticated ? (
                    <ArrowRight className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )
                }
              >
                {isAuthenticated ? 'Proceed to Checkout' : 'Sign in to Checkout'}
              </Button>

              {hasUnavailableItems && (
                <p className="text-[11px] text-rose-600 text-center font-medium">
                  Please resolve out-of-stock items before checking out.
                </p>
              )}
            </div>

            {/* Trust and Guarantee Signals */}
            <div className="pt-4 border-t border-gray-100 space-y-2.5 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>256-bit SSL encrypted secure checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary-600 shrink-0" />
                <span>Dispatches within 24-48 business hours</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-gray-600 shrink-0" />
                <span>30-day money-back guarantee &amp; free returns</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Live backend inventory check</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Cart Confirmation Dialog */}
      <Dialog
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear Shopping Cart?"
        description="Are you sure you want to remove all items from your cart? This action cannot be undone."
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearModalOpen(false)}
              disabled={clearMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleClearCart()}
              isLoading={clearMutation.isPending}
            >
              Clear Cart
            </Button>
          </div>
        }
      >
        <p className="text-xs text-gray-600">
          All {itemCount} items will be permanently removed from your active cart session.
        </p>
      </Dialog>
    </div>
  );
};

const CartSkeletonView: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-6" />
      <div className="h-8 w-48 bg-gray-200 rounded mb-8" />

      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 items-center">
                <div className="w-20 h-20 bg-gray-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/4 bg-gray-100 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                </div>
                <div className="h-8 w-24 bg-gray-100 rounded" />
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-8 w-full bg-gray-200 rounded mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
