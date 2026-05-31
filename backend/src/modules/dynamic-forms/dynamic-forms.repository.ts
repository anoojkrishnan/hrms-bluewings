import mongoose, { Schema } from 'mongoose';
import type { DynamicForm, FormSubmission } from './dynamic-forms.types';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const fieldValidationSchema = new Schema(
  {
    min: Number,
    max: Number,
    pattern: String,
  },
  { _id: false },
);

const conditionalOnSchema = new Schema(
  {
    fieldKey: { type: String, required: true },
    operator: { type: String, enum: ['eq', 'neq'], required: true },
    value: Schema.Types.Mixed,
  },
  { _id: false },
);

const formFieldSchema = new Schema(
  {
    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'dropdown', 'checkbox', 'radio', 'file', 'textarea'],
      required: true,
    },
    required: { type: Boolean, required: true },
    order: { type: Number, required: true },
    placeholder: String,
    options: [String],
    validation: fieldValidationSchema,
    conditionalOn: conditionalOnSchema,
    visibleToRoles: [String],
  },
  { _id: false },
);

const dynamicFormSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    name: { type: String, required: true },
    module: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true },
    fields: [formFieldSchema],
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
    deletionReason: String,
    metadata: Schema.Types.Mixed,
  },
  { collection: 'dynamic_forms', timestamps: true },
);
dynamicFormSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
dynamicFormSchema.index({ tenantId: 1, module: 1 });
dynamicFormSchema.index({ tenantId: 1, createdAt: -1 });
dynamicFormSchema.index(
  { tenantId: 1, module: 1, isActive: 1 },
  { partialFilterExpression: { deletedAt: null } },
);

const formSubmissionSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    formId: { type: String, required: true },
    formVersion: { type: Number, required: true },
    entityType: { type: String, required: true },
    entityPublicId: { type: String, required: true },
    submittedBy: { type: String, required: true },
    responses: { type: Schema.Types.Mixed, required: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
    deletionReason: String,
    isActive: { type: Boolean, default: true },
    metadata: Schema.Types.Mixed,
  },
  { collection: 'form_submissions', timestamps: true },
);
formSubmissionSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
formSubmissionSchema.index({ tenantId: 1, formId: 1, createdAt: -1 });

// ─── Models ───────────────────────────────────────────────────────────────────

function getOrCreateModel<T>(name: string, schema: Schema) {
  return (mongoose.models[name] ?? mongoose.model<T>(name, schema)) as unknown as mongoose.Model<T>;
}

const DynamicFormModel = getOrCreateModel<DynamicForm>('DynamicForm', dynamicFormSchema);
const FormSubmissionModel = getOrCreateModel<FormSubmission>('FormSubmission', formSubmissionSchema);

// ─── Repository ───────────────────────────────────────────────────────────────

export class DynamicFormsRepository {
  private baseFilter(tenantId: string, organizationId?: string) {
    return { tenantId, ...(organizationId && { organizationId }), deletedAt: null };
  }

  // ── Forms ──────────────────────────────────────────────────────────────

  async createForm(data: Omit<DynamicForm, '_id' | 'createdAt' | 'updatedAt'>): Promise<DynamicForm> {
    const doc = await DynamicFormModel.create(data);
    return doc.toObject() as unknown as DynamicForm;
  }

  async findFormByPublicId(publicId: string, tenantId: string): Promise<DynamicForm | null> {
    const doc = await DynamicFormModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as DynamicForm | null;
  }

  async findActiveFormByModule(module: string, tenantId: string): Promise<DynamicForm | null> {
    const doc = await DynamicFormModel.findOne({
      ...this.baseFilter(tenantId),
      module,
      isActive: true,
    })
      .sort({ version: -1 })
      .lean();
    return doc as unknown as DynamicForm | null;
  }

  async listForms(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: DynamicForm[]; total: number }> {
    const filter = this.baseFilter(tenantId);
    const [docs, total] = await Promise.all([
      DynamicFormModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DynamicFormModel.countDocuments(filter),
    ]);
    return { data: docs as unknown as DynamicForm[], total };
  }

  async updateForm(
    publicId: string,
    tenantId: string,
    data: Partial<DynamicForm>,
  ): Promise<DynamicForm | null> {
    const doc = await DynamicFormModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as DynamicForm | null;
  }

  async deleteForm(publicId: string, tenantId: string, deletedBy: string): Promise<boolean> {
    const result = await DynamicFormModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
    return result.modifiedCount > 0;
  }

  // ── Submissions ────────────────────────────────────────────────────────

  async createSubmission(
    data: Omit<FormSubmission, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<FormSubmission> {
    const doc = await FormSubmissionModel.create(data);
    return doc.toObject() as unknown as FormSubmission;
  }

  async findSubmissionByPublicId(publicId: string, tenantId: string): Promise<FormSubmission | null> {
    const doc = await FormSubmissionModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as FormSubmission | null;
  }

  async listSubmissions(
    formId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: FormSubmission[]; total: number }> {
    const filter = { ...this.baseFilter(tenantId), formId };
    const [docs, total] = await Promise.all([
      FormSubmissionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FormSubmissionModel.countDocuments(filter),
    ]);
    return { data: docs as unknown as FormSubmission[], total };
  }
}

export { buildPaginationMeta };
