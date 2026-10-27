const jwt = require('jsonwebtoken');
const {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  verifyAccessToken,
  parseDurationToMs
} = require('../../src/utils/token');

describe('Token Utility', () => {
  it('should generate a valid JWT access token containing user claims', () => {
    const payload = {
      id: 'user-uuid-123',
      email: 'user@example.com',
      role: 'CUSTOMER'
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('iat');
  });

  it('should generate a 64-character random hex refresh token string', () => {
    const token1 = generateRefreshTokenString();
    const token2 = generateRefreshTokenString();

    expect(token1).toHaveLength(64);
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);
  });

  it('should deterministically generate SHA-256 hash for database indexing', () => {
    const rawToken = 'test-refresh-token-string';
    const hash1 = hashToken(rawToken);
    const hash2 = hashToken(rawToken);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should parse duration strings to milliseconds accurately', () => {
    expect(parseDurationToMs('30s')).toBe(30000);
    expect(parseDurationToMs('15m')).toBe(900000);
    expect(parseDurationToMs('2h')).toBe(7200000);
    expect(parseDurationToMs('7d')).toBe(604800000);
    expect(parseDurationToMs('invalid')).toBe(604800000); // default
  });
});
