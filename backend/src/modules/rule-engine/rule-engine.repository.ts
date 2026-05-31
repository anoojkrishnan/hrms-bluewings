import mongoose, { Schema } from 'mongoose';
import type { RuleSet, Rule } from './rule-engine.types';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreateModel<T>(name: string, schema: Schema) {
  return (mongoose.models[name] ?? mongoose.model<T>(name, schema)) as unknown as mongoose.Model<T>;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ruleSetSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    name: { type: String, required: true },
    module: { type: String, required: true },
    ruleType: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
    deletionReason: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { collection: 'rule_sets', timestamps: true },
);
ruleSetSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
ruleSetSchema.index({ tenantId: 1, ruleType: 1, isActive: 1 });
ruleSetSchema.index({ tenantId: 1, createdAt: -1 });

const ruleSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    ruleSetId: { type: String, required: true },
    name: { type: String, required: true },
    priority: { type: Number, required: true },
    conditions: [
      {
        field: { type: String, required: true },
        operator: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
        _id: false,
      },
    ],
    action: {
      type: { type: String, required: true },
      outputField: { type: String, required: true },
      formula: { type: String, required: true },
    },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
    deletionReason: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { collection: 'rules', timestamps: true },
);
ruleSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
ruleSchema.index({ tenantId: 1, ruleSetId: 1, priority: 1 });

// ─── Models ───────────────────────────────────────────────────────────────────

const RuleSetModel = getOrCreateModel<RuleSet>('RuleSet', ruleSetSchema);
const RuleModel = getOrCreateModel<Rule>('Rule', ruleSchema);

// ─── Repository ───────────────────────────────────────────────────────────────

export class RuleEngineRepository {
  private baseFilter(tenantId: string, organizationId?: string) {
    return { tenantId, ...(organizationId && { organizationId }), deletedAt: null };
  }

  // ── RuleSet ────────────────────────────────────────────────────────────────

  async createRuleSet(data: Partial<RuleSet>): Promise<RuleSet> {
    const doc = await RuleSetModel.create(data);
    return doc as unknown as RuleSet;
  }

  async findRuleSetByPublicId(publicId: string, tenantId: string): Promise<RuleSet | null> {
    return RuleSetModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean() as unknown as RuleSet | null;
  }

  async findActiveRuleSets(ruleType: string, tenantId: string, effectiveDate: Date): Promise<RuleSet[]> {
    return RuleSetModel.find({
      ...this.baseFilter(tenantId),
      ruleType,
      isActive: true,
      effectiveFrom: { $lte: effectiveDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: effectiveDate } }],
    }).lean() as unknown as RuleSet[];
  }

  async listRuleSets(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: RuleSet[]; total: number }> {
    const filter = this.baseFilter(tenantId);
    const [data, total] = await Promise.all([
      RuleSetModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean() as unknown as RuleSet[],
      RuleSetModel.countDocuments(filter),
    ]);
    return { data, total };
  }

  async updateRuleSet(
    publicId: string,
    tenantId: string,
    data: Partial<RuleSet>,
  ): Promise<RuleSet | null> {
    return RuleSetModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean() as unknown as RuleSet | null;
  }

  // ── Rule ──────────────────────────────────────────────────────────────────

  async createRule(data: Partial<Rule>): Promise<Rule> {
    const doc = await RuleModel.create(data);
    return doc as unknown as Rule;
  }

  async findRuleByPublicId(publicId: string, tenantId: string): Promise<Rule | null> {
    return RuleModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean() as unknown as Rule | null;
  }

  async listRulesByRuleSet(ruleSetId: string, tenantId: string): Promise<Rule[]> {
    return RuleModel.find({
      ...this.baseFilter(tenantId),
      ruleSetId,
    })
      .sort({ priority: 1 })
      .lean() as unknown as Rule[];
  }

  async updateRule(publicId: string, tenantId: string, data: Partial<Rule>): Promise<Rule | null> {
    return RuleModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean() as unknown as Rule | null;
  }

  async deleteRule(publicId: string, tenantId: string, deletedBy: string): Promise<boolean> {
    const result = await RuleModel.updateOne(
      { ...this.baseFilter(tenantId), publicId },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy,
          isActive: false,
          updatedBy: deletedBy,
        },
      },
    );
    return result.modifiedCount > 0;
  }

  // ── Pagination helper (used by service) ───────────────────────────────────

  buildPaginationMeta(page: number, limit: number, total: number) {
    return buildPaginationMeta(page, limit, total);
  }
}
