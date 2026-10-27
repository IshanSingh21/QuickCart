const { z } = require('zod');

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const registerSchema = {
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address')
      .max(255, 'Email cannot exceed 255 characters'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(
        passwordPattern,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(1, 'First name cannot be empty')
      .max(100, 'First name cannot exceed 100 characters'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(1, 'Last name cannot be empty')
      .max(100, 'Last name cannot exceed 100 characters')
  })
};

const loginSchema = {
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required')
  })
};

const refreshTokenSchema = {
  body: z.object({
    refreshToken: z
      .string({ required_error: 'Refresh token is required' })
      .min(10, 'Invalid refresh token format')
  })
};

const logoutSchema = {
  body: z.object({
    refreshToken: z.string().optional()
  })
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema
};
