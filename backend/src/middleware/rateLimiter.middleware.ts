import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 1000 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth attempts' } },
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
});
