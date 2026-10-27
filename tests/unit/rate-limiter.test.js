const { createRateLimitHandler } = require('../../src/middlewares/rate-limiter');
const AppError = require('../../src/utils/app-error');

describe('Rate Limiter Middlewares', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it('should call next with 429 AppError when rate limit is exceeded', () => {
    const handler = createRateLimitHandler('Too many attempts');
    handler(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.message).toBe('Too many attempts');
  });
});
