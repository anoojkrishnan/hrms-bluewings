import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { UserRepository } from './user.repository';
import type {
  User,
  UserSession,
  RegisterDto,
  UpdateProfileDto,
  SessionMeta,
  UserDto,
  MfaSetupDto,
  SessionDto,
} from './user.types';
import { UserStatus } from './user.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generateUserPublicId, generateSessionPublicId } from '@/shared/utils/publicId';
import { encryptField, decryptField } from '@/shared/utils/crypto';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import {
  BCRYPT_ROUNDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  ACCOUNT_LOCK_MINUTES,
  EMAIL_VERIFY_TOKEN_EXPIRY,
} from '@/config/constants';
import { addMinutes } from '@/shared/utils/dates';

export class UserService {
  private readonly repo: UserRepository;

  constructor(repo?: UserRepository) {
    this.repo = repo ?? new UserRepository();
  }

  async register(
    dto: RegisterDto,
    createdBy: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<{ user: UserDto; verificationToken: string }> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new AppError(409, ErrorCodes.EMAIL_ALREADY_EXISTS, 'Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const publicId = generateUserPublicId();

    const user = await this.repo.create({
      publicId,
      tenantId: dto.tenantId,
      organizationId: dto.organizationId,
      email: dto.email.toLowerCase(),
      passwordHash,
      name: { first: dto.firstName, last: dto.lastName },
      phone: dto.phone,
      status: UserStatus.PENDING_VERIFICATION,
      mfaEnabled: false,
      failedLoginAttempts: 0,
      createdBy,
      updatedBy: createdBy,
      deletedAt: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repo.createMembership({
      tenantId: dto.tenantId,
      userId: publicId,
      organizationId: dto.organizationId,
      isDefault: true,
      joinedAt: new Date(),
    });

    const verificationToken = this.generateEmailVerifyToken(publicId, dto.tenantId);

    eventBus.emit(EVENTS.USER_REGISTERED, { userId: publicId, tenantId: dto.tenantId });

    auditService.writeAsync({
      tenantId: dto.tenantId,
      actorId: publicId,
      action: AuditAction.CREATE,
      module: 'user',
      entityType: 'user',
      entityPublicId: publicId,
      newValue: { email: dto.email },
      ipAddress,
      userAgent,
    });

    return { user: this.toDto(user), verificationToken };
  }

  async verifyEmail(token: string): Promise<void> {
    let payload: { userId: string; purpose: string };
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET ?? '') as typeof payload;
    } catch {
      throw new AppError(400, ErrorCodes.INVALID_TOKEN, 'Invalid or expired verification token');
    }

    if (payload.purpose !== 'email_verify') {
      throw new AppError(400, ErrorCodes.INVALID_TOKEN, 'Invalid token purpose');
    }

    await this.repo.setEmailVerified(payload.userId);
    eventBus.emit(EVENTS.USER_EMAIL_VERIFIED, { userId: payload.userId });
  }

  // Used by ESS invite — HR has confirmed the email, so bypass token verification
  async forceVerifyEmail(userId: string): Promise<void> {
    await this.repo.setEmailVerified(userId);
    eventBus.emit(EVENTS.USER_EMAIL_VERIFIED, { userId });
  }

  async findByPublicId(publicId: string, tenantId: string): Promise<UserDto> {
    const user = await this.repo.findByPublicId(publicId, tenantId);
    if (!user) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    return this.toDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findByEmail(email);
  }

  async updateProfile(
    publicId: string,
    tenantId: string,
    data: UpdateProfileDto,
    updatedBy: string,
    ipAddress = '',
    userAgent = '',
    requestId = '',
  ): Promise<UserDto> {
    const updateData: Partial<User> = { updatedBy };
    if (data.firstName || data.lastName) {
      const user = await this.repo.findByPublicId(publicId, tenantId);
      if (!user) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
      updateData.name = {
        first: data.firstName ?? user.name.first,
        last: data.lastName ?? user.name.last,
      };
    }
    if (data.phone !== undefined) updateData.phone = data.phone;

    const updated = await this.repo.update(publicId, tenantId, updateData);
    if (!updated) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');

    auditService.writeAsync({
      tenantId,
      actorId: updatedBy,
      action: AuditAction.UPDATE,
      module: 'user',
      entityType: 'user',
      entityPublicId: publicId,
      newValue: data as Record<string, unknown>,
      ipAddress,
      userAgent,
      requestId,
    });

    return this.toDto(updated);
  }

  async changePassword(
    publicId: string,
    tenantId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress = '',
    userAgent = '',
  ): Promise<void> {
    const user = await this.repo.findByPublicId(publicId, tenantId);
    if (!user) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError(400, ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect');

    const newHash = await this.hashPassword(newPassword);
    await this.repo.updatePassword(publicId, tenantId, newHash);

    eventBus.emit(EVENTS.USER_PASSWORD_CHANGED, { userId: publicId, tenantId });

    auditService.writeAsync({
      tenantId,
      actorId: publicId,
      action: AuditAction.PASSWORD_CHANGED,
      module: 'user',
      entityType: 'user',
      entityPublicId: publicId,
      ipAddress,
      userAgent,
    });
  }

  async setupMfa(publicId: string, tenantId: string): Promise<MfaSetupDto> {
    const user = await this.repo.findByPublicId(publicId, tenantId);
    if (!user) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');

    const totp = new OTPAuth.TOTP({
      issuer: 'HRMS',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const otpAuthUrl = totp.toString();
    const qrCodeUri = await QRCode.toDataURL(otpAuthUrl);

    const encryptedSecret = encryptField(secret);
    await this.repo.update(publicId, tenantId, {
      mfaSecret: encryptedSecret,
      updatedBy: publicId,
    });

    return { secret, qrCodeUri, otpAuthUrl };
  }

  async verifyMfa(publicId: string, token: string): Promise<boolean> {
    const user = await this.repo.findByPublicId(publicId);
    if (!user?.mfaSecret) return false;

    const secret = decryptField(user.mfaSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'HRMS',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) return false;

    if (!user.mfaEnabled) {
      await this.repo.update(publicId, user.tenantId, { mfaEnabled: true, updatedBy: publicId });
    }
    return true;
  }

  async disableMfa(publicId: string, tenantId: string, password: string): Promise<void> {
    const user = await this.repo.findByPublicId(publicId, tenantId);
    if (!user) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(400, ErrorCodes.INVALID_CREDENTIALS, 'Invalid password');

    await this.repo.update(publicId, tenantId, {
      mfaEnabled: false,
      mfaSecret: undefined,
      updatedBy: publicId,
    });
  }

  async suspendUser(publicId: string, tenantId: string, suspendedBy: string): Promise<void> {
    await this.repo.update(publicId, tenantId, {
      status: UserStatus.SUSPENDED,
      updatedBy: suspendedBy,
    });

    auditService.writeAsync({
      tenantId,
      actorId: suspendedBy,
      action: AuditAction.SUSPEND,
      module: 'user',
      entityType: 'user',
      entityPublicId: publicId,
    });
  }

  async createSession(
    userId: string,
    tenantId: string,
    organizationId: string,
    meta: SessionMeta,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<UserSession> {
    const sessionId = generateSessionPublicId();

    const session = await this.repo.createSession({
      sessionId,
      userId,
      tenantId,
      organizationId,
      refreshTokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    });

    return session;
  }

  async findSession(sessionId: string): Promise<UserSession | null> {
    return this.repo.findSession(sessionId);
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.repo.revokeSession(sessionId, userId);
  }

  async revokeAllSessions(userId: string, tenantId: string): Promise<void> {
    await this.repo.revokeAllUserSessions(userId, tenantId);
  }

  async listSessions(userId: string, tenantId: string): Promise<SessionDto[]> {
    const sessions = await this.repo.listActiveSessions(userId, tenantId);
    return sessions.map((s) => ({
      sessionId: s.sessionId,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
    }));
  }

  async handleFailedLogin(email: string): Promise<void> {
    const attempts = await this.repo.incrementFailedAttempts(email);
    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      const lockUntil = addMinutes(new Date(), ACCOUNT_LOCK_MINUTES);
      await this.repo.lockAccount(email, lockUntil);
    }
  }

  async resetFailedAttempts(email: string): Promise<void> {
    await this.repo.resetFailedAttempts(email);
  }

  async updateLastLogin(publicId: string): Promise<void> {
    await this.repo.updateLastLogin(publicId);
  }

  generateEmailVerifyToken(userId: string, _tenantId: string): string {
    return jwt.sign(
      { userId, purpose: 'email_verify' },
      process.env.JWT_SECRET ?? '',
      { expiresIn: EMAIL_VERIFY_TOKEN_EXPIRY },
    );
  }

  generatePasswordResetToken(userId: string): string {
    return jwt.sign(
      { userId, purpose: 'password_reset' },
      process.env.JWT_SECRET ?? '',
      { expiresIn: '1h' },
    );
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async listUsers(tenantId: string, page: number, limit: number) {
    const result = await this.repo.findAllInTenant(tenantId, page, limit);
    return { data: result.data.map((u) => this.toDto(u)), meta: result.meta };
  }

  async updateUserStatus(publicId: string, tenantId: string, status: UserStatus, actorId: string): Promise<UserDto> {
    const updated = await this.repo.update(publicId, tenantId, { status, updatedBy: actorId, updatedAt: new Date() });
    if (!updated) throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'user', entityType: 'user', entityPublicId: publicId, newValue: { status } as unknown as Record<string, unknown> });
    return this.toDto(updated);
  }

  toDto(user: User): UserDto {
    return {
      publicId: user.publicId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    };
  }
}

export const userService = new UserService();
