import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../../store/ui-store';
import { useAuthStore } from '../../store/auth-store';
import { useGuestCartStore } from '../../store/guest-cart-store';
import { cartKeys, useServerCartQuery } from '../../features/cart/hooks/useCartActions';
import { cartService } from '../../services/cart.service';
import { X, ShoppingBag, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { PriceDisplay } from '../ui/PriceDisplay';
import { QuantitySelector } from '../ui/QuantitySelector';
import { ImageWithFallback } from '../ui/ImageWithFallback';

interface DrawerDisplayItem {
  key: string;
  idForUpdate: string;
  name: string;
  slug: string;
  price: string;
  quantity: number;
  maxStock: number;
  imageUrl: string | null;
}

export const CartDrawer: React.FC = () => {
  const { isCartDrawerOpen, closeCartDrawer } = useUIStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  const { data: serverCart } = useServerCartQuery();
  const guestItems = useGuestCartStore((state) => state.items);
  const updateGuestQty = useGuestCartStore((state) => state.updateQuantity);
  const removeGuestItem = useGuestCartStore((state) => state.removeItem);

  const items: DrawerDisplayItem[] = isAuthenticated
    ? (serverCart?.items ?? []).map((item) => ({
        key: item.itemId,
        idForUpdate: item.itemId,
        name: item.name,
        slug: item.slug,
        price: item.currentPrice,
        quantity: item.quantity,
        maxStock: Math.max(1, item.availableStock),
        imageUrl: item.image
      }))
    : guestItems.map((item) => ({
        key: item.productId,
        idForUpdate: item.productId,
        name: item.name,
        slug: item.slug,
        price: item.currentPrice,
        quantity: item.quantity,
        maxStock: Math.max(1, item.availableStock),
        imageUrl: item.image
      }));

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalNumber = isAuthenticated && serverCart
    ? parseFloat(serverCart.subtotal)
    : items.reduce((acc, item) => acc + parseFloat(item.price) * item.quantity, 0);

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

  const handleQuantityChange = async (id: string, qty: number) => {
    if (isAuthenticated) {
      try {
        const updated =
          qty <= 0
            ? await cartService.removeItem(id)
            : await cartService.updateItemQuantity(id, qty);
        queryClient.setQueryData(cartKeys.detail(), updated);
      } catch {
        await queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
      }
      return;
    }

    updateGuestQty(id, qty);
  };

  const handleRemove = async (id: string) => {
    if (isAuthenticated) {
      try {
        const updated = await cartService.removeItem(id);
        queryClient.setQueryData(cartKeys.detail(), updated);
      } catch {
        await queryClient.invalidateQueries({ queryKey: cartKeys.detail() });
      }
      return;
    }

    removeGuestItem(id);
  };

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Shopping cart">
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
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
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

          {!isAuthenticated && items.length > 0 && (
            <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-100 text-[11px] text-amber-900">
              Shopping as guest.{' '}
              <Link to="/login" onClick={closeCartDrawer} className="font-semibold underline">
                Sign in
              </Link>{' '}
              to sync with your account and check out.
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
              items.map((item) => (
                <div key={item.key} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                  <div className="w-18 h-18 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-100">
                    <ImageWithFallback src={item.imageUrl ?? undefined} alt={item.name} aspectRatio="square" />
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
                          onClick={() => void handleRemove(item.idForUpdate)}
                          className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors"
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <PriceDisplay price={item.price} size="sm" className="mt-0.5" />
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <QuantitySelector
                        size="sm"
                        value={item.quantity}
                        min={1}
                        max={item.maxStock}
                        onChange={(qty) => void handleQuantityChange(item.idForUpdate, qty)}
                      />
                      <span className="text-xs font-semibold text-gray-900 tabular-nums">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-gray-50/80 space-y-4">
              <div className="flex justify-between text-sm font-bold text-gray-900">
                <span>Subtotal</span>
                <span className="tabular-nums">${subtotalNumber.toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <Link to="/cart" onClick={closeCartDrawer} className="block">
                  <Button className="w-full" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View Cart
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
