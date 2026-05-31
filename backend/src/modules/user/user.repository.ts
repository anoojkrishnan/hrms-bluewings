import mongoose, { Schema } from 'mongoose';
import type {
  User,
  UserTenantMembership,
  UserSession,
} from './user.types';
import { UserStatus } from './user.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationOptions, buildPaginationMeta } from '@/shared/utils/pagination';

const userSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true },
    organizationId: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: {
      first: { type: String, required: true },
      last: { type: String, required: true },
    },
    phone: { type: String },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.PENDING_VERIFICATION },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { collection: 'users', timestamps: true },
);

userSchema.index({ tenantId: 1, status: 1 });

const membershipSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    userId: { type: String, required: true },
    organizationId: { type: String, required: true },
    isDefault: { type: Boolean, default: true },
    joinedAt: { type: Date, default: () => new Date() },
    invitedBy: { type: String },
  },
  { collection: 'user_tenant_memberships', timestamps: false },
);
membershipSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: { type: String, required: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date, default: () => new Date() },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: 'user_sessions', timestamps: false },
);
sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const UserModel = getOrCreateModel('User', userSchema);
const MembershipModel = getOrCreateModel('UserTenantMembership', membershipSchema);
const SessionModel = getOrCreateModel('UserSession', sessionSchema);

export class UserRepository {
  async create(data: Omit<User, '_id'>): Promise<User> {
    const doc = await UserModel.create(data);
    return doc.toObject() as unknown as User;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase(), deletedAt: null }).lean();
    return doc as unknown as User | null;
  }

  async findByPublicId(publicId: string, tenantId?: string): Promise<User | null> {
    const filter = tenantId ? { publicId, tenantId, deletedAt: null } : { publicId, deletedAt: null };
    const doc = await UserModel.findOne(filter).lean();
    return doc as unknown as User | null;
  }

  async findAllInTenant(tenantId: string, page: number, limit: number): Promise<PaginatedResult<User>> {
    const options = buildPaginationOptions({ page, limit });
    const filter = { tenantId, deletedAt: null };
    const [data, total] = await Promise.all([
      UserModel.find(filter).sort(options.sort).skip(options.skip).limit(options.limit).lean(),
      UserModel.countDocuments(filter),
    ]);
    return { data: data as unknown as User[], meta: buildPaginationMeta(page, limit, total) };
  }

  async update(publicId: string, tenantId: string, data: Partial<User>): Promise<User | null> {
    const doc = await UserModel.findOneAndUpdate(
      { publicId, tenantId, deletedAt: null },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as User | null;
  }

  async incrementFailedAttempts(email: string): Promise<number> {
    const doc = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $inc: { failedLoginAttempts: 1 } },
      { new: true },
    );
    return (doc as unknown as { failedLoginAttempts?: number } | null)?.failedLoginAttempts ?? 1;
  }

  async lockAccount(email: string, until: Date): Promise<void> {
    await UserModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { lockedUntil: until, status: UserStatus.ACTIVE } },
    );
  }

  async resetFailedAttempts(email: string): Promise<void> {
    await UserModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { failedLoginAttempts: 0, lockedUntil: null } },
    );
  }

  async setEmailVerified(publicId: string): Promise<void> {
    await UserModel.updateOne(
      { publicId },
      { $set: { emailVerifiedAt: new Date(), status: UserStatus.ACTIVE } },
    );
  }

  async updatePassword(publicId: string, tenantId: string, passwordHash: string): Promise<void> {
    await UserModel.updateOne({ publicId, tenantId }, { $set: { passwordHash } });
  }

  async updateLastLogin(publicId: string): Promise<void> {
    await UserModel.updateOne({ publicId }, { $set: { lastLoginAt: new Date() } });
  }

  // Sessions
  async createSession(data: UserSession): Promise<UserSession> {
    const doc = await SessionModel.create(data);
    return doc.toObject() as unknown as UserSession;
  }

  async findSession(sessionId: string): Promise<UserSession | null> {
    const doc = await SessionModel.findOne({ sessionId, revokedAt: null }).lean();
    return doc as unknown as UserSession | null;
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await SessionModel.updateOne(
      { sessionId, userId },
      { $set: { revokedAt: new Date() } },
    );
  }

  async revokeAllUserSessions(userId: string, tenantId: string): Promise<void> {
    await SessionModel.updateMany(
      { userId, tenantId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async listActiveSessions(userId: string, tenantId: string): Promise<UserSession[]> {
    const docs = await SessionModel.find({
      userId,
      tenantId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastUsedAt: -1 })
      .lean();
    return docs as unknown as UserSession[];
  }

  async touchSession(sessionId: string): Promise<void> {
    await SessionModel.updateOne({ sessionId }, { $set: { lastUsedAt: new Date() } });
  }

  // Memberships
  async createMembership(data: UserTenantMembership): Promise<void> {
    await MembershipModel.create(data);
  }

  async findMembership(userId: string, tenantId: string): Promise<UserTenantMembership | null> {
    const doc = await MembershipModel.findOne({ userId, tenantId }).lean();
    return doc as unknown as UserTenantMembership | null;
  }

  async getUserTenants(userId: string): Promise<UserTenantMembership[]> {
    const docs = await MembershipModel.find({ userId }).lean();
    return docs as unknown as UserTenantMembership[];
  }
}
