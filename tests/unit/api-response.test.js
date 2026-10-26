const ApiResponse = require('../../src/utils/api-response');
const { HttpStatus } = require('../../src/constants/http-status');

describe('ApiResponse Utility', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  it('should format a standardized success response', () => {
    const data = { id: 'test-123' };
    const meta = { total: 1 };

    ApiResponse.success(res, {
      statusCode: HttpStatus.CREATED,
      message: 'Item created',
      data,
      meta
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      statusCode: 201,
      message: 'Item created',
      data: { id: 'test-123' },
      meta: { total: 1 }
    });
  });

  it('should omit meta in success response if not provided', () => {
    ApiResponse.success(res, { data: { active: true } });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      statusCode: 200,
      message: 'Success',
      data: { active: true }
    });
  });

  it('should format a standardized error response', () => {
    ApiResponse.error(res, {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Invalid payload',
      code: 'VALIDATION_ERROR',
      details: [{ field: 'name', message: 'Required' }]
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: [{ field: 'name', message: 'Required' }]
      }
    });
  });
});
