import mongoose, { Schema } from 'mongoose';
import type {
  Notification,
  NotificationTemplate,
  UserNotificationPreference,
} from './notification.types';
import { NotificationChannel, NotificationStatus } from './notification.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Helper ───────────────────────────────────────────────────────────────────

function getOrCreateModel<T>(name: string, schema: Schema) {
  return (mongoose.models[name] ?? mongoose.model<T>(name, schema)) as unknown as mongoose.Model<T>;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const notificationTemplateSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    code: { type: String, required: true },
    name: { type: String, required: true },
    channels: [{ type: String, enum: Object.values(NotificationChannel) }],
    subject: String,
    bodyHtml: String,
    bodyText: { type: String, required: true },
    variables: [String],
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'notification_templates', timestamps: true },
);
notificationTemplateSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
notificationTemplateSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });

const notificationSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    recipientId: { type: String, required: true },
    channel: { type: String, enum: Object.values(NotificationChannel), required: true },
    templateCode: { type: String, required: true },
    subject: String,
    body: { type: String, required: true },
    link: String,
    status: { type: String, enum: Object.values(NotificationStatus), default: NotificationStatus.PENDING },
    readAt: Date,
    sentAt: Date,
    retryCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'notifications', timestamps: true },
);
notificationSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
notificationSchema.index({ tenantId: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, recipientId: 1, status: 1 });

const userNotificationPreferenceSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    userId: { type: String, required: true },
    disabledCodes: [String],
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
  },
  { collection: 'user_notification_preferences', timestamps: true },
);
userNotificationPreferenceSchema.index({ tenantId: 1, userId: 1 }, { unique: true });

// ─── Models ───────────────────────────────────────────────────────────────────

const NotificationTemplateModel = getOrCreateModel<NotificationTemplate>('NotificationTemplate', notificationTemplateSchema);
const NotificationModel = getOrCreateModel<Notification>('Notification', notificationSchema);
const UserNotificationPreferenceModel = getOrCreateModel<UserNotificationPreference>('UserNotificationPreference', userNotificationPreferenceSchema);

// ─── Repository ───────────────────────────────────────────────────────────────

export class NotificationRepository {
  private baseFilter(tenantId: string, organizationId?: string) {
    return { tenantId, ...(organizationId && { organizationId }), deletedAt: null };
  }

  // ── Templates ──────────────────────────────────────────────────────────

  async findTemplateByCode(code: string, tenantId: string): Promise<NotificationTemplate | null> {
    const doc = await NotificationTemplateModel.findOne({ ...this.baseFilter(tenantId), code }).lean();
    return doc as unknown as NotificationTemplate | null;
  }

  async createTemplate(data: Omit<NotificationTemplate, '_id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const doc = await NotificationTemplateModel.create(data);
    return doc.toObject() as unknown as NotificationTemplate;
  }

  async listTemplates(tenantId: string, page: number, limit: number): Promise<{ data: NotificationTemplate[]; total: number }> {
    const filter = this.baseFilter(tenantId);
    const [docs, total] = await Promise.all([
      NotificationTemplateModel.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      NotificationTemplateModel.countDocuments(filter),
    ]);
    return { data: docs as unknown as NotificationTemplate[], total };
  }

  async updateTemplate(publicId: string, tenantId: string, data: Partial<NotificationTemplate>): Promise<NotificationTemplate | null> {
    const doc = await NotificationTemplateModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as NotificationTemplate | null;
  }

  // ── Notifications ──────────────────────────────────────────────────────

  async create(data: Omit<Notification, '_id' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
    const doc = await NotificationModel.create(data);
    return doc.toObject() as unknown as Notification;
  }

  async findByRecipient(
    recipientId: string,
    tenantId: string,
    page: number,
    limit: number,
    unreadOnly?: boolean,
  ): Promise<PaginatedResult<Notification>> {
    const filter: Record<string, unknown> = { tenantId, recipientId, deletedAt: null };
    if (unreadOnly) filter.status = { $ne: NotificationStatus.READ };
    const [docs, total] = await Promise.all([
      NotificationModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      NotificationModel.countDocuments(filter),
    ]);
    return { data: docs as unknown as Notification[], meta: buildPaginationMeta(page, limit, total) };
  }

  async markRead(publicId: string, recipientId: string, tenantId: string): Promise<boolean> {
    const result = await NotificationModel.updateOne(
      { publicId, recipientId, tenantId, deletedAt: null, status: { $ne: NotificationStatus.READ } },
      { $set: { status: NotificationStatus.READ, readAt: new Date() } },
    );
    return result.modifiedCount > 0;
  }

  async markAllRead(recipientId: string, tenantId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      { recipientId, tenantId, deletedAt: null, status: { $ne: NotificationStatus.READ } },
      { $set: { status: NotificationStatus.READ, readAt: new Date() } },
    );
    return result.modifiedCount;
  }

  async countUnread(recipientId: string, tenantId: string): Promise<number> {
    return NotificationModel.countDocuments({ recipientId, tenantId, deletedAt: null, status: { $ne: NotificationStatus.READ } });
  }

  async findByPublicId(publicId: string, tenantId: string): Promise<Notification | null> {
    const doc = await NotificationModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Notification | null;
  }

  // ── Preferences ────────────────────────────────────────────────────────

  async getPreferences(userId: string, tenantId: string): Promise<UserNotificationPreference | null> {
    const doc = await UserNotificationPreferenceModel.findOne({ tenantId, userId, deletedAt: null }).lean();
    return doc as unknown as UserNotificationPreference | null;
  }

  async upsertPreferences(
    userId: string,
    tenantId: string,
    disabledCodes: string[],
    updatedBy: string,
  ): Promise<UserNotificationPreference> {
    const doc = await UserNotificationPreferenceModel.findOneAndUpdate(
      { tenantId, userId },
      {
        $set: { disabledCodes, updatedBy, updatedAt: new Date() },
        $setOnInsert: {
          publicId: `pref_${userId}_${tenantId}`,
          tenantId,
          userId,
          isActive: true,
          createdBy: updatedBy,
          deletedAt: null,
        },
      },
      { upsert: true, new: true },
    ).lean();
    return doc as unknown as UserNotificationPreference;
  }
}
