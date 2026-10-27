const authService = require('./auth.service');
const ApiResponse = require('../../utils/api-response');
const { HttpStatus } = require('../../constants/http-status');

class AuthController {
  async register(req, res, next) {
    try {
      const data = await authService.register(req.body);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.CREATED,
        message: 'User registered successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const data = await authService.login(req.body);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Login successful',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Current user profile fetched successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const data = await authService.refreshTokens(req.body.refreshToken);
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Tokens refreshed successfully',
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      await authService.logout({
        userId: req.user ? req.user.id : undefined,
        rawRefreshToken: req.body ? req.body.refreshToken : undefined
      });
      return ApiResponse.success(res, {
        statusCode: HttpStatus.OK,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
