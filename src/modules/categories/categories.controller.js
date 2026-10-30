const categoriesService = require('./categories.service');
const ApiResponse = require('../../utils/api-response');
const { HttpStatus } = require('../../constants/http-status');

class CategoriesController {
  async listCategories(req, res, next) {
    try {
      const tree = req.query.tree !== 'false';
      const categories = await categoriesService.listCategories({ tree });

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req, res, next) {
    try {
      const category = await categoriesService.getCategoryById(req.params.id);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Category retrieved successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const category = await categoriesService.createCategory(req.body);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.CREATED,
        message: 'Category created successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const category = await categoriesService.updateCategory(req.params.id, req.body);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const result = await categoriesService.deleteCategory(req.params.id);

      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Category deleted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoriesController();
