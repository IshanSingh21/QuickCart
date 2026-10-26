const { HttpStatus, ErrorCodes } = require('../constants/http-status');

class AppError extends Error {
  /**
   * Custom Operational Error
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 500)
   * @param {string} code - Machine-readable error code (e.g. VALIDATION_ERROR)
   * @param {Array|Object} details - Additional structured error details
   */
  constructor(
    message,
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    code = ErrorCodes.INTERNAL_ERROR,
    details = null
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = ErrorCodes.VALIDATION_ERROR, details = null) {
    return new AppError(message, HttpStatus.BAD_REQUEST, code, details);
  }

  static unauthorized(message = 'Authentication required', details = null) {
    return new AppError(message, HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED, details);
  }

  static forbidden(message = 'Access denied', details = null) {
    return new AppError(message, HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN, details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new AppError(message, HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND, details);
  }

  static conflict(message, details = null) {
    return new AppError(message, HttpStatus.CONFLICT, ErrorCodes.CONFLICT, details);
  }

  static internal(message = 'Internal server error', details = null) {
    return new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR, details);
  }
}

module.exports = AppError;
