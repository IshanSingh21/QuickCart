const { HttpStatus } = require('../constants/http-status');

class ApiResponse {
  /**
   * Standard Success Envelope
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable success message
   * @param {any} data - Response payload
   * @param {Object|null} meta - Pagination metadata or extra context
   */
  static success(res, { statusCode = HttpStatus.OK, message = 'Success', data = {}, meta = null } = {}) {
    const payload = {
      success: true,
      statusCode,
      message,
      data
    };

    if (meta !== null && meta !== undefined) {
      payload.meta = meta;
    }

    return res.status(statusCode).json(payload);
  }

  /**
   * Standard Error Envelope
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {string} code - Machine-readable error code
   * @param {any} details - Validation failures or contextual error info
   */
  static error(res, { statusCode = HttpStatus.INTERNAL_SERVER_ERROR, message = 'An error occurred', code = 'INTERNAL_ERROR', details = null } = {}) {
    const payload = {
      success: false,
      statusCode,
      error: {
        code,
        message
      }
    };

    if (details !== null && details !== undefined) {
      payload.error.details = details;
    }

    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
