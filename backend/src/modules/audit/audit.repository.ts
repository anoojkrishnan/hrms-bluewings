import mongoose, { Schema } from 'mongoose';
import type { AuditLogEntry } from './audit.types';
import type { PaginatedResult, PaginationQuery } from '@/shared/types/common';
import { buildPaginationOptions, buildPaginationMeta } from '@/shared/utils/pagination';

const auditLogSchema = new Schema(
  {
    tenantId: { type: String, required: true, index: true },
    organizationId: { type: String },
    actorId: { type: String, required: true },
    actorType: {
      type: String,
      enum: ['user', 'system', 'ai', 'api_client'],
      default: 'user',
    },
    action: { type: String, required: true },
    module: { type: String, required: true },
    entityType: { type: String, required: true },
    entityPublicId: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    requestId: { type: String, default: '' },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  {
    collection: 'audit_logs',
    timestamps: false,
    versionKey: false,
  },
);

auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, entityPublicId: 1 });

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const AuditLogModel = getOrCreateModel('AuditLog', auditLogSchema);

export class AuditRepository {
  async create(entry: AuditLogEntry): Promise<void> {
    await AuditLogModel.create(entry);
  }

  async findByTenant(
    tenantId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResult<AuditLogEntry>> {
    const options = buildPaginationOptions(query);
    const filter = { tenantId };

    const [data, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort(options.sort)
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    return {
      data: data as unknown as AuditLogEntry[],
      meta: buildPaginationMeta(options.page, options.limit, total),
    };
  }

  async findByEntity(tenantId: string, entityPublicId: string): Promise<AuditLogEntry[]> {
    const docs = await AuditLogModel.find({ tenantId, entityPublicId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    return docs as unknown as AuditLogEntry[];
  }
}
