const healthService = require('./health.service');
const ApiResponse = require('../../utils/api-response');
const { HttpStatus } = require('../../constants/http-status');

class HealthController {
  async checkHealth(req, res, next) {
    try {
      const health = await healthService.getHealthStatus();
      const statusCode = health.status === 'healthy' ? HttpStatus.OK : HttpStatus.OK;
      
      return ApiResponse.success(res, {
        statusCode,
        message: health.status === 'healthy' ? 'System is healthy' : 'System is degraded',
        data: health
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
