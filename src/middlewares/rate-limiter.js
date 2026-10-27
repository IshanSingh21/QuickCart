const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const AppError = require('../utils/app-error');
const { HttpStatus, ErrorCodes } = require('../constants/http-status');

function createRateLimitHandler(message) {
  return (req, res, next) => {
    next(
      new AppError(
        message,
        HttpStatus.TOO_MANY_REQUESTS,
        ErrorCodes.RATE_LIMIT_EXCEEDED
      )
    );
  };
}

const authLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'test' && !process.env.TEST_RATE_LIMIT,
  handler: createRateLimitHandler('Too many authentication attempts. Please try again later.')
});

const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === 'test',
  handler: createRateLimitHandler('Too many requests. Please slow down.')
});

module.exports = {
  authLimiter,
  generalLimiter,
  createRateLimitHandler
};
