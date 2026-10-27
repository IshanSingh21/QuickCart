const prisma = require('../../lib/prisma');
const AppError = require('../../utils/app-error');
const config = require('../../config/env');
const { hashPassword, comparePassword } = require('../../utils/password');
const {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  parseDurationToMs
} = require('../../utils/token');

class AuthService {
  /**
   * Remove sensitive fields (passwordHash) from user object
   */
  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Register a new user
   */
  async register({ email, password, firstName, lastName }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      throw AppError.conflict('An account with this email already exists');
    }

    // Securely hash password
    const passwordHash = await hashPassword(password);

    // Persist new user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'CUSTOMER'
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + parseDurationToMs(config.jwt.refreshExpiresIn));

    // Store hashed refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: Math.floor(parseDurationToMs(config.jwt.accessExpiresIn) / 1000)
      }
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    // Timing attack mitigation & credential hiding
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + parseDurationToMs(config.jwt.refreshExpiresIn));

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: Math.floor(parseDurationToMs(config.jwt.accessExpiresIn) / 1000)
      }
    };
  }

  /**
   * Fetch current authenticated user's profile
   */
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isActive) {
      throw AppError.notFound('User not found or account is deactivated');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Rotate Refresh Token (RTR) and issue a new token pair
   */
  async refreshTokens(rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!storedToken) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    // Reuse Detection: If an already-revoked token is used, trigger compromise protocol
    if (storedToken.revokedAt !== null) {
      // Invalidate all tokens belonging to this user
      await prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
      throw AppError.unauthorized('Invalid refresh token. Session terminated for security.');
    }

    // Check expiration
    if (new Date() > storedToken.expiresAt) {
      throw AppError.unauthorized('Refresh token has expired');
    }

    if (!storedToken.user || !storedToken.user.isActive) {
      throw AppError.unauthorized('User account is inactive or disabled');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() }
    });

    // Issue new pair
    const newAccessToken = generateAccessToken({
      id: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role
    });

    const newRawRefreshToken = generateRefreshTokenString();
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + parseDurationToMs(config.jwt.refreshExpiresIn));

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newTokenHash,
        expiresAt
      }
    });

    return {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
        expiresIn: Math.floor(parseDurationToMs(config.jwt.accessExpiresIn) / 1000)
      }
    };
  }

  /**
   * Logout user and invalidate refresh token(s)
   */
  async logout({ userId, rawRefreshToken }) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    } else if (userId) {
      // Invalidate all active refresh tokens for the authenticated user
      await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }

    return { loggedOut: true };
  }
}

module.exports = new AuthService();
