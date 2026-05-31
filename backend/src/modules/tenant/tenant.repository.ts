import mongoose, { Schema } from 'mongoose';
import type {
  Tenant,
  TenantSettings,
  TenantModule,
  TenantUsageCounters,
} from './tenant.types';
import { TenantStatus } from './tenant.types';

const tenantSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    primaryContact: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
    },
    billingContact: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    country: { type: String, required: true, default: 'IN' },
    defaultTimezone: { type: String, default: 'Asia/Kolkata' },
    defaultCurrency: { type: String, default: 'INR' },
    defaultLanguage: { type: String, default: 'en' },
    branding: {
      logoUrl: { type: String },
      primaryColor: { type: String },
      appName: { type: String },
    },
    status: { type: String, enum: Object.values(TenantStatus), default: TenantStatus.TRIAL },
    trialEndsAt: { type: Date },
    employeeLimit: { type: Number, default: 5 },
    storageLimit: { type: Number, default: 1073741824 }, // 1GB
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    deletedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { collection: 'tenants', timestamps: true },
);

tenantSchema.index({ status: 1 });

const tenantSettingsSchema = new Schema(
  {
    tenantId: { type: String, required: true, unique: true },
    financialYearStart: { type: String, enum: ['apr', 'jan'], default: 'apr' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    workingDaysPerWeek: { type: Number, default: 5 },
    makerCheckerEnabled: { type: Boolean, default: false },
    mfaRequired: { type: Boolean, default: false },
    ssoEnabled: { type: Boolean, default: false },
    ipWhitelistEnabled: { type: Boolean, default: false },
    ipWhitelist: [{ type: String }],
  },
  { collection: 'tenant_settings', timestamps: true },
);

const tenantModuleSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    moduleCode: { type: String, required: true },
    isEnabled: { type: Boolean, default: false },
    enabledAt: { type: Date },
    enabledBy: { type: String },
    disabledAt: { type: Date },
    disabledBy: { type: String },
  },
  { collection: 'tenant_modules', timestamps: false },
);
tenantModuleSchema.index({ tenantId: 1, moduleCode: 1 }, { unique: true });

const tenantUsageSchema = new Schema(
  {
    tenantId: { type: String, required: true, unique: true },
    activeEmployeeCount: { type: Number, default: 0 },
    storageUsedBytes: { type: Number, default: 0 },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { collection: 'usage_counters', timestamps: false },
);

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const TenantModel = getOrCreateModel('Tenant', tenantSchema);
const TenantSettingsModel = getOrCreateModel('TenantSettings', tenantSettingsSchema);
const TenantModuleModel = getOrCreateModel('TenantModule', tenantModuleSchema);
const TenantUsageModel = getOrCreateModel('TenantUsage', tenantUsageSchema);

export class TenantRepository {
  async findAllActive(): Promise<Tenant[]> {
    const docs = await TenantModel.find({ deletedAt: null, status: { $ne: 'archived' } }).lean();
    return docs as unknown as Tenant[];
  }

  async create(data: Omit<Tenant, '_id'>): Promise<Tenant> {
    const doc = await TenantModel.create(data);
    return doc.toObject() as unknown as Tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ slug: slug.toLowerCase(), deletedAt: null }).lean();
    return doc as unknown as Tenant | null;
  }

  async findByPublicId(publicId: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ publicId, deletedAt: null }).lean();
    return doc as unknown as Tenant | null;
  }

  async findByTenantId(tenantId: string): Promise<Tenant | null> {
    const doc = await TenantModel.findOne({ tenantId, deletedAt: null }).lean();
    return doc as unknown as Tenant | null;
  }

  async update(tenantId: string, data: Partial<Tenant>): Promise<Tenant | null> {
    const doc = await TenantModel.findOneAndUpdate(
      { tenantId, deletedAt: null },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Tenant | null;
  }

  async updateStatus(tenantId: string, status: TenantStatus): Promise<void> {
    await TenantModel.updateOne({ tenantId }, { $set: { status } });
  }

  async checkSlugAvailable(slug: string): Promise<boolean> {
    const count = await TenantModel.countDocuments({ slug: slug.toLowerCase() });
    return count === 0;
  }

  async listAll(page: number, limit: number): Promise<{ data: Tenant[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      TenantModel.find({ deletedAt: null }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TenantModel.countDocuments({ deletedAt: null }),
    ]);
    return { data: data as unknown as Tenant[], total };
  }

  // Settings
  async createSettings(settings: TenantSettings): Promise<TenantSettings> {
    const doc = await TenantSettingsModel.create(settings);
    return doc.toObject() as unknown as TenantSettings;
  }

  async getSettings(tenantId: string): Promise<TenantSettings | null> {
    const doc = await TenantSettingsModel.findOne({ tenantId }).lean();
    return doc as unknown as TenantSettings | null;
  }

  async updateSettings(tenantId: string, data: Partial<TenantSettings>): Promise<TenantSettings | null> {
    const doc = await TenantSettingsModel.findOneAndUpdate(
      { tenantId },
      { $set: { ...data, updatedAt: new Date() } },
      { new: true, upsert: true },
    ).lean();
    return doc as unknown as TenantSettings | null;
  }

  // Modules
  async createDefaultModules(tenantId: string, createdBy: string): Promise<void> {
    const defaultModules = [
      'employee', 'leave', 'attendance', 'holiday', 'reports',
    ];
    const docs = defaultModules.map((moduleCode) => ({
      tenantId,
      moduleCode,
      isEnabled: true,
      enabledAt: new Date(),
      enabledBy: createdBy,
    }));
    await TenantModuleModel.insertMany(docs);
  }

  async getModules(tenantId: string): Promise<TenantModule[]> {
    const docs = await TenantModuleModel.find({ tenantId }).lean();
    return docs as unknown as TenantModule[];
  }

  async setModuleEnabled(
    tenantId: string,
    moduleCode: string,
    enabled: boolean,
    updatedBy: string,
  ): Promise<void> {
    const now = new Date();
    await TenantModuleModel.findOneAndUpdate(
      { tenantId, moduleCode },
      {
        $set: {
          isEnabled: enabled,
          ...(enabled ? { enabledAt: now, enabledBy: updatedBy } : { disabledAt: now, disabledBy: updatedBy }),
        },
      },
      { upsert: true },
    );
  }

  // Usage counters
  async createUsageCounters(tenantId: string): Promise<void> {
    await TenantUsageModel.create({
      tenantId,
      activeEmployeeCount: 0,
      storageUsedBytes: 0,
      updatedAt: new Date(),
    });
  }

  async getUsageCounters(tenantId: string): Promise<TenantUsageCounters | null> {
    const doc = await TenantUsageModel.findOne({ tenantId }).lean();
    return doc as unknown as TenantUsageCounters | null;
  }

  async incrementUsageCounter(
    tenantId: string,
    field: keyof Pick<TenantUsageCounters, 'activeEmployeeCount' | 'storageUsedBytes'>,
    delta: number,
  ): Promise<void> {
    await TenantUsageModel.findOneAndUpdate(
      { tenantId },
      { $inc: { [field]: delta }, $set: { updatedAt: new Date() } },
      { upsert: true },
    );
  }
}
