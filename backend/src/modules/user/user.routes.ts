import { Router } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { validate } from '@/shared/validators/common.schemas';
import { updateProfileSchema, changePasswordSchema } from './user.validator';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';

const service = new UserService();
const controller = new UserController(service);

export const userRouter = Router();

// Admin: list users, update status
userRouter.get('/users', requireAuth, requireTenantContext, (req, res, next) => {
  void controller.listUsers(req, res, next);
});
userRouter.put('/users/:userId/status', requireAuth, requireTenantContext, (req, res, next) => {
  void controller.updateUserStatus(req, res, next);
});

// Requires requireAuth (wired in app.ts for /me routes)
userRouter.get('/me', (req, res, next) => {
  void controller.getProfile(req, res, next);
});

userRouter.patch('/me', validate(updateProfileSchema), (req, res, next) => {
  void controller.updateProfile(req, res, next);
});

userRouter.post('/me/change-password', validate(changePasswordSchema), (req, res, next) => {
  void controller.changePassword(req, res, next);
});

// Email verify (no auth required)
userRouter.get('/verify-email', (req, res, next) => {
  void controller.verifyEmail(req, res, next);
});
