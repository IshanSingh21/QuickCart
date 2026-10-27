const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a short-lived JWT Access Token
 * @param {Object} payload - User claims { id, email, role }
 * @returns {string} Signed JWT
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role
    },
    config.jwt.accessSecret,
    {
      expiresIn: config.jwt.accessExpiresIn
    }
  );
}

/**
 * Generate a cryptographically secure random Refresh Token string
 * @returns {string} 64-character hex string
 */
function generateRefreshTokenString() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of a token for safe database persistence
 * @param {string} token
 * @returns {string} SHA-256 hex digest
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify and decode an Access Token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Convert duration string (e.g. '15m', '7d') to milliseconds
 * @param {string} duration
 * @returns {number} milliseconds
 */
function parseDurationToMs(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return value * 1000;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  verifyAccessToken,
  parseDurationToMs
};
