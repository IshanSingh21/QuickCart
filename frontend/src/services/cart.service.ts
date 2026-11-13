import { apiClient } from '../lib/api-client';
import { ApiResponse, Cart } from '../types';

export const cartService = {
  /**
   * Fetch authenticated caller's cart from GET /api/v1/cart
   */
  async getCart(): Promise<Cart> {
    const response = await apiClient.get<ApiResponse<Cart>>('/cart');
    return response.data.data;
  },

  /**
   * Add item to authenticated caller's cart via POST /api/v1/cart/items
   */
  async addItem(productId: string, quantity = 1): Promise<Cart> {
    const response = await apiClient.post<ApiResponse<Cart>>('/cart/items', {
      productId,
      quantity
    });
    return response.data.data;
  },

  /**
   * Update cart item quantity via PATCH /api/v1/cart/items/:itemId
   */
  async updateItemQuantity(itemId: string, quantity: number): Promise<Cart> {
    const response = await apiClient.patch<ApiResponse<Cart>>(
      `/cart/items/${encodeURIComponent(itemId)}`,
      { quantity }
    );
    return response.data.data;
  },

  /**
   * Remove cart item via DELETE /api/v1/cart/items/:itemId
   */
  async removeItem(itemId: string): Promise<Cart> {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `/cart/items/${encodeURIComponent(itemId)}`
    );
    return response.data.data;
  }
};
