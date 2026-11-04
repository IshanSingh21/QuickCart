const logger = require('../../src/config/logger');

describe('Logger Sensitive Data Sanitizer (OWASP A09 Defense)', () => {
  it('should redact sensitive keys at root level', () => {
    const input = {
      email: 'customer@example.com',
      password: 'SuperSecretPassword123!',
      token: 'jwt-access-token-string',
      refreshToken: 'opaque-refresh-token-hex',
      authorization: 'Bearer eyJhbGciOi...',
      secret: 'stripe-webhook-secret',
      apiKey: 'sk_live_123456789',
      cardNumber: '4242424242424242',
      cvv: '123'
    };

    const sanitized = logger.sanitizeData(input);

    expect(sanitized.email).toBe('customer@example.com');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.refreshToken).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.secret).toBe('[REDACTED]');
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.cardNumber).toBe('[REDACTED]');
    expect(sanitized.cvv).toBe('[REDACTED]');
  });

  it('should deeply redact sensitive keys nested inside objects and arrays', () => {
    const input = {
      user: {
        id: 'u-123',
        auth: {
          passwordHash: 'argon2/bcrypt',
          newPassword: 'MyNewPassword!',
          oldPassword: 'OldPassword!'
        }
      },
      headers: {
        authorization: 'Bearer token-value',
        cookie: 'sessionId=abc; secure'
      },
      transactions: [
        { id: 'tx-1', amount: 100 },
        { id: 'tx-2', cardDetails: { creditCard: '4111111111111111', cvv: '999' } }
      ]
    };

    const sanitized = logger.sanitizeData(input);

    expect(sanitized.user.id).toBe('u-123');
    expect(sanitized.user.auth.passwordHash).toBe('[REDACTED]');
    expect(sanitized.user.auth.newPassword).toBe('[REDACTED]');
    expect(sanitized.user.auth.oldPassword).toBe('[REDACTED]');
    expect(sanitized.headers.authorization).toBe('[REDACTED]');
    expect(sanitized.headers.cookie).toBe('[REDACTED]');
    expect(sanitized.transactions[0].amount).toBe(100);
    expect(sanitized.transactions[1].cardDetails.creditCard).toBe('[REDACTED]');
    expect(sanitized.transactions[1].cardDetails.cvv).toBe('[REDACTED]');
  });

  it('should handle circular references safely without infinite recursion', () => {
    const circularObj = { name: 'Circular Test' };
    circularObj.self = circularObj;

    const sanitized = logger.sanitizeData(circularObj);
    expect(sanitized.name).toBe('Circular Test');
    expect(sanitized.self).toBe('[CIRCULAR]');
  });

  it('should handle primitives and null values gracefully', () => {
    expect(logger.sanitizeData(null)).toBeNull();
    expect(logger.sanitizeData(undefined)).toBeUndefined();
    expect(logger.sanitizeData('plain-string')).toBe('plain-string');
    expect(logger.sanitizeData(42)).toBe(42);
    expect(logger.sanitizeData(true)).toBe(true);
  });
});
