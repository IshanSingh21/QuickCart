import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUIStore } from '../../store/ui-store';
import { X, ShoppingBag, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { PriceDisplay } from '../ui/PriceDisplay';
import { QuantitySelector } from '../ui/QuantitySelector';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import { MOCK_PRODUCTS } from '../../mocks/mock-products';

export interface CartDrawerItem {
  id: string;
  name: string;
  slug: string;
  price: string;
  quantity: number;
  imageUrl: string;
}

export const CartDrawer: React.FC = () => {
  const { isCartDrawerOpen, closeCartDrawer } = useUIStore();

  // Demo cart state initialized with 2 curated items for immediate visual fidelity
  const [items, setItems] = React.useState<CartDrawerItem[]>([
    {
      id: MOCK_PRODUCTS[0].id,
      name: MOCK_PRODUCTS[0].name,
      slug: MOCK_PRODUCTS[0].slug,
      price: MOCK_PRODUCTS[0].price,
      quantity: 1,
      imageUrl: MOCK_PRODUCTS[0].imageUrl
    },
    {
      id: MOCK_PRODUCTS[2].id,
      name: MOCK_PRODUCTS[2].name,
      slug: MOCK_PRODUCTS[2].slug,
      price: MOCK_PRODUCTS[2].price,
      quantity: 1,
      imageUrl: MOCK_PRODUCTS[2].imageUrl
    }
  ]);

  const subtotal = items.reduce((acc, item) => acc + parseFloat(item.price) * item.quantity, 0);
  const freeShippingThreshold = 100;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

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

  const updateQuantity = (id: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: qty } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
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
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>
            <button
              onClick={closeCartDrawer}
              className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 text-xs">
            <div className="flex items-center justify-between text-gray-600 mb-1.5 font-medium">
              {subtotal >= freeShippingThreshold ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  ✓ You qualify for free insured shipping!
                </span>
              ) : (
                <span>
                  Add <strong>${(freeShippingThreshold - subtotal).toFixed(2)}</strong> more for free shipping
                </span>
              )}
              <span className="tabular-nums font-semibold text-gray-900">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 divide-y divide-gray-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Your cart is currently empty</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Items you add will appear here with live price snapshots and stock reservation.
                </p>
                <div className="mt-6">
                  <Button variant="outline" size="sm" onClick={closeCartDrawer}>
                    Continue Shopping
                  </Button>
                </div>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                  <div className="w-18 h-18 rounded-xl bg-gray-50 shrink-0 overflow-hidden border border-gray-100">
                    <ImageWithFallback src={item.imageUrl} alt={item.name} aspectRatio="square" />
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
                          onClick={() => removeItem(item.id)}
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
                        onChange={(qty) => updateQuantity(item.id, qty)}
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
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-gray-900 tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping estimate</span>
                  <span className="font-semibold text-gray-900">
                    {subtotal >= freeShippingThreshold ? 'FREE' : '$15.00'}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200/80">
                  <span>Estimated Total</span>
                  <span className="tabular-nums">
                    ${(subtotal + (subtotal >= freeShippingThreshold ? 0 : 15)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Link to="/checkout" onClick={closeCartDrawer} className="block">
                  <Button className="w-full" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Proceed to Checkout
                  </Button>
                </Link>
                <Link to="/cart" onClick={closeCartDrawer} className="block">
                  <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500">
                    View Full Cart Details
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>15-Minute Inventory Lock upon checkout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
