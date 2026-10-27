const jwt = require('jsonwebtoken');
const { authenticate, requireRole } = require('../../src/middlewares/auth');
const { generateAccessToken } = require('../../src/utils/token');
const config = require('../../src/config/env');
const AppError = require('../../src/utils/app-error');

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = jest.fn();
  });

  describe('authenticate', () => {
    it('should reject requests with missing Authorization header', () => {
      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with malformed Authorization format (not Bearer)', () => {
      req.headers.authorization = 'Basic dXNlcjpwYXNz';
      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should reject invalid or tampered JWT signatures', () => {
      req.headers.authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';
      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired JWT tokens', () => {
      const expiredToken = jwt.sign(
        { id: '123', email: 'test@example.com', role: 'CUSTOMER' },
        config.jwt.accessSecret,
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('TOKEN_EXPIRED');
    });

    it('should accept valid JWT and attach req.user', () => {
      const validToken = generateAccessToken({
        id: 'user-uuid-1',
        email: 'john@example.com',
        role: 'CUSTOMER'
      });
      req.headers.authorization = `Bearer ${validToken}`;

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({
        id: 'user-uuid-1',
        email: 'john@example.com',
        role: 'CUSTOMER'
      });
    });
  });

  describe('requireRole', () => {
    it('should reject if req.user is missing', () => {
      const middleware = requireRole('ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    });

    it('should reject with 403 Forbidden if user role is not allowed', () => {
      req.user = { id: 'u1', role: 'CUSTOMER' };
      const middleware = requireRole('ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('should call next() without error if user role matches permitted roles', () => {
      req.user = { id: 'u1', role: 'ADMIN' };
      const middleware = requireRole('ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow access if any of multiple roles match', () => {
      req.user = { id: 'u1', role: 'CUSTOMER' };
      const middleware = requireRole('ADMIN', 'CUSTOMER');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
