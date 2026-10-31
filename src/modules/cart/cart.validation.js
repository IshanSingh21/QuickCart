const { z } = require('zod');

const addToCartSchema = {
  body: z.object({
    productId: z
      .string({ required_error: 'Product ID is required' })
      .uuid('Invalid product ID format'),
    quantity: z.coerce
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(100, 'Maximum 100 units allowed per item')
      .default(1)
  })
};

const updateCartItemSchema = {
  params: z.object({
    itemId: z.string().uuid('Invalid cart item ID format')
  }),
  body: z.object({
    quantity: z.coerce
      .number({ required_error: 'Quantity is required' })
      .int('Quantity must be an integer')
      .min(1, 'Quantity must be at least 1')
      .max(100, 'Maximum 100 units allowed per item')
  })
};

const cartItemIdParamSchema = {
  params: z.object({
    itemId: z.string().uuid('Invalid cart item ID format')
  })
};

module.exports = {
  addToCartSchema,
  updateCartItemSchema,
  cartItemIdParamSchema
};
