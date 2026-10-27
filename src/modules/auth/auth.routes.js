const { Router } = require('express');
const authController = require('./auth.controller');
const validate = require('../../middlewares/validate');
const { authenticate, requireRole } = require('../../middlewares/auth');
const { authLimiter } = require('../../middlewares/rate-limiter');
const ApiResponse = require('../../utils/api-response');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema
} = require('./auth.validation');

const router = Router();

// Public Authentication Endpoints (Rate Limited)
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register.bind(authController)
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login.bind(authController)
);

router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  authController.refreshToken.bind(authController)
);

// Protected Endpoints
router.get(
  '/me',
  authenticate,
  authController.getMe.bind(authController)
);

// Admin-Only Authorization Verification Endpoint (RBAC)
router.get(
  '/admin-check',
  authenticate,
  requireRole('ADMIN'),
  (req, res) => {
    return ApiResponse.success(res, {
      message: 'Admin authorization verified',
      data: { authorized: true, user: req.user }
    });
  }
);

router.post(
  '/logout',
  (req, res, next) => {
    if (req.headers.authorization) {
      return authenticate(req, res, next);
    }
    next();
  },
  validate(logoutSchema),
  authController.logout.bind(authController)
);

module.exports = router;
