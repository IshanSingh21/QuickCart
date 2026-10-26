const { z } = require('zod');
const AppError = require('../utils/app-error');
const { ErrorCodes } = require('../constants/http-status');

/**
 * Validates request data against Zod schemas
 * @param {Object} schemas - { body?: z.ZodSchema, query?: z.ZodSchema, params?: z.ZodSchema }
 */
const validate = (schemas) => {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          rule: err.code
        }));
        return next(AppError.badRequest('Validation failed', ErrorCodes.VALIDATION_ERROR, details));
      }
      next(error);
    }
  };
};

module.exports = validate;
