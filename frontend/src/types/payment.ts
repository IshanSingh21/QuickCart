export type PaymentStatus = 'INITIATED' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

export type PaymentMethod =
  | 'SIMULATED_CARD'
  | 'SIMULATED_WALLET'
  | 'SIMULATED_BANK_TRANSFER'
  | 'SIMULATED_UPI';

export type SimulateOutcome =
  | 'SUCCESS'
  | 'CARD_DECLINED'
  | 'INSUFFICIENT_FUNDS'
  | 'GATEWAY_TIMEOUT';

export interface Payment {
  id: string;
  orderId: string;
  paymentIntentId: string;
  idempotencyKey: string;
  provider: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  gatewayResponse: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessPaymentPayload {
  paymentMethod?: PaymentMethod;
  simulateOutcome?: SimulateOutcome;
  idempotencyKey?: string;
  releaseInventoryOnFailure?: boolean;
}
