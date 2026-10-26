const AppError = require('../utils/app-error');
const { ErrorCodes } = require('../constants/http-status');

const notFoundHandler = (req, res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, ErrorCodes.NOT_FOUND));
};

module.exports = notFoundHandler;
