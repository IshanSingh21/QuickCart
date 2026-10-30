const productsService = require('./products.service');
const ApiResponse = require('../../utils/api-response');
const { HttpStatus } = require('../../constants/http-status');

class ProductsController {
  async listProducts(req, res, next) {
    try {
      const { products, meta } = await productsService.listProducts(req.query, req.user);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Products retrieved successfully',
        data: products,
        meta
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req, res, next) {
    try {
      const product = await productsService.getProductById(req.params.id, req.user);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Product retrieved successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductBySlug(req, res, next) {
    try {
      const product = await productsService.getProductBySlug(req.params.slug, req.user);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Product retrieved successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req, res, next) {
    try {
      const product = await productsService.createProduct(req.body);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.CREATED,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const product = await productsService.updateProduct(req.params.id, req.body);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const result = await productsService.deleteProduct(req.params.id);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: result.softDeleted
          ? 'Product deactivated (soft-deleted) to preserve order history'
          : 'Product deleted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductsController();
