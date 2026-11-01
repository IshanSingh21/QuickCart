const { z } = require('zod');

const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(255),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().min(1, 'State / Province is required').max(100),
  postalCode: z.string().trim().min(1, 'Postal / ZIP code is required').max(20),
  country: z.string().trim().min(2, 'Country is required').max(100),
  phone: z.string().trim().max(30).optional().nullable()
});

const checkoutSchema = z.object({
  body: z.object({
    shippingAddress: shippingAddressSchema,
    idempotencyKey: z.string().trim().max(64).optional()
  })
});

const orderQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10).transform((val) => Math.min(val, 50)),
    status: z.enum([
      'PENDING_PAYMENT',
      'PAID',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'EXPIRED',
      'REFUNDED'
    ]).optional()
  })
});

const orderIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Order ID must be a valid UUID')
  })
});

module.exports = {
  checkoutSchema,
  orderQuerySchema,
  orderIdParamSchema,
  shippingAddressSchema
};
