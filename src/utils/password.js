const bcrypt = require('bcrypt');
const config = require('../config/env');

/**
 * Hash a plaintext password securely using bcrypt
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} Salted hash string
 */
async function hashPassword(password) {
  return bcrypt.hash(password, config.bcrypt.saltRounds);
}

/**
 * Compare a plaintext password with a stored hash
 * @param {string} password - Plaintext password
 * @param {string} hash - Stored bcrypt hash
 * @returns {Promise<boolean>} True if match, false otherwise
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword
};
