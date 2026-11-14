import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../../../services/cart.service';
import { useAuthStore } from '../../../store/auth-store';
import { useGuestCartStore } from '../../../store/guest-cart-store';
import { Cart, Product } from '../../../types';
import { formatErrorMessage } from '../../../utils/error-handler';

export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'detail'] as const
};

export interface UnifiedCartItem {
  id: string; // itemId for server cart, productId for guest cart
  itemId?: string;
  productId: string;
  name: string;
  slug: string;
  sku: string;
  currentPrice: string;
  quantity: number;
  lineTotal: string;
  availableStock: number;
  isActive: boolean;
  isAvailable: boolean;
  category: { id: string; name: string; slug: string } | null;
  image: string | null;
}

export interface UnifiedCartState {
  items: UnifiedCartItem[];
  subtotal: string;
  itemCount: number;
  distinctCount: number;
  hasUnavailableItems: boolean;
  isServerAuthoritative: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useServerCartQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery<Cart>({
    queryKey: cartKeys.detail(),
    queryFn: () => cartService.getCart(),
    enabled: isAuthenticated && Boolean(accessToken),
    staleTime: 1000 * 30
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const addGuestItem = useGuestCartStore((state) => state.addItem);

  return useMutation({
    mutationFn: async ({
      product,
      quantity = 1
    }: {
      product: Product;
      quantity?: number;
    }): Promise<{ mode: 'server'; cart: Cart } | { mode: 'guest' }> => {
      if (isAuthenticated) {
        const cart = await cartService.addItem(product.id, quantity);
        return { mode: 'server', cart };
      }

      addGuestItem(product, quantity);
      return { mode: 'guest' };
    },
    onSuccess: (result) => {
      if (result.mode === 'server') {
        queryClient.setQueryData(cartKeys.detail(), result.cart);
      }
    }
  });
}

export function useUpdateCartQuantityMutation() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const updateGuestQty = useGuestCartStore((state) => state.updateQuantity);

  return useMutation({
    mutationFn: async ({
      itemId,
      productId,
      quantity
    }: {
      itemId?: string;
      productId: string;
      quantity: number;
    }): Promise<{ mode: 'server'; cart: Cart } | { mode: 'guest' }> => {
      if (isAuthenticated) {
        if (!itemId) {
          throw new Error('Item ID is required for authenticated cart updates');
        }

        const cart =
          quantity <= 0
            ? await cartService.removeItem(itemId)
            : await cartService.updateItemQuantity(itemId, quantity);

        return { mode: 'server', cart };
      }

      updateGuestQty(productId, quantity);
      return { mode: 'guest' };
    },
    onSuccess: (result) => {
      if (result.mode === 'server') {
        queryClient.setQueryData(cartKeys.detail(), result.cart);
      }
    }
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const removeGuestItem = useGuestCartStore((state) => state.removeItem);

  return useMutation({
    mutationFn: async ({
      itemId,
      productId
    }: {
      itemId?: string;
      productId: string;
    }): Promise<{ mode: 'server'; cart: Cart } | { mode: 'guest' }> => {
      if (isAuthenticated) {
        if (!itemId) {
          throw new Error('Item ID is required for authenticated cart removal');
        }
        const cart = await cartService.removeItem(itemId);
        return { mode: 'server', cart };
      }

      removeGuestItem(productId);
      return { mode: 'guest' };
    },
    onSuccess: (result) => {
      if (result.mode === 'server') {
        queryClient.setQueryData(cartKeys.detail(), result.cart);
      }
    }
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearGuestCart = useGuestCartStore((state) => state.clear);

  return useMutation({
    mutationFn: async (): Promise<{ mode: 'server'; cart: Cart } | { mode: 'guest' }> => {
      if (isAuthenticated) {
        const cart = await cartService.clearCart();
        return { mode: 'server', cart };
      }

      clearGuestCart();
      return { mode: 'guest' };
    },
    onSuccess: (result) => {
      if (result.mode === 'server') {
        queryClient.setQueryData(cartKeys.detail(), result.cart);
      }
    }
  });
}

export interface MergeReport {
  mergedCount: number;
  failedItems: Array<{ name: string; reason: string }>;
}

export function useMergeGuestCart() {
  const queryClient = useQueryClient();
  const guestItems = useGuestCartStore((state) => state.items);
  const clearGuestCart = useGuestCartStore((state) => state.clear);

  return useMutation({
    mutationFn: async (): Promise<MergeReport> => {
      if (guestItems.length === 0) {
        return { mergedCount: 0, failedItems: [] };
      }

      const failedItems: Array<{ name: string; reason: string }> = [];
      let mergedCount = 0;

      for (const item of guestItems) {
        try {
          await cartService.addItem(item.productId, item.quantity);
          mergedCount += 1;
        } catch (err) {
          failedItems.push({
            name: item.name,
            reason: formatErrorMessage(err)
          });
        }
      }

      clearGuestCart();
      await queryClient.invalidateQueries({ queryKey: cartKeys.detail() });

      return { mergedCount, failedItems };
    }
  });
}

/**
 * Automatically merges unauthenticated guest items into the user's server cart
 * as soon as authentication session is verified.
 */
export function useAutoMergeGuestCart() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const guestItems = useGuestCartStore((state) => state.items);
  const { mutate: mergeGuestCart, isPending } = useMergeGuestCart();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && accessToken && guestItems.length > 0 && !hasAttemptedRef.current && !isPending) {
      hasAttemptedRef.current = true;
      mergeGuestCart();
    }
  }, [isAuthenticated, accessToken, guestItems.length, isPending, mergeGuestCart]);
}

/**
 * Unified Cart Data Hook:
 * Merges server-authoritative cart and guest cart into a predictable, clean shape.
 */
export function useCartData(): UnifiedCartState {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: serverCart, isLoading, isError, error, refetch } = useServerCartQuery();
  const guestItems = useGuestCartStore((state) => state.items);

