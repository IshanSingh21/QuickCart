const jwt = require('jsonwebtoken');
const AppError = require('../utils/app-error');
const { verifyAccessToken } = require('../utils/token');
const { ErrorCodes } = require('../constants/http-status');

/**
 * Middleware to authenticate requests via Bearer JWT Access Token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      AppError.unauthorized('Authentication token missing or invalid', ErrorCodes.UNAUTHORIZED)
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(AppError.unauthorized('Access token has expired', ErrorCodes.TOKEN_EXPIRED));
    }
    if (err instanceof jwt.JsonWebTokenError || err instanceof SyntaxError) {
      return next(AppError.unauthorized('Invalid access token', ErrorCodes.INVALID_TOKEN));
    }
    return next(AppError.unauthorized('Authentication failed', ErrorCodes.UNAUTHORIZED));
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 * @param  {...string} roles - Permitted roles (e.g. 'ADMIN', 'CUSTOMER')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required', ErrorCodes.UNAUTHORIZED));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(
        AppError.forbidden('You do not have permission to perform this action', ErrorCodes.FORBIDDEN)
      );
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
