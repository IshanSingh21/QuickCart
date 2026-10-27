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

  static unauthorized(message = 'Authentication required', code = ErrorCodes.UNAUTHORIZED, details = null) {
    return new AppError(message, HttpStatus.UNAUTHORIZED, code, details);
  }

  static forbidden(message = 'Access denied', code = ErrorCodes.FORBIDDEN, details = null) {
    return new AppError(message, HttpStatus.FORBIDDEN, code, details);
  }

  static notFound(message = 'Resource not found', code = ErrorCodes.NOT_FOUND, details = null) {
    return new AppError(message, HttpStatus.NOT_FOUND, code, details);
  }

  static conflict(message, code = ErrorCodes.CONFLICT, details = null) {
    return new AppError(message, HttpStatus.CONFLICT, code, details);
  }

  static internal(message = 'Internal server error', details = null) {
    return new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR, details);
  }
}

module.exports = AppError;
