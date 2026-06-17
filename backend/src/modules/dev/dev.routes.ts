import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';

// Dev-only helpers for E2E testing. Never mounted in production.
export const devRouter = Router();

devRouter.post('/dev/force-verify-email', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'email required' } });
    return;
  }
  const result = await mongoose.connection.db
    .collection('users')
    .findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { emailVerifiedAt: new Date(), status: 'active' } },
      { returnDocument: 'after' },
    );
  if (!result) {
    res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'No user with that email' } });
    return;
  }
  res.json({ success: true, data: { email, verified: true } });
});

devRouter.post('/dev/force-verify-employee-ess', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'email required' } });
    return;
  }
  // Find employee by workEmail and link the user
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'No user with that email' } });
    return;
  }
  const emp = await mongoose.connection.db
    .collection('employees')
    .findOneAndUpdate(
      { workEmail: email.toLowerCase() },
      { $set: { userId: user.publicId, essEnabled: true } },
      { returnDocument: 'after' },
    );
  if (!emp) {
    res.status(404).json({ success: false, error: { code: 'EMPLOYEE_NOT_FOUND', message: 'No employee with that email' } });
    return;
  }
  res.json({ success: true, data: { email, userId: user.publicId, employeeCode: emp.employeeCode } });
});

devRouter.post('/dev/generate-password-reset-token', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ success: false, error: { code: 'MISSING_EMAIL', message: 'email required' } });
    return;
  }
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'No user with that email' } });
    return;
  }
  const jwt = await import('jsonwebtoken');
  const secret = process.env.JWT_SECRET ?? 'dev-secret';
  const token = jwt.default.sign({ userId: user.publicId, purpose: 'password_reset' }, secret, { expiresIn: '1h' });
  res.json({ success: true, data: { token, resetUrl: `/reset-password?token=${encodeURIComponent(token)}` } });
});
