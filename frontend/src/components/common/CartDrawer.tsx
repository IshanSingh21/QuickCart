import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUIStore } from '../../store/ui-store';
import { useAuthStore } from '../../store/auth-store';
import {
  useCartData,
  useUpdateCartQuantityMutation,
  useRemoveCartItemMutation,
  UnifiedCartItem
} from '../../features/cart/hooks/useCartActions';
import { X, ShoppingBag, Trash2, ArrowRight, ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { PriceDisplay } from '../ui/PriceDisplay';
import { QuantitySelector } from '../ui/QuantitySelector';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { formatErrorMessage } from '../../utils/error-handler';

export const CartDrawer: React.FC = () => {
  const { isCartDrawerOpen, closeCartDrawer } = useUIStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { items, subtotal, itemCount, hasUnavailableItems } = useCartData();
  const updateMutation = useUpdateCartQuantityMutation();
  const removeMutation = useRemoveCartItemMutation();

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartDrawerOpen) {
        closeCartDrawer();
      }
    };

    if (isCartDrawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartDrawerOpen, closeCartDrawer]);

  // Clear transient error when drawer opens/closes
  useEffect(() => {
    if (!isCartDrawerOpen) {
      setErrorMessage(null);
      setUpdatingItemId(null);
    }
  }, [isCartDrawerOpen]);

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

  const handleRemove = async (item: UnifiedCartItem) => {
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

  if (!isCartDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
        onClick={closeCartDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              type="button"
              onClick={closeCartDrawer}
              className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Guest notification notice */}
          {!isAuthenticated && items.length > 0 && (
            <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-100 text-[11px] text-amber-900 flex items-center justify-between">
              <span>Shopping as guest.</span>
              <Link
                to="/login?from=/cart"
                onClick={closeCartDrawer}
                className="font-semibold underline hover:text-amber-950"
              >
                Sign in to sync
              </Link>
            </div>
          )}

          {/* Error / Conflict Alert */}
          {errorMessage && (
            <div
              className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-in fade-in"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700"
                aria-label="Dismiss alert"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Unavailable Items Alert */}
          {hasUnavailableItems && (
            <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="font-medium">
                One or more items exceed current stock or are unavailable.
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Your cart is empty</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Add products from the catalog to preview live subtotal and availability.
                </p>
                <div className="mt-6">
                  <Link to="/products" onClick={closeCartDrawer}>
                    <Button variant="outline" size="sm">
                      Explore Products
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              items.map((item) => {
                const isItemUpdating = updatingItemId === item.id;
                const isOutOfStock = !item.isAvailable || item.availableStock < item.quantity;

                return (
                  <div
                    key={item.id}
                    className={`py-4 first:pt-0 last:pb-0 flex gap-4 transition-opacity ${
                      isItemUpdating ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="w-18 h-18 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-100 relative">
                      <ImageWithFallback
                        src={item.image ?? undefined}
                        alt={item.name}
                        aspectRatio="square"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/products/${item.slug}`}
                            onClick={closeCartDrawer}
                            className="text-sm font-semibold text-gray-900 hover:text-primary-600 line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleRemove(item)}
                            disabled={isItemUpdating}
                            className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors disabled:opacity-50"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <PriceDisplay price={item.currentPrice} size="sm" className="mt-0.5" />
                        {isOutOfStock && (
                          <div className="mt-1 text-[11px] font-semibold text-rose-600">
                            Only {item.availableStock} available
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <QuantitySelector
                          size="sm"
                          value={item.quantity}
                          min={1}
                          max={Math.max(1, item.availableStock)}
                          disabled={isItemUpdating}
                          onChange={(qty) => void handleQuantityChange(item, qty)}
                        />
                        <span className="text-xs font-semibold text-gray-900 tabular-nums">
                          ${parseFloat(item.lineTotal).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-gray-50/80 space-y-4">
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Subtotal</span>
                <span className="tabular-nums">${parseFloat(subtotal).toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <Link to="/cart" onClick={closeCartDrawer} className="block">
                  <Button className="w-full" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View Cart &amp; Checkout
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Server-authoritative pricing &amp; stock validation</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
