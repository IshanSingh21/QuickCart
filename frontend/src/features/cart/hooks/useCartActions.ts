import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../../../services/cart.service';
import { useAuthStore } from '../../../store/auth-store';
import { useGuestCartStore } from '../../../store/guest-cart-store';
import { Cart, Product } from '../../../types';

export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'detail'] as const
};

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

export function useCartItemCount(): number {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { data: serverCart } = useServerCartQuery();
  const guestItems = useGuestCartStore((state) => state.items);

  if (isAuthenticated) {
    return serverCart?.itemCount ?? 0;
  }

  return guestItems.reduce((sum, item) => sum + item.quantity, 0);
}
