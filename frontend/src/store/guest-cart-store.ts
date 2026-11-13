import { create } from 'zustand';
import { Product } from '../types';

export interface GuestCartItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  currentPrice: string;
  quantity: number;
  availableStock: number;
  image: string | null;
}

const GUEST_CART_STORAGE_KEY = 'quickcart_guest_cart';

function loadGuestItems(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestCartItem[]) : [];
  } catch {
    return [];
  }
}

function saveGuestItems(items: GuestCartItem[]): void {
  try {
    if (items.length === 0) {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    } else {
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // Ignore storage quota errors
  }
}

interface GuestCartState {
  items: GuestCartItem[];
  addItem: (product: Product, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

export const useGuestCartStore = create<GuestCartState>((set) => ({
  items: loadGuestItems(),

  addItem: (product: Product, quantity: number) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id);
      const maxAllowed = Math.max(1, product.stock);
      const nextItems = existing
        ? state.items.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  quantity: Math.min(maxAllowed, item.quantity + quantity),
                  availableStock: product.stock,
                  currentPrice: product.price
                }
              : item
          )
        : [
            ...state.items,
            {
              productId: product.id,
              name: product.name,
              slug: product.slug,
              sku: product.sku,
              currentPrice: product.price,
              quantity: Math.min(maxAllowed, quantity),
              availableStock: product.stock,
              image: product.images[0]?.url ?? null
            }
          ];

      saveGuestItems(nextItems);
      return { items: nextItems };
    });
  },

  updateQuantity: (productId: string, quantity: number) => {
    set((state) => {
      const nextItems =
        quantity <= 0
          ? state.items.filter((i) => i.productId !== productId)
          : state.items.map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.min(Math.max(1, i.availableStock), quantity) }
                : i
            );
      saveGuestItems(nextItems);
      return { items: nextItems };
    });
  },

  removeItem: (productId: string) => {
    set((state) => {
      const nextItems = state.items.filter((i) => i.productId !== productId);
      saveGuestItems(nextItems);
      return { items: nextItems };
    });
  },

  clear: () => {
    saveGuestItems([]);
    set({ items: [] });
  }
}));
