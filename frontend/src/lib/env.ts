import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .url('VITE_API_BASE_URL must be a valid URL')
    .default('http://localhost:5000/api/v1'),
  VITE_APP_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development')
});

function validateEnv() {
  const parsed = envSchema.safeParse({
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_APP_ENV: import.meta.env.VITE_APP_ENV || (import.meta.env.DEV ? 'development' : 'production')
  });

  if (!parsed.success) {
    console.warn('⚠️ Environment variable validation warning:', parsed.error.format());
    return {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
      VITE_APP_ENV: 'development' as const
    };
  }

  return parsed.data;
}

export const env = validateEnv();
