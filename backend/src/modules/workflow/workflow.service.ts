import { WorkflowRepository, buildPaginationMeta } from './workflow.repository';
import type {
  Workflow,
  WorkflowInstance,
  WorkflowStep,
  WorkflowInstanceStep,
  CreateWorkflowDto,
  UpdateWorkflowDto,
} from './workflow.types';
import { WorkflowStatus, ApproverType } from './workflow.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generateWorkflowPublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationOptions } from '@/shared/utils/pagination';

export class WorkflowService {
  private readonly repo: WorkflowRepository;

  constructor() {
    this.repo = new WorkflowRepository();
  }

  // ── Workflow CRUD ─────────────────────────────────────────────────────

  async createWorkflow(dto: CreateWorkflowDto, tenantId: string, organizationId: string, actorId: string): Promise<Workflow> {
    const publicId = generateWorkflowPublicId();

    const workflow = await this.repo.createWorkflow({
      publicId,
      tenantId,
      organizationId,
      name: dto.name,
      module: dto.module,
      isActive: true,
      version: 1,
      steps: dto.steps,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'workflow',
      entityType: 'workflow',
      entityPublicId: publicId,
      newValue: { name: dto.name, module: dto.module } as unknown as Record<string, unknown>,
    });

    return workflow;
  }

  async getWorkflow(publicId: string, tenantId: string): Promise<Workflow> {
    const wf = await this.repo.findWorkflowByPublicId(publicId, tenantId);
    if (!wf) throw new AppError(404, ErrorCodes.WORKFLOW_NOT_FOUND, 'Workflow not found');
    return wf;
  }

