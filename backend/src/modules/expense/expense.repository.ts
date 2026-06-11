import mongoose, { Schema } from 'mongoose';
import type { ExpenseCategory, ExpenseClaim, ClaimStatus } from './expense.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ── Schemas ────────────────────────────────────────────────────────────────

const categorySchema = new Schema({
  publicId:         { type: String, required: true, unique: true },
  tenantId:         { type: String, required: true, index: true },
  organizationId:   { type: String },
  name:             { type: String, required: true },
  code:             { type: String, required: true },
  maxAmountPerClaim:{ type: Number },
  requiresReceipt:  { type: Boolean, default: false },
  isActive:         { type: Boolean, default: true },
  createdBy:        { type: String, required: true },
  updatedBy:        { type: String, required: true },
  deletedAt:        { type: Date, default: null },
}, { timestamps: true });
categorySchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

const claimItemSchema = new Schema({
  categoryId:   { type: String, required: true },
  description:  { type: String, required: true },
  amount:       { type: Number, required: true },
  date:         { type: Date, required: true },
  receiptS3Key: { type: String },
}, { _id: false });

const claimSchema = new Schema({
  publicId:         { type: String, required: true, unique: true },
  tenantId:         { type: String, required: true, index: true },
  organizationId:   { type: String },
  employeeId:       { type: String, required: true },
  companyId:        { type: String },
  title:            { type: String, required: true },
  items:            [claimItemSchema],
  totalAmount:      { type: Number, required: true },
  status:           { type: String, required: true, default: 'draft' },
  submittedAt:      { type: Date },
  reviewedBy:       { type: String },
  reviewedAt:       { type: Date },
  rejectionReason:  { type: String },
  notes:            { type: String },
  isActive:         { type: Boolean, default: true },
  createdBy:        { type: String, required: true },
  updatedBy:        { type: String, required: true },
  deletedAt:        { type: Date, default: null },
}, { timestamps: true });
claimSchema.index({ tenantId: 1, employeeId: 1 });
claimSchema.index({ tenantId: 1, status: 1 });

function getOrCreateModel(name: string, schema: Schema) {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

const CategoryModel = getOrCreateModel('ExpenseCategory', categorySchema);
const ClaimModel    = getOrCreateModel('ExpenseClaim', claimSchema);

// ── Repository ─────────────────────────────────────────────────────────────

export class ExpenseRepository {
  private base(tenantId: string, extra?: Record<string, unknown>) {
    return { tenantId, deletedAt: null, ...extra };
  }

  // ── Categories ──────────────────────────────────────────────────────────

  async findCategories(tenantId: string): Promise<ExpenseCategory[]> {
    const docs = await CategoryModel.find(this.base(tenantId)).sort({ name: 1 }).lean();
    return docs as unknown as ExpenseCategory[];
  }

  async findCategoryByPublicId(publicId: string, tenantId: string): Promise<ExpenseCategory | null> {
    const doc = await CategoryModel.findOne(this.base(tenantId, { publicId })).lean();
    return doc as unknown as ExpenseCategory | null;
  }

  async findCategoryByCode(code: string, tenantId: string): Promise<ExpenseCategory | null> {
    const doc = await CategoryModel.findOne(this.base(tenantId, { code })).lean();
    return doc as unknown as ExpenseCategory | null;
  }

  async createCategory(data: Omit<ExpenseCategory, '_id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseCategory> {
    const doc = await CategoryModel.create(data);
    return doc.toObject() as unknown as ExpenseCategory;
  }

  async updateCategory(publicId: string, tenantId: string, patch: Partial<ExpenseCategory>): Promise<ExpenseCategory | null> {
    const doc = await CategoryModel.findOneAndUpdate(
      this.base(tenantId, { publicId }),
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as ExpenseCategory | null;
  }

  // ── Claims ─────────────────────────────────────────────────────────────

  async findClaims(tenantId: string, filter: Record<string, unknown>, page: number, limit: number): Promise<PaginatedResult<ExpenseClaim>> {
    const query = this.base(tenantId, filter);
    const [docs, total] = await Promise.all([
      ClaimModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ClaimModel.countDocuments(query),
    ]);
    return { data: docs as unknown as ExpenseClaim[], meta: buildPaginationMeta(page, limit, total) };
  }

  async findClaimByPublicId(publicId: string, tenantId: string): Promise<ExpenseClaim | null> {
    const doc = await ClaimModel.findOne(this.base(tenantId, { publicId })).lean();
    return doc as unknown as ExpenseClaim | null;
  }

  async createClaim(data: Omit<ExpenseClaim, '_id' | 'createdAt' | 'updatedAt'>): Promise<ExpenseClaim> {
    const doc = await ClaimModel.create(data);
    return doc.toObject() as unknown as ExpenseClaim;
  }

  async updateClaim(publicId: string, tenantId: string, patch: Partial<ExpenseClaim>): Promise<ExpenseClaim | null> {
    const doc = await ClaimModel.findOneAndUpdate(
      this.base(tenantId, { publicId }),
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean();
    return doc as unknown as ExpenseClaim | null;
  }

  async updateClaimStatus(publicId: string, tenantId: string, status: ClaimStatus, patch: Partial<ExpenseClaim>): Promise<ExpenseClaim | null> {
    return this.updateClaim(publicId, tenantId, { status, ...patch });
  }
}
