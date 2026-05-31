import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(1, 'Password required'),
    totpToken: z.string().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email required'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token required'),
  }),
});

export const mfaVerifySchema = z.object({
  body: z.object({
    totpToken: z.string().length(6, 'TOTP token must be 6 digits'),
  }),
});

export const deleteSessionSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1),
  }),
});
