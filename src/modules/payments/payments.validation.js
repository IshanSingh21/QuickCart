const { z } = require('zod');

const processPaymentSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Order ID must be a valid UUID')
  }),
  body: z.object({
    paymentMethod: z
      .enum(['SIMULATED_CARD', 'SIMULATED_WALLET', 'SIMULATED_BANK_TRANSFER', 'SIMULATED_UPI'])
      .default('SIMULATED_CARD'),
    simulateOutcome: z
      .enum(['SUCCESS', 'CARD_DECLINED', 'INSUFFICIENT_FUNDS', 'GATEWAY_TIMEOUT'])
      .default('SUCCESS'),
    idempotencyKey: z.string().trim().max(64).optional(),
    releaseInventoryOnFailure: z.boolean().default(false)
  })
});

const orderIdParamSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Order ID must be a valid UUID')
  })
});

const paymentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Payment ID must be a valid UUID')
  })
});

module.exports = {
  processPaymentSchema,
  orderIdParamSchema,
  paymentIdParamSchema
};
