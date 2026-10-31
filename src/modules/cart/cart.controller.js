const cartService = require('./cart.service');
const ApiResponse = require('../../utils/api-response');
const { HttpStatus } = require('../../constants/http-status');

class CartController {
  async getCart(req, res, next) {
    try {
      const cart = await cartService.getCart(req.user.id);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Cart retrieved successfully',
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async addItem(req, res, next) {
    try {
      const cart = await cartService.addItem(req.user.id, req.body);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Item added to cart successfully',
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async updateItemQuantity(req, res, next) {
    try {
      const cart = await cartService.updateItemQuantity(
        req.user.id,
        req.params.itemId,
        req.body.quantity
      );

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Cart item quantity updated successfully',
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req, res, next) {
    try {
      const cart = await cartService.removeItem(req.user.id, req.params.itemId);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Item removed from cart successfully',
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req, res, next) {
    try {
      const result = await cartService.clearCart(req.user.id);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Cart cleared successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CartController();
