const { z } = require('zod');
const validate = require('../../src/middlewares/validate');
const AppError = require('../../src/utils/app-error');

describe('Validation Middleware', () => {
  const schema = {
    body: z.object({
      email: z.string().email(),
      quantity: z.number().int().positive()
    })
  };

  it('should call next() without error if payload is valid', async () => {
    const req = {
      body: { email: 'user@example.com', quantity: 3 }
    };
    const res = {};
    const next = jest.fn();

    const middleware = validate(schema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should call next with AppError if validation fails', async () => {
    const req = {
      body: { email: 'invalid-email', quantity: -1 }
    };
    const res = {};
    const next = jest.fn();

    const middleware = validate(schema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toHaveLength(2);
    expect(error.details[0].field).toBe('email');
    expect(error.details[1].field).toBe('quantity');
  });
});
