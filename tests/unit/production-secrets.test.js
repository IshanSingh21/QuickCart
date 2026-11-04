const config = require('../../src/config/env');

describe('Production Secrets & Environment Audit', () => {
  it('should not throw in non-production environments when secrets are absent or defaults', () => {
    expect(() => {
      config.validateProductionSecrets({
        NODE_ENV: 'development',
        DATABASE_URL: ''
      });
    }).not.toThrow();
  });

  it('should throw critical startup error in production if DATABASE_URL is missing', () => {
    expect(() => {
      config.validateProductionSecrets({
        NODE_ENV: 'production',
        DATABASE_URL: '',
        JWT_ACCESS_SECRET: 'a'.repeat(32),
        JWT_REFRESH_SECRET: 'b'.repeat(32)
      });
    }).toThrow(/CRITICAL STARTUP ERROR: Environment variable DATABASE_URL is required in production/);
  });

  it('should throw critical startup error in production if JWT_ACCESS_SECRET is missing', () => {
    expect(() => {
      config.validateProductionSecrets({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_ACCESS_SECRET: '',
        JWT_REFRESH_SECRET: 'b'.repeat(32)
      });
    }).toThrow(/CRITICAL STARTUP ERROR: Environment variable JWT_ACCESS_SECRET is required in production/);
  });

  it('should throw critical startup error in production if JWT secrets use insecure default dev values', () => {
    expect(() => {
      config.validateProductionSecrets({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_ACCESS_SECRET: 'quickcart_default_access_secret_for_development_only_12345',
        JWT_REFRESH_SECRET: 'b'.repeat(32)
      });
    }).toThrow(/is using an insecure default or is shorter than 32 characters in production/);
  });

  it('should throw critical startup error in production if JWT secrets are shorter than 32 characters', () => {
    expect(() => {
      config.validateProductionSecrets({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_ACCESS_SECRET: 'short_secret_under_32_chars',
        JWT_REFRESH_SECRET: 'b'.repeat(32)
      });
    }).toThrow(/is using an insecure default or is shorter than 32 characters in production/);
  });

  it('should succeed in production when strong, non-default secrets of at least 32 characters are provided', () => {
    expect(() => {
      config.validateProductionSecrets({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        JWT_ACCESS_SECRET: 'production_super_strong_jwt_access_secret_99999_xyz',
        JWT_REFRESH_SECRET: 'production_super_strong_jwt_refresh_secret_88888_abc'
      });
    }).not.toThrow();
  });
});
