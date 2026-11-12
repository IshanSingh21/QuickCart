import { z } from 'zod';

/**
 * Matches backend password complexity requirements in src/modules/auth/auth.validation.js
 */
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, 'Email address is required')
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z
      .string({ required_error: 'First name is required' })
      .trim()
      .min(1, 'First name is required')
      .max(100, 'First name cannot exceed 100 characters'),
    lastName: z
      .string({ required_error: 'Last name is required' })
      .trim()
      .min(1, 'Last name is required')
      .max(100, 'Last name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .min(1, 'Email address is required')
      .email('Please provide a valid email address')
      .max(255, 'Email cannot exceed 255 characters'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(
        PASSWORD_PATTERN,
        'Password must include uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z
      .string({ required_error: 'Please confirm your password' })
      .min(1, 'Please confirm your password')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export interface PasswordRequirementCheck {
  id: string;
  label: string;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirementCheck[] {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { id: 'number', label: 'One number (0-9)', met: /\d/.test(password) },
    {
      id: 'special',
      label: 'One special character (!@#$...)',
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    }
  ];
}
