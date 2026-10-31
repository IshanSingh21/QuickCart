const { Router } = require('express');
const cartController = require('./cart.controller');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/auth');
const {
  addToCartSchema,
  updateCartItemSchema,
  cartItemIdParamSchema
} = require('./cart.validation');

const router = Router();

// All shopping cart operations require authentication
router.use(authenticate);

// View current user's cart
router.get('/', cartController.getCart.bind(cartController));

// Add item to cart
router.post('/items', validate(addToCartSchema), cartController.addItem.bind(cartController));

// Update item quantity
router.patch(
  '/items/:itemId',
  validate(updateCartItemSchema),
  cartController.updateItemQuantity.bind(cartController)
);

// Remove specific item from cart
router.delete(
  '/items/:itemId',
  validate(cartItemIdParamSchema),
  cartController.removeItem.bind(cartController)
);

// Clear entire cart
router.delete('/', cartController.clearCart.bind(cartController));

module.exports = router;
