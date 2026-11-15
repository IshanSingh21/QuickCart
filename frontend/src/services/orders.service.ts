import { apiClient } from '../lib/api-client';
import { ApiResponse, Order, OrderStatus, PaginationMeta, ShippingAddress } from '../types';

export interface CheckoutRequest {
  shippingAddress: ShippingAddress;
  idempotencyKey?: string;
}

export interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
}

export const ordersService = {
  /**
   * Checkout current shopping cart to create an order
   * POST /api/v1/orders/checkout
   */
  async checkout(payload: CheckoutRequest): Promise<Order> {
    const headers: Record<string, string> = {};
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<{ order: Order }>>(
      '/orders/checkout',
      payload,
      { headers }
    );
    return response.data.data.order;
  },

  /**
   * Retrieve authenticated user's order history
   * GET /api/v1/orders
   */
  async getMyOrders(params?: OrdersQuery): Promise<{ orders: Order[]; meta?: PaginationMeta }> {
    const response = await apiClient.get<ApiResponse<Order[]>>('/orders', {
      params
    });
    return {
      orders: response.data.data,
      meta: response.data.meta
    };
  },

  /**
   * Retrieve single order details
   * GET /api/v1/orders/:id
   */
  async getOrderById(orderId: string): Promise<Order> {
    const response = await apiClient.get<ApiResponse<{ order: Order }>>(
      `/orders/${encodeURIComponent(orderId)}`
    );
    return response.data.data.order;
  },

  /**
   * Cancel an order in PENDING_PAYMENT status and restock inventory
   * PATCH /api/v1/orders/:id/cancel
   */
  async cancelOrder(orderId: string): Promise<Order> {
    const response = await apiClient.patch<ApiResponse<{ order: Order }>>(
      `/orders/${encodeURIComponent(orderId)}/cancel`
    );
    return response.data.data.order;
  }
};
