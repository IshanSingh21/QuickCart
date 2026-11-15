import { apiClient } from '../lib/api-client';
import { ApiResponse, Payment, ProcessPaymentPayload, OrderStatus } from '../types';

export interface PayOrderResponse {
  payment: Payment;
  orderStatus: OrderStatus;
  isIdempotentReplay: boolean;
}

export const paymentsService = {
  /**
   * Process payment for an order
   * POST /api/v1/payments/orders/:orderId/pay
   */
  async processPayment(
    orderId: string,
    payload: ProcessPaymentPayload = {}
  ): Promise<PayOrderResponse> {
    const headers: Record<string, string> = {};
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }

    const response = await apiClient.post<ApiResponse<PayOrderResponse>>(
      `/payments/orders/${encodeURIComponent(orderId)}/pay`,
      payload,
      { headers }
    );
    return response.data.data;
  },

  /**
   * List all payment attempts for an order
   * GET /api/v1/payments/orders/:orderId
   */
  async getOrderPayments(orderId: string): Promise<Payment[]> {
    const response = await apiClient.get<ApiResponse<Payment[]>>(
      `/payments/orders/${encodeURIComponent(orderId)}`
    );
    return response.data.data;
  },

  /**
   * Retrieve single payment by ID
   * GET /api/v1/payments/:id
   */
  async getPaymentById(paymentId: string): Promise<Payment> {
    const response = await apiClient.get<ApiResponse<{ payment: Payment }>>(
      `/payments/${encodeURIComponent(paymentId)}`
    );
    return response.data.data.payment;
  }
};