  if (isAuthenticated) {
    const items: UnifiedCartItem[] = (serverCart?.items ?? []).map((item) => ({
      id: item.itemId,
      itemId: item.itemId,
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      currentPrice: item.currentPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      availableStock: item.availableStock,
      isActive: item.isActive,
      isAvailable: item.isAvailable,
      category: item.category,
      image: item.image
    }));

    const hasUnavailableItems = items.some(
      (item) => !item.isAvailable || item.availableStock < item.quantity || !item.isActive
    );

    return {
      items,
      subtotal: serverCart?.subtotal ?? '0.00',
      itemCount: serverCart?.itemCount ?? 0,
      distinctCount: serverCart?.distinctCount ?? 0,
      hasUnavailableItems,
      isServerAuthoritative: true,
      isLoading,
      isError,
      error: error as Error | null,
      refetch
    };
  }

  // Guest Cart
  const totalItemCount = guestItems.reduce((sum, item) => sum + item.quantity, 0);
  const guestSubtotalNumber = guestItems.reduce(
    (sum, item) => sum + parseFloat(item.currentPrice) * item.quantity,
    0
  );

  const items: UnifiedCartItem[] = guestItems.map((item) => {
    const isAvailable = item.availableStock >= item.quantity && item.availableStock > 0;
    const lineTotal = (parseFloat(item.currentPrice) * item.quantity).toFixed(2);

    return {
      id: item.productId,
      productId: item.productId,
      name: item.name,
      slug: item.slug,
      sku: item.sku,
      currentPrice: item.currentPrice,
      quantity: item.quantity,
      lineTotal,
      availableStock: item.availableStock,
      isActive: true,
      isAvailable,
      category: null,
      image: item.image
    };
  });

  const hasUnavailableItems = items.some(
    (item) => !item.isAvailable || item.availableStock < item.quantity
  );

  return {
    items,
    subtotal: guestSubtotalNumber.toFixed(2),
    itemCount: totalItemCount,
    distinctCount: guestItems.length,
    hasUnavailableItems,
    isServerAuthoritative: false,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => Promise.resolve()
  };
}

export function useCartItemCount(): number {
  const { itemCount } = useCartData();
  return itemCount;
}
