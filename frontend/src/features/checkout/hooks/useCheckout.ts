import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersService, CheckoutRequest, OrdersQuery } from '../../../services/orders.service';
import { paymentsService, PayOrderResponse } from '../../../services/payments.service';
import { cartKeys } from '../../cart/hooks/useCartActions';
import { Order, ProcessPaymentPayload, Payment } from '../../../types';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (query?: OrdersQuery) => [...orderKeys.lists(), query] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  payments: (orderId: string) => [...orderKeys.detail(orderId), 'payments'] as const
};

export function useCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckoutRequest) => ordersService.checkout(payload),
    onSuccess: (order) => {
      // Server cleared the cart upon checkout - invalidate cart cache
      queryClient.setQueryData(cartKeys.detail(), {
        cartId: '',
        items: [],
        subtotal: '0.00',
        itemCount: 0,
        distinctCount: 0
      });
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    }
  });
}

export function useProcessPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      payload
    }: {
      orderId: string;
      payload: ProcessPaymentPayload;
    }): Promise<PayOrderResponse> => {
      return paymentsService.processPayment(orderId, payload);
    },
    onSuccess: (_data, variables) => {
      // Invalidate order detail and order list to reflect updated PAID status
      void queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.payments(variables.orderId) });
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    }
  });
}

export function useOrderQuery(orderId?: string) {
  return useQuery<Order>({
    queryKey: orderKeys.detail(orderId || ''),
    queryFn: () => {
      if (!orderId) throw new Error('Order ID is required');
      return ordersService.getOrderById(orderId);
    },
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const order = query.state.data;
      // Auto-poll while waiting for payment so status updates if paid in another tab/device
      return order?.status === 'PENDING_PAYMENT' ? 10000 : false;
    }
  });
}

export function useOrderPaymentsQuery(orderId?: string) {
  return useQuery<Payment[]>({
    queryKey: orderKeys.payments(orderId || ''),
    queryFn: () => {
      if (!orderId) throw new Error('Order ID is required');
      return paymentsService.getOrderPayments(orderId);
    },
    enabled: Boolean(orderId)
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersService.cancelOrder(orderId),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(orderKeys.detail(updatedOrder.id), updatedOrder);
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    }
  });
}

export function useMyOrdersQuery(query?: OrdersQuery) {
  return useQuery({
    queryKey: orderKeys.list(query),
    queryFn: () => ordersService.getMyOrders(query)
  });
}
