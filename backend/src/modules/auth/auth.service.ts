import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { UserService } from '@/modules/user/user.service';
import { UserStatus } from '@/modules/user/user.types';
import type { TokenPair, JwtPayload, LoginDto } from './auth.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import { emailService } from '@/shared/email/email.service';
import { invalidateCache } from '@/shared/utils/cache';

const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY ?? '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY ?? '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function parseDurationToSeconds(str: string): number {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return 900;
  }
}
const ACCESS_TOKEN_EXPIRY_SECONDS = parseDurationToSeconds(ACCESS_TOKEN_EXPIRY);

export class AuthService {
  constructor(private readonly userService: UserService) {}

  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenPair & { userId: string; tenantId: string; organizationId: string }> {
    const user = await this.userService.findByEmail(dto.email);

    // Never reveal WHY auth failed — always INVALID_CREDENTIALS
    if (!user) {
      throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid credentials');
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AppError(
        401,
        ErrorCodes.ACCOUNT_LOCKED,
        `Account is locked. Try again in ${remaining} minutes.`,
      );
    }

    // Check status
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, ErrorCodes.PERMISSION_DENIED, 'Account is suspended');
    }

    // Check email verification
    if (!user.emailVerifiedAt) {
      throw new AppError(401, ErrorCodes.EMAIL_NOT_VERIFIED, 'Please verify your email before logging in');
    }

    // Check password
    const passwordValid = await this.userService.comparePassword(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.userService.handleFailedLogin(dto.email);
      throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid credentials');
    }

    // Reset failed attempts on success
    await this.userService.resetFailedAttempts(dto.email);

    // Check MFA
    if (user.mfaEnabled) {
      if (!dto.totpToken) {
        throw new AppError(401, ErrorCodes.MFA_REQUIRED, 'MFA token required', { mfaRequired: true });
      }
      const mfaValid = await this.userService.verifyMfa(user.publicId, dto.totpToken);
      if (!mfaValid) {
        throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid MFA token');
      }
    }

    // Get tenant membership
    const { UserRepository } = await import('@/modules/user/user.repository');
    const repo = new UserRepository();
    const membership = await repo.findMembership(user.publicId, user.tenantId);
    const organizationId = membership?.organizationId ?? user.tenantId;

    // Generate tokens
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
    const sessionPayload: JwtPayload = {
      userId: user.publicId,
      tenantId: user.tenantId,
      organizationId,
      sessionId: '',
      type: 'access',
    };

    // Create session first to get sessionId
    const refreshToken = this.generateRefreshToken({
      ...sessionPayload,
      sessionId: 'temp',
      type: 'refresh',
    });
    const refreshTokenHash = this.hashToken(refreshToken);

    const session = await this.userService.createSession(
      user.publicId,
      user.tenantId,
      organizationId,
      { userAgent, ipAddress },
      refreshTokenHash,
      expiresAt,
    );

    sessionPayload.sessionId = session.sessionId;
    const accessToken = this.generateAccessToken(sessionPayload);

    // Update last login
    await this.userService.updateLastLogin(user.publicId);

    eventBus.emit(EVENTS.USER_LOGIN, {
      userId: user.publicId,
      tenantId: user.tenantId,
      ipAddress,
    });

    auditService.writeAsync({
      tenantId: user.tenantId,
      actorId: user.publicId,
      action: AuditAction.LOGIN,
      module: 'auth',
      entityType: 'user',
      entityPublicId: user.publicId,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      userId: user.publicId,
      tenantId: user.tenantId,
      organizationId,
    };
  }

  async logout(sessionId: string, userId: string, tenantId: string, ipAddress: string, userAgent: string): Promise<void> {
    await this.userService.revokeSession(sessionId, userId);

    // Purge auth caches so revoked session is not served from Redis
    void invalidateCache(`session:${sessionId}`, `user:${userId}`, `emp:${userId}:${tenantId}`);

    eventBus.emit(EVENTS.USER_LOGOUT, { userId, tenantId });

    auditService.writeAsync({
      tenantId,
      actorId: userId,
      action: AuditAction.LOGOUT,
      module: 'auth',
      entityType: 'user',
      entityPublicId: userId,
      ipAddress,
      userAgent,
    });
  }

  async refresh(
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET ?? '',
      ) as JwtPayload;
    } catch {
      throw new AppError(401, ErrorCodes.INVALID_TOKEN, 'Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new AppError(401, ErrorCodes.INVALID_TOKEN, 'Invalid token type');
    }

    const session = await this.userService.findSession(payload.sessionId);
    if (!session) {
      throw new AppError(401, ErrorCodes.SESSION_NOT_FOUND, 'Session not found');
    }

    const tokenHash = this.hashToken(refreshToken);
    if (session.refreshTokenHash !== tokenHash) {
      throw new AppError(401, ErrorCodes.INVALID_TOKEN, 'Token mismatch');
    }

    // Rotate: revoke old, issue new
    await this.userService.revokeSession(payload.sessionId, payload.userId);

    const newRefreshToken = this.generateRefreshToken({ ...payload, type: 'refresh' });
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    const newSession = await this.userService.createSession(
      payload.userId,
      payload.tenantId,
      payload.organizationId,
      { userAgent, ipAddress },
      newRefreshTokenHash,
      expiresAt,
    );

    const newAccessToken = this.generateAccessToken({
      ...payload,
      sessionId: newSession.sessionId,
      type: 'access',
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    // Always return without error to avoid email enumeration
    if (!user) return;
    const token = this.userService.generatePasswordResetToken(user.publicId);
    void emailService.sendPasswordResetEmail(email, user.name.first, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: { userId: string; purpose: string };
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as typeof payload;
    } catch {
      throw new AppError(400, ErrorCodes.INVALID_TOKEN, 'Invalid or expired reset token');
    }

    if (payload.purpose !== 'password_reset') {
      throw new AppError(400, ErrorCodes.INVALID_TOKEN, 'Invalid token purpose');
    }

    const { UserRepository } = await import('@/modules/user/user.repository');
    const repo = new UserRepository();
    const user = await repo.findByPublicId(payload.userId);
    if (!user) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');

    const newHash = await this.userService.hashPassword(newPassword);
    await repo.updatePassword(payload.userId, user.tenantId, newHash);
    await this.userService.revokeAllSessions(payload.userId, user.tenantId);
  }

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      process.env.JWT_SECRET ?? '',
      { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions,
    );
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      process.env.REFRESH_TOKEN_SECRET ?? '',
      { expiresIn: REFRESH_TOKEN_EXPIRY } as jwt.SignOptions,
    );
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET ?? '') as JwtPayload;
  }

  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET ?? '') as JwtPayload;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
