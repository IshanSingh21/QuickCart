const express = require('express');
const ordersController = require('./orders.controller');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const {
  checkoutSchema,
  orderQuerySchema,
  orderIdParamSchema
} = require('./orders.validation');

const router = express.Router();

// All order endpoints require authentication
router.use(authenticate);

router.post('/checkout', validate(checkoutSchema), ordersController.checkout);
router.get('/', validate(orderQuerySchema), ordersController.getMyOrders);
router.get('/:id', validate(orderIdParamSchema), ordersController.getOrderById);
router.patch('/:id/cancel', validate(orderIdParamSchema), ordersController.cancelOrder);

module.exports = router;
