const errorHandler = require('../../src/middlewares/error-handler');
const AppError = require('../../src/utils/app-error');
const config = require('../../src/config/env');

describe('Centralized Error Handler Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      method: 'POST',
      originalUrl: '/api/v1/test'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('should handle custom AppError instances properly', () => {
    const error = AppError.notFound('User not found');
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      })
    );
  });

  it('should format Prisma P2002 unique constraint error as 409 Conflict', () => {
    const prismaError = new Error('Unique constraint failed');
    prismaError.name = 'PrismaClientKnownRequestError';
    prismaError.code = 'P2002';
    prismaError.meta = { target: 'email' };

    errorHandler(prismaError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        error: expect.objectContaining({
          code: 'CONFLICT',
          message: 'Unique constraint violation on field: email'
        })
      })
    );
  });

  it('should format Prisma P2025 record not found as 404 Not Found', () => {
    const prismaError = new Error('Record to update not found');
    prismaError.name = 'PrismaClientKnownRequestError';
    prismaError.code = 'P2025';
    prismaError.meta = { cause: 'Product was deleted' };

    errorHandler(prismaError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Product was deleted'
        })
      })
    );
  });

  it('should format Prisma P2003 foreign key violation as 409 Conflict', () => {
    const prismaError = new Error('Foreign key failed');
    prismaError.name = 'PrismaClientKnownRequestError';
    prismaError.code = 'P2003';

    errorHandler(prismaError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        error: expect.objectContaining({
          code: 'CONFLICT'
        })
      })
    );
  });

  it('should format unhandled 500 error gracefully', () => {
    const genericError = new Error('Database disk corrupted');

    errorHandler(genericError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR'
        })
      })
    );
  });
});
