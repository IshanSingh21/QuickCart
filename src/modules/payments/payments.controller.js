const paymentService = require('./payments.service');
const ApiResponse = require('../../utils/api-response');
const { HttpStatus } = require('../../constants/http-status');

class PaymentsController {
  /**
   * Process a simulated payment for an order
   * POST /api/v1/payments/orders/:orderId/pay
   */
  async payOrder(req, res, next) {
    try {
      const idempotencyKey =
        req.headers['idempotency-key'] ||
        req.headers['x-idempotency-key'] ||
        req.body.idempotencyKey ||
        null;

      const { paymentMethod, simulateOutcome, releaseInventoryOnFailure } = req.body;

      const result = await paymentService.processPayment(
        req.user.id,
        req.params.orderId,
        {
          paymentMethod,
          simulateOutcome,
          idempotencyKey,
          releaseInventoryOnFailure
        },
        req.user.role
      );

      const message = result.isIdempotentReplay
        ? 'Existing payment record returned for idempotency key'
        : 'Payment processed successfully. Order is marked as PAID.';

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message,
        data: {
          payment: result.payment,
          orderStatus: result.orderStatus,
          isIdempotentReplay: result.isIdempotentReplay
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all payment attempts for an order
   * GET /api/v1/payments/orders/:orderId
   */
  async getOrderPayments(req, res, next) {
    try {
      const payments = await paymentService.getOrderPayments(
        req.user.id,
        req.params.orderId,
        req.user.role
      );

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Order payments retrieved successfully',
        data: payments
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieve single payment by ID
   * GET /api/v1/payments/:id
   */
  async getPaymentById(req, res, next) {
    try {
      const payment = await paymentService.getPaymentById(
        req.user.id,
        req.params.id,
        req.user.role
      );

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Payment record retrieved successfully',
        data: { payment }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentsController();
