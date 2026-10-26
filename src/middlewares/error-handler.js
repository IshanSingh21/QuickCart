const config = require('../config/env');
const logger = require('../config/logger');
const ApiResponse = require('../utils/api-response');
const { HttpStatus, ErrorCodes } = require('../constants/http-status');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  let code = err.code || ErrorCodes.INTERNAL_ERROR;
  let message = err.message || 'An unexpected internal server error occurred';
  let details = err.details || null;

  // Handle malformed JSON body from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = HttpStatus.BAD_REQUEST;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Invalid JSON syntax in request body';
  }

  // Handle Prisma Database Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    switch (err.code) {
      case 'P2002': // Unique constraint failed
        statusCode = HttpStatus.CONFLICT;
        code = ErrorCodes.CONFLICT;
        message = `Unique constraint violation on field: ${err.meta?.target || 'unknown'}`;
        break;
      case 'P2025': // Record not found
        statusCode = HttpStatus.NOT_FOUND;
        code = ErrorCodes.NOT_FOUND;
        message = err.meta?.cause || 'Requested record was not found';
        break;
      case 'P2003': // Foreign key constraint failed
        statusCode = HttpStatus.CONFLICT;
        code = ErrorCodes.CONFLICT;
        message = 'Foreign key constraint failed on related entity';
        break;
      default:
        statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        code = ErrorCodes.DATABASE_ERROR;
        message = config.env === 'production' ? 'Database operation failed' : err.message;
    }
  }

  // Log non-operational (500) unexpected errors
  if (statusCode >= 500) {
    logger.error(`[UnhandledException] ${req.method} ${req.originalUrl}: ${err.message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    });
  } else if (config.env !== 'test') {
    logger.warn(`[ClientError ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`, {
      code,
      details
    });
  }

  // Never leak internal error stacks in production
  if (config.env === 'production' && statusCode >= 500) {
    message = 'An unexpected internal server error occurred';
    details = null;
  }

  return ApiResponse.error(res, {
    statusCode,
    message,
    code,
    details
  });
};

module.exports = errorHandler;
