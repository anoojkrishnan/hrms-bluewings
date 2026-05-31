import mongoose, { Schema } from 'mongoose';
import type { Workflow, WorkflowInstance, WorkflowStep, WorkflowInstanceStep } from './workflow.types';
import { WorkflowStatus } from './workflow.types';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const workflowStepSchema = new Schema<WorkflowStep>(
  {
    stepIndex: { type: Number, required: true },
    name: { type: String, required: true },
    approverType: { type: String, required: true },
    approverRef: String,
    slaHours: Number,
    autoApproveOnSla: { type: Boolean, default: false },
  },
  { _id: false },
);

const workflowSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    name: { type: String, required: true },
    module: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    steps: { type: [workflowStepSchema], default: [] },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
    deletionReason: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { collection: 'workflows', timestamps: true },
);
workflowSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
workflowSchema.index({ tenantId: 1, module: 1, isActive: 1, deletedAt: 1 });

const instanceStepSchema = new Schema<WorkflowInstanceStep>(
  {
    stepIndex: { type: Number, required: true },
    approverId: String,
    status: { type: String, required: true, default: 'pending' },
    actedAt: Date,
    comment: String,
  },
  { _id: false },
);

const workflowInstanceSchema = new Schema(
  {
    publicId: { type: String, required: true },
    tenantId: { type: String, required: true },
    organizationId: String,
    workflowId: { type: String, required: true },
    workflowVersion: { type: Number, required: true },
    module: { type: String, required: true },
    entityType: { type: String, required: true },
    entityPublicId: { type: String, required: true },
    requestedBy: { type: String, required: true },
    currentStepIndex: { type: Number, default: 0 },
    status: { type: String, required: true, default: WorkflowStatus.PENDING },
    steps: { type: [instanceStepSchema], default: [] },
    slaDeadline: Date,
    completedAt: Date,
    isActive: { type: Boolean, default: true },
    createdBy: String,
    updatedBy: String,
    deletedAt: { type: Date, default: null },
    deletedBy: String,
    deletionReason: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { collection: 'workflow_instances', timestamps: true },
);
workflowInstanceSchema.index({ tenantId: 1, publicId: 1 }, { unique: true });
workflowInstanceSchema.index({ tenantId: 1, entityPublicId: 1, module: 1 });
workflowInstanceSchema.index({ tenantId: 1, status: 1 });
workflowInstanceSchema.index({ tenantId: 1, 'steps.approverId': 1, status: 1 });

// ─── Models ───────────────────────────────────────────────────────────────────

function getOrCreateModel<T>(name: string, schema: Schema) {
  return (mongoose.models[name] ?? mongoose.model<T>(name, schema)) as unknown as mongoose.Model<T>;
}

const WorkflowModel = getOrCreateModel<Workflow>('Workflow', workflowSchema);
const WorkflowInstanceModel = getOrCreateModel<WorkflowInstance>('WorkflowInstance', workflowInstanceSchema);

// ─── Repository ───────────────────────────────────────────────────────────────

export class WorkflowRepository {
  private baseFilter(tenantId: string, organizationId?: string) {
    return { tenantId, ...(organizationId && { organizationId }), deletedAt: null };
  }

  // ── Workflows ─────────────────────────────────────────────────────────

  async createWorkflow(data: Omit<Workflow, '_id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
    const doc = await WorkflowModel.create(data);
    return doc.toObject() as unknown as Workflow;
  }

  async findWorkflowByPublicId(publicId: string, tenantId: string): Promise<Workflow | null> {
    const doc = await WorkflowModel.findOne({ ...this.baseFilter(tenantId), publicId }).lean();
    return doc as unknown as Workflow | null;
  }

  async findActiveWorkflowForModule(module: string, tenantId: string): Promise<Workflow | null> {
    const doc = await WorkflowModel.findOne({
      ...this.baseFilter(tenantId),
      module,
      isActive: true,
    }).lean();
    return doc as unknown as Workflow | null;
  }

  async listWorkflows(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Workflow[]; total: number }> {
    const filter = this.baseFilter(tenantId);
    const [docs, total] = await Promise.all([
      WorkflowModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WorkflowModel.countDocuments(filter),
    ]);
    return { data: docs as unknown as Workflow[], total };
  }

  async updateWorkflow(
    publicId: string,
    tenantId: string,
    data: Partial<Omit<Workflow, '_id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Workflow | null> {
    const doc = await WorkflowModel.findOneAndUpdate(
      { ...this.baseFilter(tenantId), publicId },
      { $set: data },
      { new: true },
    ).lean();
    return doc as unknown as Workflow | null;
  }

  async deleteWorkflow(publicId: string, tenantId: string, deletedBy: string): Promise<boolean> {
    const result = await WorkflowModel.updateOne(
      { publicId, tenantId, deletedAt: null },
      { $set: { deletedAt: new Date(), deletedBy, isActive: false } },
    );
    return result.modifiedCount > 0;
  }

  // ── Workflow Instances ────────────────────────────────────────────────

  async createInstance(data: Omit<WorkflowInstance, '_id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowInstance> {
    const doc = await WorkflowInstanceModel.create(data);
    return doc.toObject() as unknown as WorkflowInstance;
  }

  async findInstanceByPublicId(publicId: string, tenantId: string): Promise<WorkflowInstance | null> {
    const doc = await WorkflowInstanceModel.findOne({ tenantId, publicId }).lean();
    return doc as unknown as WorkflowInstance | null;
  }

  async findInstanceByEntity(
    entityPublicId: string,
    module: string,
    tenantId: string,
  ): Promise<WorkflowInstance | null> {
    const doc = await WorkflowInstanceModel.findOne({
      tenantId,
      entityPublicId,
      module,
      status: WorkflowStatus.PENDING,
    }).lean();
    return doc as unknown as WorkflowInstance | null;
  }

  async listInstances(
    tenantId: string,
    filters: { approverId?: string; status?: WorkflowStatus; module?: string },
    page: number,
    limit: number,
  ): Promise<{ data: WorkflowInstance[]; total: number }> {
    const query: Record<string, unknown> = { tenantId };
    if (filters.status) query.status = filters.status;
    if (filters.module) query.module = filters.module;
    if (filters.approverId) {
      // Match instances where any step has this approver and it is the current step
      query['steps.approverId'] = filters.approverId;
    }

    const [docs, total] = await Promise.all([
      WorkflowInstanceModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WorkflowInstanceModel.countDocuments(query),
    ]);
    return { data: docs as unknown as WorkflowInstance[], total };
  }

  async findPendingInstancesForApprover(
    approverId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: WorkflowInstance[]; total: number }> {
    // Instances where status=PENDING and the current step's approverId matches
    const query = {
      tenantId,
      status: WorkflowStatus.PENDING,
      'steps.approverId': approverId,
      'steps.status': 'pending',
    };

    const [docs, total] = await Promise.all([
      WorkflowInstanceModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WorkflowInstanceModel.countDocuments(query),
    ]);
    return { data: docs as unknown as WorkflowInstance[], total };
  }

  async findPendingInstancesPastSla(tenantId: string): Promise<WorkflowInstance[]> {
    const docs = await WorkflowInstanceModel.find({
      tenantId,
      status: WorkflowStatus.PENDING,
      slaDeadline: { $lt: new Date() },
    }).lean();
    return docs as unknown as WorkflowInstance[];
  }

  async updateInstance(
    publicId: string,
    tenantId: string,
    update: Partial<Omit<WorkflowInstance, '_id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<WorkflowInstance | null> {
    const doc = await WorkflowInstanceModel.findOneAndUpdate(
      { tenantId, publicId },
      { $set: update },
      { new: true },
    ).lean();
    return doc as unknown as WorkflowInstance | null;
  }
}

export { buildPaginationMeta };
