import mongoose, { Schema } from 'mongoose';
import type { ReportJob } from './reports.types';

const reportJobSchema = new Schema({
  publicId:      { type: String, required: true, unique: true },
  tenantId:      { type: String, required: true, index: true },
  organizationId: String,
  templateKey:   { type: String, required: true },
  params:        { type: Schema.Types.Mixed, default: {} },
  status:        { type: String, required: true, default: 'queued' },
  rowCount:      Number,
  errorMessage:  String,
  requestedBy:   { type: String, required: true },
  isActive:      { type: Boolean, default: true },
  createdBy:     String,
  updatedBy:     String,
  deletedAt:     { type: Date, default: null },
  completedAt:   Date,
}, { collection: 'report_jobs', timestamps: true });
reportJobSchema.index({ tenantId: 1, requestedBy: 1, createdAt: -1 });

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}
const ReportJobModel = getOrCreateModel('ReportJob', reportJobSchema);

export class ReportsRepository {
  private base(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  async createJob(data: Omit<ReportJob, '_id' | 'createdAt'>): Promise<ReportJob> {
    const doc = await ReportJobModel.create(data);
    return doc.toObject() as unknown as ReportJob;
  }

  async findJobByPublicId(publicId: string, tenantId: string): Promise<ReportJob | null> {
    const doc = await ReportJobModel.findOne({ ...this.base(tenantId), publicId }).lean();
    return doc as unknown as ReportJob | null;
  }

  async listJobs(tenantId: string, requestedBy?: string): Promise<ReportJob[]> {
    const query = requestedBy
      ? { ...this.base(tenantId), requestedBy }
      : this.base(tenantId);
    const docs = await ReportJobModel.find(query).sort({ createdAt: -1 }).limit(50).lean();
    return docs as unknown as ReportJob[];
  }

  async updateJob(publicId: string, tenantId: string, patch: Partial<ReportJob>): Promise<ReportJob | null> {
    const doc = await ReportJobModel.findOneAndUpdate(
      { ...this.base(tenantId), publicId },
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as ReportJob | null;
  }
}
