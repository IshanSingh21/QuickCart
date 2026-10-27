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

const request = require('supertest');
const prisma = require('../../src/lib/prisma');
const app = require('../../src/app');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken } = require('../../src/utils/token');

describe('Authentication & Authorization API (/api/v1/auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return 201 with sanitized profile and tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'new-user-uuid',
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'CUSTOMER',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      );
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-uuid-1' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'jane.doe@example.com',
          password: 'SecurePassword123!',
          firstName: 'Jane',
          lastName: 'Doe'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user.email).toBe('jane.doe@example.com');
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return 400 Bad Request when password does not meet security requirements', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
          firstName: 'Weak',
          lastName: 'Password'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
    });

    it('should return 400 Bad Request when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePassword123!',
          firstName: 'Jane',
          lastName: 'Doe'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.details.some((d) => d.field === 'email')).toBe(true);
    });

    it('should return 409 Conflict if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePassword123!',
          firstName: 'Jane',
          lastName: 'Doe'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should authenticate user and return 200 with tokens on valid credentials', async () => {
      const rawPassword = 'CorrectPassword123!';
      const passwordHash = await hashPassword(rawPassword);

      prisma.user.findUnique.mockResolvedValue({
        id: 'login-user-uuid',
        email: 'john.smith@example.com',
        passwordHash,
        firstName: 'John',
        lastName: 'Smith',
        role: 'CUSTOMER',
        isActive: true
      });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-uuid-2' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john.smith@example.com',
          password: rawPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return 401 Unauthorized when password is incorrect', async () => {
      const passwordHash = await hashPassword('CorrectPassword123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'login-user-uuid',
        email: 'john.smith@example.com',
        passwordHash,
        isActive: true
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'john.smith@example.com',
          password: 'WrongPassword456!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 Unauthorized when email does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 400 Bad Request if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'incomplete@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 200 with current user profile when valid Bearer token provided', async () => {
      const token = generateAccessToken({
        id: 'user-profile-id',
        email: 'profile@example.com',
        role: 'CUSTOMER'
      });

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-profile-id',
        email: 'profile@example.com',
        passwordHash: 'hidden-hash',
        firstName: 'Profile',
        lastName: 'User',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('profile@example.com');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 Unauthorized if Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 Unauthorized if Bearer token is invalid or tampered', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    it('should return 200 with new rotated tokens when refresh token is valid', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-id-1',
        userId: 'u-1',
        revokedAt: null,
        expiresAt: futureDate,
        user: { id: 'u-1', email: 'test@example.com', role: 'CUSTOMER', isActive: true }
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'valid-refresh-token-string-12345' });

      expect(res.status).toBe(200);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return 401 when refresh token is not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'unknown-refresh-token-12345' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid or expired refresh token');
    });

    it('should return 401 and trigger compromise protocol if token was already revoked (Reuse Detection)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-revoked',
        userId: 'u-compromised',
        revokedAt: new Date(Date.now() - 60000), // already revoked
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'u-compromised' }
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .send({ refreshToken: 'reused-stolen-token-12345' });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Session terminated for security');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-compromised', revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) })
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should return 200 on successful logout', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'refresh-token-to-logout' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out');
    });
  });

  describe('Server-Side Authorization & RBAC (/api/v1/auth/admin-check)', () => {
    it('should return 403 Forbidden when a CUSTOMER role attempts to access an ADMIN route', async () => {
      const customerToken = generateAccessToken({
        id: 'cust-1',
        email: 'customer@example.com',
        role: 'CUSTOMER'
      });

      const res = await request(app)
        .get('/api/v1/auth/admin-check')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 200 OK when an ADMIN role accesses the ADMIN route', async () => {
      const adminToken = generateAccessToken({
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN'
      });

      const res = await request(app)
        .get('/api/v1/auth/admin-check')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Admin authorization verified');
    });
  });
});
