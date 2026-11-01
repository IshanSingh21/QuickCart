const orderService = require('./orders.service');
const ApiResponse = require('../../utils/api-response');
const { HttpStatus } = require('../../constants/http-status');

class OrdersController {
  /**
   * Checkout current shopping cart
   * POST /api/v1/orders/checkout
   */
  async checkout(req, res, next) {
    try {
      const idempotencyKey =
        req.headers['idempotency-key'] ||
        req.headers['x-idempotency-key'] ||
        req.body.idempotencyKey ||
        null;

      const { shippingAddress } = req.body;

      const result = await orderService.checkout(req.user.id, {
        shippingAddress,
        idempotencyKey
      });

      const statusCode = result.isExisting ? HttpStatus.OK : HttpStatus.CREATED;
      const message = result.isExisting
        ? 'Existing order returned for idempotency key'
        : 'Order created successfully. Complete payment within 15 minutes.';

      return ApiResponse.success(res, {
        statusCode,
        message,
        data: { order: result.order }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List authenticated user's order history
   * GET /api/v1/orders
   */
  async getMyOrders(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await orderService.getUserOrders(req.user.id, { page, limit, status });

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Order history retrieved successfully',
        data: result.orders,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieve single order detail
   * GET /api/v1/orders/:id
   */
  async getOrderById(req, res, next) {
    try {
      const order = await orderService.getOrderById(req.user.id, req.params.id, req.user.role);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Order retrieved successfully',
        data: { order }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel PENDING_PAYMENT order and restock inventory
   * PATCH /api/v1/orders/:id/cancel
   */
  async cancelOrder(req, res, next) {
    try {
      const order = await orderService.cancelOrder(req.user.id, req.params.id, req.user.role);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Order cancelled and inventory restocked successfully',
        data: { order }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrdersController();
