const express = require('express');
const paymentsController = require('./payments.controller');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const {
  processPaymentSchema,
  orderIdParamSchema,
  paymentIdParamSchema
} = require('./payments.validation');

const router = express.Router();

// All payment operations require authentication
router.use(authenticate);

router.post(
  '/orders/:orderId/pay',
  validate(processPaymentSchema),
  paymentsController.payOrder
);

router.get(
  '/orders/:orderId',
  validate(orderIdParamSchema),
  paymentsController.getOrderPayments
);

router.get(
  '/:id',
  validate(paymentIdParamSchema),
  paymentsController.getPaymentById
);

module.exports = router;
