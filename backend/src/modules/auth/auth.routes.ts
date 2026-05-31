import { Router } from 'express';
import { AuthController } from './auth.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { authLimiter, strictLimiter } from '@/middleware/rateLimiter.middleware';
import { validate } from '@/shared/validators/common.schemas';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  mfaVerifySchema,
  deleteSessionSchema,
} from './auth.validator';

const router = Router();
const controller = new AuthController();

router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/logout', requireAuth, controller.logout);
router.post('/refresh', controller.refresh);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', strictLimiter, validate(resetPasswordSchema), controller.resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);

router.post('/mfa/setup', requireAuth, controller.setupMfa);
router.post('/mfa/verify', requireAuth, strictLimiter, validate(mfaVerifySchema), controller.verifyMfa);

router.get('/me', requireAuth, controller.me);

router.get('/sessions', requireAuth, controller.getSessions);
router.delete('/sessions', requireAuth, controller.deleteAllSessions);
router.delete('/sessions/:sessionId', requireAuth, validate(deleteSessionSchema), controller.deleteSession);

export { router as authRouter };
