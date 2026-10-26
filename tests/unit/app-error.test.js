const AppError = require('../../src/utils/app-error');
const { HttpStatus, ErrorCodes } = require('../../src/constants/http-status');

describe('AppError Utility', () => {
  it('should instantiate an AppError with custom properties', () => {
    const error = new AppError('Something went wrong', HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR, [{ field: 'email' }]);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual([{ field: 'email' }]);
    expect(error.isOperational).toBe(true);
  });

  it('should create a 400 Bad Request error via static factory', () => {
    const error = AppError.badRequest('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(error.isOperational).toBe(true);
  });

  it('should create a 401 Unauthorized error via static factory', () => {
    const error = AppError.unauthorized('Token expired');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
  });

  it('should create a 403 Forbidden error via static factory', () => {
    const error = AppError.forbidden();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe(ErrorCodes.FORBIDDEN);
  });

  it('should create a 404 Not Found error via static factory', () => {
    const error = AppError.notFound('Product not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(ErrorCodes.NOT_FOUND);
  });

  it('should create a 409 Conflict error via static factory', () => {
    const error = AppError.conflict('Out of stock');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe(ErrorCodes.CONFLICT);
  });

  it('should create a 500 Internal error via static factory', () => {
    const error = AppError.internal();
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
  });
});