  async updateWorkflow(publicId: string, dto: UpdateWorkflowDto, tenantId: string, actorId: string): Promise<Workflow> {
    const existing = await this.getWorkflow(publicId, tenantId);

    // Bump version if steps changed
    const stepsChanged = dto.steps !== undefined;
    const nextVersion = stepsChanged ? existing.version + 1 : existing.version;

    const updated = await this.repo.updateWorkflow(publicId, tenantId, {
      ...dto,
      version: nextVersion,
      updatedBy: actorId,
    });

    if (!updated) throw new AppError(404, ErrorCodes.WORKFLOW_NOT_FOUND, 'Workflow not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'workflow',
      entityType: 'workflow',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteWorkflow(publicId: string, tenantId: string, actorId: string): Promise<void> {
    await this.getWorkflow(publicId, tenantId);

    const deleted = await this.repo.deleteWorkflow(publicId, tenantId, actorId);
    if (!deleted) throw new AppError(404, ErrorCodes.WORKFLOW_NOT_FOUND, 'Workflow not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.SOFT_DELETE,
      module: 'workflow',
      entityType: 'workflow',
      entityPublicId: publicId,
    });
  }

  async listWorkflows(tenantId: string, page: number, limit: number): Promise<PaginatedResult<Workflow>> {
    const { data, total } = await this.repo.listWorkflows(tenantId, page, limit);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  // ── Module workflow lookup ────────────────────────────────────────────

  async findActiveWorkflowForModule(module: string, tenantId: string): Promise<Workflow | null> {
    return this.repo.findActiveWorkflowForModule(module, tenantId);
  }

  // ── Step approver resolution ──────────────────────────────────────────

  private async resolveStepApprover(
    step: WorkflowStep,
    requestedBy: string,
    tenantId: string,
  ): Promise<string | undefined> {
    switch (step.approverType) {
      case ApproverType.SPECIFIC_USER:
        return step.approverRef;

      case ApproverType.REPORTING_MANAGER: {
        // Lazy import: resolve the reporting manager of the requesting employee by userId.
        try {
          const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
          const empRepo = new EmployeeRepository();
          const employee = await empRepo.findByUserId(requestedBy, tenantId);
          return employee?.reportingManagerId ?? undefined;
        } catch {
          return undefined;
        }
      }

      case ApproverType.DEPARTMENT_HEAD: {
        // Lazy import: resolve department head of the requesting employee's department.
        try {
          const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
          const empRepo = new EmployeeRepository();
          const employee = await empRepo.findByUserId(requestedBy, tenantId);
          if (!employee?.departmentId) return undefined;

          const { OrganizationRepository } = await import('@/modules/organization/organization.repository');
          const orgRepo = new OrganizationRepository();
          const dept = await orgRepo.findDepartmentByPublicId(employee.departmentId, tenantId);
          return dept?.headEmployeeId ?? undefined;
        } catch {
          return undefined;
        }
      }

      case ApproverType.ROLE: {
        if (!step.approverRef) return undefined;
        // Lazy import: find first active user with the given role code.
        // RbacService.findRoleByCode resolves from the rbac service layer.
        try {
          const { RbacService } = await import('@/modules/rbac/rbac.service');
          const rbacSvc = new RbacService();
          const role = await rbacSvc.findRoleByCode(step.approverRef, tenantId);
          if (!role) return undefined;
          // findFirstUserWithRolePublicId is resolved via rbac service
          const userId = await rbacSvc.findFirstUserWithRolePublicId(role.publicId, tenantId);
          return userId ?? undefined;
        } catch {
          return undefined;
        }
      }

      default:
        return undefined;
    }
  }

  // ── Workflow Instances ────────────────────────────────────────────────

  async startInstance(
    module: string,
    entityType: string,
    entityPublicId: string,
    requestedBy: string,
    tenantId: string,
    organizationId: string,
  ): Promise<WorkflowInstance | null> {
    // Find active workflow for this module
    const workflow = await this.repo.findActiveWorkflowForModule(module, tenantId);
    if (!workflow || workflow.steps.length === 0) return null;

    // Check if there's already a pending instance for this entity
    const existing = await this.repo.findInstanceByEntity(entityPublicId, module, tenantId);
    if (existing) {
      throw new AppError(409, ErrorCodes.WORKFLOW_INSTANCE_EXISTS, 'A pending workflow instance already exists for this entity');
    }

    // Resolve step 0 approver
    const step0 = workflow.steps[0];
    const step0ApproverId = await this.resolveStepApprover(step0, requestedBy, tenantId);

    // Build instance steps mirroring the workflow steps, all pending initially
    const instanceSteps: WorkflowInstanceStep[] = workflow.steps.map((s) => ({
      stepIndex: s.stepIndex,
      status: 'pending' as const,
      approverId: undefined,
      actedAt: undefined,
      comment: undefined,
    }));
    // Set approver for step 0
    instanceSteps[0] = { ...instanceSteps[0], approverId: step0ApproverId };

    // Calculate SLA deadline for step 0
    const slaDeadline = step0.slaHours
      ? new Date(Date.now() + step0.slaHours * 60 * 60 * 1000)
      : undefined;

    const publicId = generateWorkflowPublicId();

    const instance = await this.repo.createInstance({
      publicId,
      tenantId,
      organizationId,
      workflowId: workflow.publicId,
      workflowVersion: workflow.version,
      module,
      entityType,
      entityPublicId,
      requestedBy,
      currentStepIndex: 0,
      status: WorkflowStatus.PENDING,
      steps: instanceSteps,
      ...(slaDeadline && { slaDeadline }),
      isActive: true,
      createdBy: requestedBy,
      updatedBy: requestedBy,
      deletedAt: null,
    });

    eventBus.emit(EVENTS.WORKFLOW_STARTED, {
      instancePublicId: publicId,
      module,
      entityType,
      entityPublicId,
      tenantId,
      approverId: step0ApproverId,
    });

    auditService.writeAsync({
      tenantId,
      actorId: requestedBy,
      action: AuditAction.CREATE,
      module: 'workflow',
      entityType: 'workflow_instance',
      entityPublicId: publicId,
      newValue: { module, entityType, entityPublicId, workflowId: workflow.publicId } as unknown as Record<string, unknown>,
    });

    return instance;
  }

  async getInstance(publicId: string, tenantId: string): Promise<WorkflowInstance> {
    const instance = await this.repo.findInstanceByPublicId(publicId, tenantId);
    if (!instance) throw new AppError(404, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'Workflow instance not found');
    return instance;
  }

  async listInstances(
    tenantId: string,
    filters: { approverId?: string; status?: WorkflowStatus; module?: string },
    query: Record<string, unknown>,
  ): Promise<PaginatedResult<WorkflowInstance>> {
    const { page, limit } = buildPaginationOptions(query);
    const { data, total } = await this.repo.listInstances(tenantId, filters, page, limit);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async getApprovalQueue(approverId: string, tenantId: string, query: Record<string, unknown>): Promise<PaginatedResult<WorkflowInstance>> {
    const { page, limit } = buildPaginationOptions(query);
    const { data, total } = await this.repo.findPendingInstancesForApprover(approverId, tenantId, page, limit);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  async approve(instancePublicId: string, actorId: string, comment: string | undefined, tenantId: string): Promise<WorkflowInstance> {
    const instance = await this.getInstance(instancePublicId, tenantId);

    if (instance.status !== WorkflowStatus.PENDING) {
      throw new AppError(400, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'Only pending workflow instances can be approved');
    }

    const currentStep = instance.steps[instance.currentStepIndex];
    if (!currentStep) {
      throw new AppError(400, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'No current step found on workflow instance');
    }

    if (currentStep.approverId !== actorId) {
      throw new AppError(403, ErrorCodes.WORKFLOW_STEP_UNAUTHORIZED, 'You are not authorized to approve this workflow step');
    }

    // Mark current step approved
    const updatedSteps = instance.steps.map((s) =>
      s.stepIndex === instance.currentStepIndex
        ? { ...s, status: 'approved' as const, actedAt: new Date(), comment }
        : s,
    );

    const isLastStep = instance.currentStepIndex >= instance.steps.length - 1;

    let updatePayload: Partial<Omit<WorkflowInstance, '_id' | 'createdAt' | 'updatedAt'>>;

    if (isLastStep) {
      // All steps done — mark instance approved
      updatePayload = {
        steps: updatedSteps,
        status: WorkflowStatus.APPROVED,
        completedAt: new Date(),
        updatedBy: actorId,
      };
    } else {
      // Advance to next step
      const nextStepIndex = instance.currentStepIndex + 1;
      const nextWorkflowStep = await this.getWorkflowStepByIndex(instance.workflowId, nextStepIndex, tenantId);

      let nextApproverId: string | undefined;
      if (nextWorkflowStep) {
        nextApproverId = await this.resolveStepApprover(nextWorkflowStep, instance.requestedBy, tenantId);
      }

      const stepsWithNextApprover = updatedSteps.map((s) =>
        s.stepIndex === nextStepIndex
          ? { ...s, approverId: nextApproverId }
          : s,
      );

      const nextSlaDeadline = nextWorkflowStep?.slaHours
        ? new Date(Date.now() + nextWorkflowStep.slaHours * 60 * 60 * 1000)
        : undefined;

      updatePayload = {
        steps: stepsWithNextApprover,
        currentStepIndex: nextStepIndex,
        ...(nextSlaDeadline !== undefined ? { slaDeadline: nextSlaDeadline } : { slaDeadline: undefined }),
        updatedBy: actorId,
      };
    }

    const updated = await this.repo.updateInstance(instancePublicId, tenantId, updatePayload);
    if (!updated) throw new AppError(404, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'Workflow instance not found');

    if (isLastStep) {
      eventBus.emit(EVENTS.WORKFLOW_APPROVED, {
        instancePublicId,
        module: instance.module,
        entityPublicId: instance.entityPublicId,
        tenantId,
      });
    }

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.APPROVE,
      module: 'workflow',
      entityType: 'workflow_instance',
      entityPublicId: instancePublicId,
      newValue: { stepIndex: instance.currentStepIndex, isLastStep } as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async reject(instancePublicId: string, actorId: string, reason: string, tenantId: string): Promise<WorkflowInstance> {
    const instance = await this.getInstance(instancePublicId, tenantId);

    if (instance.status !== WorkflowStatus.PENDING) {
      throw new AppError(400, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'Only pending workflow instances can be rejected');
    }

    const currentStep = instance.steps[instance.currentStepIndex];
    if (!currentStep) {
      throw new AppError(400, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'No current step found on workflow instance');
    }

    if (currentStep.approverId !== actorId) {
      throw new AppError(403, ErrorCodes.WORKFLOW_STEP_UNAUTHORIZED, 'You are not authorized to reject this workflow step');
    }

    const updatedSteps = instance.steps.map((s) =>
      s.stepIndex === instance.currentStepIndex
        ? { ...s, status: 'rejected' as const, actedAt: new Date(), comment: reason }
        : s,
    );

    const updated = await this.repo.updateInstance(instancePublicId, tenantId, {
      steps: updatedSteps,
      status: WorkflowStatus.REJECTED,
      completedAt: new Date(),
      updatedBy: actorId,
    });

    if (!updated) throw new AppError(404, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'Workflow instance not found');

    eventBus.emit(EVENTS.WORKFLOW_REJECTED, {
      instancePublicId,
      module: instance.module,
      entityPublicId: instance.entityPublicId,
      tenantId,
      reason,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.REJECT,
      module: 'workflow',
      entityType: 'workflow_instance',
      entityPublicId: instancePublicId,
      newValue: { reason } as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async cancel(instancePublicId: string, actorId: string, tenantId: string): Promise<WorkflowInstance> {
    const instance = await this.getInstance(instancePublicId, tenantId);

    if (instance.status !== WorkflowStatus.PENDING) {
      throw new AppError(400, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'Only pending workflow instances can be cancelled');
    }

    if (instance.requestedBy !== actorId) {
      throw new AppError(403, ErrorCodes.PERMISSION_DENIED, 'Only the requester can cancel this workflow instance');
    }

    const updated = await this.repo.updateInstance(instancePublicId, tenantId, {
      status: WorkflowStatus.CANCELLED,
      completedAt: new Date(),
      updatedBy: actorId,
    });

    if (!updated) throw new AppError(404, ErrorCodes.WORKFLOW_INSTANCE_NOT_FOUND, 'Workflow instance not found');

    eventBus.emit(EVENTS.WORKFLOW_CANCELLED, {
      instancePublicId,
      module: instance.module,
      entityPublicId: instance.entityPublicId,
      tenantId,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'workflow',
      entityType: 'workflow_instance',
      entityPublicId: instancePublicId,
      newValue: { status: WorkflowStatus.CANCELLED } as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async processEscalations(tenantId: string): Promise<void> {
    const overdueInstances = await this.repo.findPendingInstancesPastSla(tenantId);

    for (const instance of overdueInstances) {
      const currentStep = instance.steps[instance.currentStepIndex];
      const workflow = await this.repo.findWorkflowByPublicId(instance.workflowId, tenantId);
      const workflowStep = workflow?.steps.find((s) => s.stepIndex === instance.currentStepIndex);

      if (workflowStep?.autoApproveOnSla) {
        // Auto-approve: mark step approved and advance or complete
        await this.approve(instance.publicId, 'system', 'Auto-approved due to SLA timeout', tenantId).catch(() => {
          // Already handled, ignore individual failures
        });
      } else {
        // Escalate
        await this.repo.updateInstance(instance.publicId, tenantId, {
          status: WorkflowStatus.ESCALATED,
          updatedBy: 'system',
        });

        eventBus.emit(EVENTS.WORKFLOW_ESCALATED, {
          instancePublicId: instance.publicId,
          module: instance.module,
          entityPublicId: instance.entityPublicId,
          tenantId,
          approverId: currentStep?.approverId,
        });

        auditService.writeAsync({
          tenantId,
          actorId: 'system',
          action: AuditAction.UPDATE,
          module: 'workflow',
          entityType: 'workflow_instance',
          entityPublicId: instance.publicId,
          newValue: { status: WorkflowStatus.ESCALATED } as unknown as Record<string, unknown>,
        });
      }
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private async getWorkflowStepByIndex(
    workflowId: string,
    stepIndex: number,
    tenantId: string,
  ): Promise<WorkflowStep | undefined> {
    const workflow = await this.repo.findWorkflowByPublicId(workflowId, tenantId);
    return workflow?.steps.find((s) => s.stepIndex === stepIndex);
  }
}

export const workflowService = new WorkflowService();
