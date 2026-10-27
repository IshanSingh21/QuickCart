jest.mock('../../src/lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn()
  }
}));

const prisma = require('../../src/lib/prisma');
const authService = require('../../src/modules/auth/auth.service');
const { hashPassword } = require('../../src/utils/password');
const AppError = require('../../src/utils/app-error');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user and return tokens and sanitized user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'user-uuid-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );
      prisma.refreshToken.create.mockResolvedValue({ id: 'token-uuid-1' });

      const result = await authService.register({
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe'
      });

      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.firstName).toBe('Jane');
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it('should throw 409 Conflict if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'taken@example.com' });

      await expect(
        authService.register({
          email: 'taken@example.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Doe'
        })
      ).rejects.toThrow(AppError);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials and return tokens', async () => {
      const password = 'CorrectPassword123!';
      const passwordHash = await hashPassword(password);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-2',
        email: 'valid@example.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Smith',
        role: 'CUSTOMER',
        isActive: true
      });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await authService.login({
        email: 'valid@example.com',
        password
      });

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user.id).toBe('user-uuid-2');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should throw 401 Unauthorized if email is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'notfound@example.com',
          password: 'Password123!'
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw 401 Unauthorized if password does not match', async () => {
      const passwordHash = await hashPassword('ActualPassword123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'u3',
        email: 'test@example.com',
        passwordHash,
        isActive: true
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw 401 Unauthorized if account is inactive', async () => {
      const password = 'Password123!';
      const passwordHash = await hashPassword(password);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u4',
        email: 'inactive@example.com',
        passwordHash,
        isActive: false
      });

      await expect(
        authService.login({
          email: 'inactive@example.com',
          password
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('getCurrentUser', () => {
    it('should return sanitized user profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u5',
        email: 'me@example.com',
        passwordHash: 'secret-hash',
        firstName: 'Profile',
        lastName: 'User',
        role: 'CUSTOMER',
        isActive: true
      });

      const user = await authService.getCurrentUser('u5');

      expect(user).not.toHaveProperty('passwordHash');
      expect(user.email).toBe('me@example.com');
    });

    it('should throw 404 Not Found if user is not found or inactive', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getCurrentUser('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('refreshTokens (RTR & Reuse Detection)', () => {
    it('should rotate tokens successfully when refresh token is valid', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'u6',
        revokedAt: null,
        expiresAt: futureDate,
        user: { id: 'u6', email: 'rotate@example.com', role: 'CUSTOMER', isActive: true }
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.refreshTokens('some-valid-raw-refresh-token');

      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ revokedAt: expect.any(Date) }) })
      );
    });

    it('should detect token reuse and revoke all sessions for the user', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'compromised-token',
        userId: 'u7',
        revokedAt: new Date(Date.now() - 60000), // already revoked!
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'u7' }
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await expect(authService.refreshTokens('reused-token')).rejects.toThrow(
        'Invalid refresh token. Session terminated for security.'
      );

      // Verify that all active tokens for this user were revoked
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u7', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) })
      });
    });

    it('should throw 401 if refresh token has expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'expired-token',
        userId: 'u8',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // in the past
        user: { id: 'u8', isActive: true }
      });

      await expect(authService.refreshTokens('expired-token-val')).rejects.toThrow('Refresh token has expired');
    });
  });

  describe('logout', () => {
    it('should revoke active tokens for user', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await authService.logout({ userId: 'u9' });
      expect(result.loggedOut).toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u9', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) })
      });
    });
  });
});
