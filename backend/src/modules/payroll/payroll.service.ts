import { Queue } from 'bullmq';
import { PayrollRepository } from './payroll.repository';
import { PayrollCalculator, type CalculationContext } from './payroll.calculator';
import {
  PayrollRunStatus, VALID_RUN_TRANSITIONS,
  LoanStatus, FnFStatus,
  type SalaryComponent,
  type CreateSalaryComponentDto, type UpdateSalaryComponentDto,
  type CreateSalaryStructureDto, type UpdateSalaryStructureDto,
  type AssignSalaryDto, type ReviseSalaryDto,
  type CreatePayrollCycleDto, type UpdatePayrollCycleDto,
  type CreatePayrollRunDto, type UpsertPayrollInputsDto,
  type RollbackRunDto, type UpsertStatutorySettingsDto,
  type StatutorySettings, type PayrollRun, type PayrollInput,
  type EmployeeSalaryComponent,
  type LoanRequest, type LoanInstallment, type FnFSettlement,
  type CreateLoanDto, type SaveMappingsDto, type JVRow,
} from './payroll.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import { QUEUE_NAMES } from '@/workers/worker.registry';
import { generatePublicId } from '@/shared/utils/publicId';
import {
  generateSalaryComponentPublicId, generateSalaryStructurePublicId,
  generateEmployeeSalaryPublicId, generatePayrollCyclePublicId,
  generatePayrollRunPublicId, generatePayrollRunItemPublicId,
  generatePayslipPublicId, generateStatutoryPublicId,
  generatePayrollInputPublicId,
} from '@/shared/utils/publicId';
import { logger } from '@/config/logger';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationOptions } from '@/shared/utils/pagination';

const DEFAULT_STATUTORY: Omit<StatutorySettings, keyof import('@/shared/types/common').BaseDocument | 'companyId'> = {
  pfEnabled: true,   pfEmployeeRate: 12, pfEmployerRate: 12, pfWageCeiling: 15000,
  esiEnabled: true,  esiEmployeeRate: 0.75, esiEmployerRate: 3.25, esiWageCeiling: 21000,
  ptEnabled: false,  ptState: '', ptSlabs: [],
  tdsEnabled: false, tdsDefaultRate: 0,
};

// ── Lazy BullMQ Queue singleton ────────────────────────────────────────────
let _payrollQueue: Queue | null = null;
function getPayrollQueue(): Queue {
  if (!_payrollQueue) {
    _payrollQueue = new Queue(QUEUE_NAMES.PAYROLL_PROCESSING, {
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    });
  }
  return _payrollQueue;
}

// ── Service ────────────────────────────────────────────────────────────────

export class PayrollService {
  private readonly repo       = new PayrollRepository();
  private readonly calculator = new PayrollCalculator();

  // ══ Salary Components ════════════════════════════════════════════════════

  async listComponents(tenantId: string) {
    return this.repo.findComponents(tenantId);
  }

  async createComponent(dto: CreateSalaryComponentDto, tenantId: string, orgId: string, actorId: string) {
    const existing = await this.repo.findComponentByCode(dto.code.toUpperCase(), tenantId);
    if (existing) throw new AppError(409, ErrorCodes.DUPLICATE_RECORD, `Component code '${dto.code}' already exists`);

    const publicId = generateSalaryComponentPublicId();
    const component = await this.repo.createComponent({
      publicId, tenantId, organizationId: orgId,
      code: dto.code.toUpperCase(),
      name: dto.name,
      type: dto.type,
      formulaType: dto.formulaType,
      defaultAmount: dto.defaultAmount,
      defaultPercentage: dto.defaultPercentage,
      formula: dto.formula,
      isSystemComponent: false,
      isTaxable: dto.isTaxable ?? true,
      isVisible: dto.isVisible ?? true,
      displayOrder: dto.displayOrder ?? 0,
      description: dto.description,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'payroll', entityType: 'salary_component', entityPublicId: publicId });
    return component;
  }

  async updateComponent(publicId: string, dto: UpdateSalaryComponentDto, tenantId: string, actorId: string) {
    const existing = await this.repo.findComponentByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.PAYROLL_COMPONENT_NOT_FOUND, 'Salary component not found');
    if (existing.isSystemComponent) {
      if (dto.code || dto.formulaType) throw new AppError(403, ErrorCodes.PERMISSION_DENIED, 'Cannot change code or formulaType of a system component');
    }

    const updated = await this.repo.updateComponent(publicId, tenantId, { ...dto, updatedBy: actorId });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'payroll', entityType: 'salary_component', entityPublicId: publicId });
    return updated;
  }

  async deleteComponent(publicId: string, tenantId: string, actorId: string): Promise<void> {
    const existing = await this.repo.findComponentByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.PAYROLL_COMPONENT_NOT_FOUND, 'Salary component not found');
    if (existing.isSystemComponent) throw new AppError(403, ErrorCodes.PERMISSION_DENIED, 'Cannot delete a system component');

    const usages = await this.repo.findStructuresUsingComponent(existing.code, tenantId);
    if (usages.length > 0) throw new AppError(409, ErrorCodes.DUPLICATE_RECORD, `Component is used in ${usages.length} salary structure(s). Remove it from structures first.`);

    await this.repo.softDeleteComponent(publicId, tenantId, actorId);
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.DELETE, module: 'payroll', entityType: 'salary_component', entityPublicId: publicId });
  }

  // ══ Salary Structures ════════════════════════════════════════════════════

  async listStructures(tenantId: string) {
    return this.repo.findStructures(tenantId);
  }

  async getStructure(publicId: string, tenantId: string) {
    const s = await this.repo.findStructureByPublicId(publicId, tenantId);
    if (!s) throw new AppError(404, ErrorCodes.PAYROLL_STRUCTURE_NOT_FOUND, 'Salary structure not found');
    return s;
  }

  async createStructure(dto: CreateSalaryStructureDto, tenantId: string, orgId: string, actorId: string) {
    const existing = await this.repo.findStructureByCode(dto.code.toUpperCase(), tenantId);
    if (existing) throw new AppError(409, ErrorCodes.DUPLICATE_RECORD, `Structure code '${dto.code}' already exists`);
    await this.validateStructureComponents(dto.components.map(c => c.componentCode), tenantId);

    const publicId = generateSalaryStructurePublicId();
    const structure = await this.repo.createStructure({
      publicId, tenantId, organizationId: orgId,
      code: dto.code.toUpperCase(),
      name: dto.name,
      description: dto.description,
      components: dto.components,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'payroll', entityType: 'salary_structure', entityPublicId: publicId });
    return structure;
  }

  async updateStructure(publicId: string, dto: UpdateSalaryStructureDto, tenantId: string, actorId: string) {
    const existing = await this.repo.findStructureByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.PAYROLL_STRUCTURE_NOT_FOUND, 'Salary structure not found');
    if (dto.components) await this.validateStructureComponents(dto.components.map(c => c.componentCode), tenantId);

    const updated = await this.repo.updateStructure(publicId, tenantId, { ...dto, updatedBy: actorId });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'payroll', entityType: 'salary_structure', entityPublicId: publicId });
    return updated;
  }

  private async validateStructureComponents(codes: string[], tenantId: string): Promise<void> {
    const allComponents = await this.repo.findComponents(tenantId);
    const codeSet = new Set(allComponents.map(c => c.code.toUpperCase()));
    const seen = new Set<string>();
    for (const code of codes) {
      const upper = code.toUpperCase();
      if (!codeSet.has(upper)) throw new AppError(404, ErrorCodes.PAYROLL_COMPONENT_NOT_FOUND, `Component '${code}' not found`);
      if (seen.has(upper)) throw new AppError(400, ErrorCodes.VALIDATION_ERROR, `Duplicate component '${code}' in structure`);
      seen.add(upper);
    }
  }

  // ══ Employee Salary ══════════════════════════════════════════════════════

  async getEmployeeSalary(employeeCode: string, tenantId: string) {
    const { EmployeeService } = await import('@/modules/employee/employee.service');
    const empService = new EmployeeService();
    const employee = await empService.getEmployee(employeeCode, tenantId);
    const history = await this.repo.findSalaryHistory(employee.publicId, tenantId);
    return { employee, history };
  }

  async assignSalary(employeeCode: string, dto: AssignSalaryDto, tenantId: string, orgId: string, actorId: string): Promise<EmployeeSalaryComponent> {
    const { EmployeeService } = await import('@/modules/employee/employee.service');
    const empService = new EmployeeService();
    const employee = await empService.getEmployee(employeeCode, tenantId);

    const structure = await this.repo.findStructureByPublicId(dto.structurePublicId, tenantId);
    if (!structure) throw new AppError(404, ErrorCodes.PAYROLL_STRUCTURE_NOT_FOUND, 'Salary structure not found');

    const publicId = generateEmployeeSalaryPublicId();
    const assignment = await this.repo.upsertEmployeeSalary({
      publicId, tenantId, organizationId: orgId,
      employeeId: employee.publicId,
      companyId: employee.companyId,
      structureId: structure.publicId,
      effectiveFrom: new Date(dto.effectiveFrom),
      ctc: dto.ctc,
      componentOverrides: dto.componentOverrides ?? [],
      arrearsFlag: false,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'payroll', entityType: 'employee_salary', entityPublicId: employee.publicId, newValue: { structureId: structure.publicId, effectiveFrom: dto.effectiveFrom } as Record<string, unknown> });
    return assignment;
  }

  async reviseSalary(employeeCode: string, dto: ReviseSalaryDto, tenantId: string, orgId: string, actorId: string): Promise<EmployeeSalaryComponent> {
    const { EmployeeService } = await import('@/modules/employee/employee.service');
    const empService = new EmployeeService();
    const employee = await empService.getEmployee(employeeCode, tenantId);

    const structure = await this.repo.findStructureByPublicId(dto.structurePublicId, tenantId);
    if (!structure) throw new AppError(404, ErrorCodes.PAYROLL_STRUCTURE_NOT_FOUND, 'Salary structure not found');

    const publicId = generateEmployeeSalaryPublicId();
    const assignment = await this.repo.upsertEmployeeSalary({
      publicId, tenantId, organizationId: orgId,
      employeeId: employee.publicId,
      companyId: employee.companyId,
      structureId: structure.publicId,
      effectiveFrom: new Date(dto.effectiveFrom),
      ctc: dto.ctc,
      componentOverrides: dto.componentOverrides ?? [],
      arrearsFlag: dto.arrearsFlag ?? false,
      revisedBy: actorId,
      revisionNote: dto.revisionNote,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'payroll', entityType: 'employee_salary_revision', entityPublicId: employee.publicId, newValue: { structureId: structure.publicId, effectiveFrom: dto.effectiveFrom, ctc: dto.ctc } as Record<string, unknown> });
    return assignment;
  }

  // ══ Payroll Cycles ═══════════════════════════════════════════════════════

  async listCycles(tenantId: string, companyId?: string) {
    return this.repo.findCycles(tenantId, companyId);
  }

  async createCycle(dto: CreatePayrollCycleDto, tenantId: string, orgId: string, actorId: string) {
    const publicId = generatePayrollCyclePublicId();
    const cycle = await this.repo.createCycle({
      publicId, tenantId, organizationId: orgId,
      companyId: dto.companyId,
      name: dto.name,
      frequency: dto.frequency ?? 'monthly' as import('./payroll.types').PayrollFrequency,
      payDay: dto.payDay,
      cutoffDay: dto.cutoffDay,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'payroll', entityType: 'payroll_cycle', entityPublicId: publicId });
    return cycle;
  }

  async updateCycle(publicId: string, dto: UpdatePayrollCycleDto, tenantId: string, actorId: string) {
    const existing = await this.repo.findCycleByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.PAYROLL_CYCLE_NOT_FOUND, 'Payroll cycle not found');
    return this.repo.updateCycle(publicId, tenantId, { ...dto, updatedBy: actorId });
  }

  // ══ Payroll Runs ══════════════════════════════════════════════════════════

  async listRuns(tenantId: string, companyId: string | undefined, query: Record<string, unknown>): Promise<PaginatedResult<PayrollRun>> {
    const { page, limit } = buildPaginationOptions(query);
    return this.repo.findRuns(tenantId, companyId, page, limit);
  }

  async getRun(publicId: string, tenantId: string): Promise<PayrollRun> {
    const run = await this.repo.findRunByPublicId(publicId, tenantId);
    if (!run) throw new AppError(404, ErrorCodes.PAYROLL_RUN_NOT_FOUND, 'Payroll run not found');
    return run;
  }

  async createRun(dto: CreatePayrollRunDto, tenantId: string, orgId: string, actorId: string): Promise<PayrollRun> {
    const existing = await this.repo.findRunByMonthYear(dto.companyId, dto.month, dto.year, tenantId);
    if (existing) throw new AppError(409, ErrorCodes.PAYROLL_DUPLICATE_RUN, `A payroll run for ${dto.month}/${dto.year} already exists (status: ${existing.status})`);

    const cycle = await this.repo.findCycleByPublicId(dto.cyclePublicId, tenantId);
    if (!cycle) throw new AppError(404, ErrorCodes.PAYROLL_CYCLE_NOT_FOUND, 'Payroll cycle not found');

    const publicId = generatePayrollRunPublicId();
    const run = await this.repo.createRun({
      publicId, tenantId, organizationId: orgId,
      companyId: dto.companyId,
      cycleId: cycle.publicId,
      month: dto.month,
      year: dto.year,
      status: PayrollRunStatus.DRAFT,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    eventBus.emit(EVENTS.PAYROLL_RUN_CREATED, { runId: run.publicId, tenantId });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'payroll', entityType: 'payroll_run', entityPublicId: publicId, newValue: { month: dto.month, year: dto.year } as Record<string, unknown> });
    return run;
  }

  async previewRun(publicId: string, tenantId: string, actorId: string): Promise<PayrollRun> {
    const run = await this.getRun(publicId, tenantId);
    if (run.status !== PayrollRunStatus.DRAFT && run.status !== PayrollRunStatus.PREVIEW) {
      this.assertTransition(run.status, PayrollRunStatus.PREVIEW);
    }

    const { items, totals } = await this.calculateForRun(run, tenantId, true);

    for (const item of items) {
      await this.repo.upsertRunItem(item);
    }

    const updated = await this.repo.updateRunStatus(publicId, tenantId, {
      status: PayrollRunStatus.PREVIEW,
      totalEmployees: items.length,
      totalGross: totals.grossPay,
      totalDeductions: totals.totalDeductions,
      totalNetPay: totals.netPay,
      updatedBy: actorId,
    });

    return updated!;
  }

  async processRun(publicId: string, tenantId: string, orgId: string, actorId: string): Promise<{ jobId: string; status: string }> {
    const run = await this.getRun(publicId, tenantId);
    this.assertTransition(run.status, PayrollRunStatus.PROCESSING);

    // Set PROCESSING before enqueueing — prevents duplicate triggers
    await this.repo.updateRunStatus(publicId, tenantId, {
      status: PayrollRunStatus.PROCESSING,
      updatedBy: actorId,
      errorMessage: undefined,
    });

    const job = await getPayrollQueue().add(
      'process-run',
      {
        tenantId, organizationId: orgId,
        triggeredBy: actorId,
        correlationId: generatePublicId(),
        payload: { runPublicId: publicId, companyId: run.companyId },
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 50, removeOnFail: 100 },
    );

    await this.repo.updateRunStatus(publicId, tenantId, { jobId: job.id ?? undefined, updatedBy: actorId });
    return { jobId: job.id ?? publicId, status: 'queued' };
  }

  async approveRun(publicId: string, tenantId: string, actorId: string): Promise<PayrollRun> {
    const run = await this.getRun(publicId, tenantId);
    this.assertTransition(run.status, PayrollRunStatus.APPROVED);

    const updated = await this.repo.updateRunStatus(publicId, tenantId, {
      status: PayrollRunStatus.APPROVED,
      approvedBy: actorId,
      approvedAt: new Date(),
      updatedBy: actorId,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.APPROVE, module: 'payroll', entityType: 'payroll_run', entityPublicId: publicId });
    return updated!;
  }

  async finalizeRun(publicId: string, tenantId: string, actorId: string): Promise<PayrollRun> {
    const run = await this.getRun(publicId, tenantId);
    this.assertTransition(run.status, PayrollRunStatus.FINALIZED);

    // Generate payslips (idempotent guard)
    const existing = await this.repo.findPayslipsByRun(publicId, tenantId);
    if (existing.length === 0) {
      const runItems = await this.repo.findRunItems(publicId, tenantId);
      const payslips = runItems.map((item) => ({
        publicId: generatePayslipPublicId(),
        tenantId,
        organizationId: run.organizationId,
        runId: publicId,
        runItemId: item.publicId,
        employeeId: item.employeeId,
        companyId: run.companyId,
        month: run.month,
        year: run.year,
        isPublished: false,
        data: item,
        isActive: true,
        createdBy: actorId, updatedBy: actorId, deletedAt: null,
      }));
      await this.repo.createPayslips(payslips);
    }

    const updated = await this.repo.updateRunStatus(publicId, tenantId, {
      status: PayrollRunStatus.FINALIZED,
      finalizedBy: actorId,
      finalizedAt: new Date(),
      updatedBy: actorId,
    });

    eventBus.emit(EVENTS.PAYROLL_RUN_FINALIZED, { runId: publicId, tenantId });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'payroll', entityType: 'payroll_run', entityPublicId: publicId, newValue: { status: 'finalized' } as Record<string, unknown> });
    return updated!;
  }

  async publishPayslips(publicId: string, tenantId: string, actorId: string): Promise<PayrollRun> {
    const run = await this.getRun(publicId, tenantId);
    this.assertTransition(run.status, PayrollRunStatus.PAYSLIPS_PUBLISHED);

    await this.repo.publishPayslips(publicId, tenantId);

    const updated = await this.repo.updateRunStatus(publicId, tenantId, {
      status: PayrollRunStatus.PAYSLIPS_PUBLISHED,
      payslipsPublishedAt: new Date(),
      updatedBy: actorId,
    });

    eventBus.emit(EVENTS.PAYROLL_PAYSLIPS_PUBLISHED, { runId: publicId, tenantId, month: run.month, year: run.year });
    return updated!;
  }

  async rollbackRun(publicId: string, dto: RollbackRunDto, tenantId: string, actorId: string): Promise<PayrollRun> {
    const run = await this.getRun(publicId, tenantId);
    const blocked: PayrollRunStatus[] = [
      PayrollRunStatus.FINALIZED, PayrollRunStatus.PAYSLIPS_PUBLISHED,
      PayrollRunStatus.ROLLED_BACK, PayrollRunStatus.PROCESSING,
    ];
    if (blocked.includes(run.status)) {
      const msg = run.status === PayrollRunStatus.PROCESSING
        ? 'Cannot rollback while processing. Wait for the job to complete first.'
        : `Cannot rollback a run in status '${run.status}'.`;
      throw new AppError(409, ErrorCodes.PAYROLL_RUN_INVALID_TRANSITION, msg);
    }

    await this.repo.deleteRunItems(publicId, tenantId);
    await this.repo.deletePayslipsByRun(publicId, tenantId);

    const updated = await this.repo.updateRunStatus(publicId, tenantId, {
      status: PayrollRunStatus.ROLLED_BACK,
      rolledBackBy: actorId,
      rolledBackAt: new Date(),
      rollbackReason: dto.reason,
      updatedBy: actorId,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'payroll', entityType: 'payroll_run', entityPublicId: publicId, newValue: { status: 'rolled_back', reason: dto.reason } as Record<string, unknown> });
    return updated!;
  }

  // ══ Used by BullMQ worker ═════════════════════════════════════════════════

  async executeRunAsync(runPublicId: string, tenantId: string, actorId: string, job?: import('bullmq').Job): Promise<void> {
    const run = await this.repo.findRunByPublicId(runPublicId, tenantId);
    if (!run) throw new AppError(404, ErrorCodes.PAYROLL_RUN_NOT_FOUND, 'Run not found');

    const { items, totals } = await this.calculateForRun(run, tenantId, false, async (progress) => {
      await job?.updateProgress(progress);
    });

    // Clear old run items then write fresh ones
    await this.repo.deleteRunItems(runPublicId, tenantId);
    for (const item of items) {
      await this.repo.upsertRunItem(item);
    }

    await this.repo.updateRunStatus(runPublicId, tenantId, {
      status: PayrollRunStatus.PROCESSED,
      processedBy: actorId,
      processedAt: new Date(),
      totalEmployees: items.length,
      totalGross: totals.grossPay,
      totalDeductions: totals.totalDeductions,
      totalNetPay: totals.netPay,
      errorMessage: undefined,
      updatedBy: actorId,
    });

    eventBus.emit(EVENTS.PAYROLL_RUN_PROCESSED, { runId: runPublicId, tenantId });
  }

  async markRunFailed(runPublicId: string, tenantId: string, errorMsg: string): Promise<void> {
    await this.repo.updateRunStatus(runPublicId, tenantId, {
      status: PayrollRunStatus.PREVIEW,
      errorMessage: errorMsg,
    }).catch(() => {});
  }

  // ══ Payroll Inputs ════════════════════════════════════════════════════════

  async getInputs(runPublicId: string, tenantId: string): Promise<PayrollInput[]> {
    await this.getRun(runPublicId, tenantId); // assert run exists
    return this.repo.findInputsByRun(runPublicId, tenantId);
  }

  async upsertInputs(runPublicId: string, dto: UpsertPayrollInputsDto, tenantId: string, orgId: string, actorId: string): Promise<void> {
    const run = await this.getRun(runPublicId, tenantId);
    const editableStatuses = [PayrollRunStatus.DRAFT, PayrollRunStatus.PREVIEW];
    if (!editableStatuses.includes(run.status)) {
      throw new AppError(409, ErrorCodes.PAYROLL_LOCKED, `Cannot edit inputs for a run in status '${run.status}'`);
    }

    const { EmployeeService } = await import('@/modules/employee/employee.service');
    const empService = new EmployeeService();

    for (const entry of dto.inputs) {
      const employee = await empService.getEmployee(entry.employeeCode, tenantId);
      await this.repo.upsertInput({
        publicId: generatePayrollInputPublicId(),
        tenantId, organizationId: orgId,
        runId: runPublicId,
        employeeId: employee.publicId,
        companyId: run.companyId,
        lopDays: entry.lopDays,
        bonusAmount: entry.bonusAmount,
        adhocEarnings: entry.adhocEarnings ?? [],
        adhocDeductions: entry.adhocDeductions ?? [],
        notes: entry.notes,
        isActive: true,
        createdBy: actorId, updatedBy: actorId, deletedAt: null,
      });
    }
  }

  // ══ Payslips ══════════════════════════════════════════════════════════════

  async listPayslips(tenantId: string, actorId: string, permissions: string[], query: Record<string, unknown>, employeePublicId?: string) {
    const { page, limit } = buildPaginationOptions(query);
    const companyId = (query.companyId as string) ?? '';
    // payroll.run.view is HR-only; payroll.payslip.view is also granted to employees for self-viewing.
    const isHR = permissions.includes('payroll.run.view');

    if (isHR) {
      // HR can see all payslips; optionally filtered by company
      return this.repo.findAllPayslips(tenantId, companyId || '', page, limit, false);
    }

    // Employee: own published payslips only
    if (!employeePublicId) {
      throw new AppError(422, 'EMPLOYEE_NOT_LINKED', 'No employee record linked to your account');
    }
    // employeePublicId is the employeeCode — look up actual DB publicId
    const { EmployeeService } = await import('@/modules/employee/employee.service');
    const empSvc = new EmployeeService();
    const emp = await empSvc.getEmployee(employeePublicId, tenantId).catch(() => null);
    const empPublicId = emp?.publicId ?? employeePublicId;
    return this.repo.findPayslipsByEmployee(empPublicId, tenantId, page, limit);
  }

  async getPayslip(publicId: string, tenantId: string, actorId: string, permissions: string[], employeePublicId?: string) {
    const payslip = await this.repo.findPayslipByPublicId(publicId, tenantId);
    if (!payslip) throw new AppError(404, ErrorCodes.PAYROLL_PAYSLIP_NOT_FOUND, 'Payslip not found');

    const isHR = permissions.includes('payroll.payslip.view');
    if (!isHR) {
      if (!payslip.isPublished) throw new AppError(404, ErrorCodes.PAYROLL_PAYSLIP_NOT_FOUND, 'Payslip not found');
      if (payslip.employeeId !== employeePublicId) throw new AppError(403, ErrorCodes.PERMISSION_DENIED, 'Access denied');
    }

    return payslip;
  }

  async getRunItems(runPublicId: string, tenantId: string) {
    await this.getRun(runPublicId, tenantId);
    return this.repo.findRunItems(runPublicId, tenantId);
  }

  // ══ Statutory Settings ════════════════════════════════════════════════════

  async getStatutorySettings(companyId: string, tenantId: string): Promise<StatutorySettings> {
    const settings = await this.repo.findStatutoryByCompany(companyId, tenantId);
    if (!settings) {
      // Return defaults without persisting
      return { ...DEFAULT_STATUTORY, companyId, tenantId } as unknown as StatutorySettings;
    }
    return settings;
  }

  async upsertStatutorySettings(companyId: string, dto: UpsertStatutorySettingsDto, tenantId: string, orgId: string, actorId: string): Promise<StatutorySettings> {
    const publicId = generateStatutoryPublicId();
    const settings = await this.repo.upsertStatutory({
      publicId, tenantId, organizationId: orgId,
      companyId, ...dto,
      isActive: true,
      createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.UPDATE, module: 'payroll', entityType: 'statutory_settings', entityPublicId: companyId, newValue: dto as unknown as Record<string, unknown> });
    return settings;
  }

  // ══ Internal calculation logic ════════════════════════════════════════════

  private async calculateForRun(
    run: PayrollRun,
    tenantId: string,
    isPreview: boolean,
    onProgress?: (pct: number) => Promise<void>,
  ): Promise<{ items: ReturnType<typeof this.buildRunItem>[], totals: { grossPay: number; totalDeductions: number; netPay: number } }> {
    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();
    const empResult = await empRepo.findEmployees(tenantId, undefined, { companyId: run.companyId, status: 'active' }, 1, 1000);

    const allComponents  = await this.repo.findComponents(tenantId);
    const componentMap   = new Map(allComponents.map((c: SalaryComponent) => [c.code.toUpperCase(), c]));

    const statutory = await this.repo.findStatutoryByCompany(run.companyId, tenantId)
      ?? { ...DEFAULT_STATUTORY } as unknown as StatutorySettings;

    // Use UTC date to avoid timezone issues (local midnight != UTC midnight on IST servers)
    const firstDayOfMonth = new Date(Date.UTC(run.year, run.month - 1, 1));
    const items: ReturnType<typeof this.buildRunItem>[] = [];
    const totals = { grossPay: 0, totalDeductions: 0, netPay: 0 };
    const total  = empResult.data.length;

    for (let i = 0; i < total; i++) {
      const employee = empResult.data[i];

      const assignment = await this.repo.findEffectiveSalary(employee.publicId, tenantId, firstDayOfMonth);
      if (!assignment) {
        logger.warn({ employeeId: employee.publicId, runId: run.publicId }, 'No salary assignment found — skipping employee');
        continue;
      }

      const structure = await this.repo.findStructureByPublicId(assignment.structureId, tenantId);
      if (!structure) {
        logger.warn({ structureId: assignment.structureId, employeeId: employee.publicId }, 'Salary structure not found — skipping employee');
        continue;
      }

      const rawInputs = await this.repo.findInputByEmployee(run.publicId, employee.publicId, tenantId);
      // findInputByEmployee may return null when no input record exists for this employee/run
      const inputs = rawInputs ?? {} as typeof rawInputs;

      // Auto-compute LOP from attendance if not manually set in inputs
      if (!inputs || inputs.lopDays == null) {
        try {
          const { AttendanceRepository } = await import('@/modules/attendance/attendance.repository');
          const attRepo = new AttendanceRepository();
          const absentDays = await attRepo.countAbsentDays(employee.publicId, tenantId, run.month, run.year);
          if (absentDays > 0 && inputs) inputs.lopDays = absentDays;
        } catch {
          // Non-critical — proceed without auto-LOP
        }
      }

      const ctx: CalculationContext = {
        employeeId: employee.publicId,
        structureId: assignment.structureId,
        salaryAssignment: assignment,
        structure,
        components: componentMap,
        statutory,
        inputs,
        payPeriod: { month: run.month, year: run.year },
      };

      let result;
      try {
        result = this.calculator.calculate(ctx);
      } catch (err) {
        logger.error({ err, employeeId: employee.publicId }, 'Calculation error for employee');
        throw err;
      }

      // Add active loan EMI deductions
      try {
        const activeLoans = await this.repo.findActiveLoansForEmployee(employee.publicId, tenantId);
        for (const loan of activeLoans) {
          const emi = loan.emi ?? 0;
          if (emi > 0) {
            result.deductions.push({ label: `Loan EMI (${loan.publicId.slice(-6)})`, amount: emi });
            result.totalDeductions += emi;
            result.netPay = Math.max(0, result.netPay - emi);
          }
        }
      } catch { /* non-critical */ }

      const item = this.buildRunItem(run, employee.publicId, assignment.structureId, result, isPreview, tenantId);
      items.push(item);
      totals.grossPay        += result.grossPay;
      totals.totalDeductions += result.totalDeductions;
      totals.netPay          += result.netPay;

      if (onProgress && i > 0 && i % 50 === 0) {
        await onProgress(Math.round((i / total) * 100));
      }
    }

    return { items, totals };
  }

  private buildRunItem(
    run: PayrollRun,
    employeeId: string,
    structureId: string,
    result: import('./payroll.calculator').CalculationResult,
    isPreview: boolean,
    tenantId: string,
  ) {
    return {
      publicId:        generatePayrollRunItemPublicId(),
      tenantId,
      organizationId:  run.organizationId,
      runId:           run.publicId,
      employeeId,
      companyId:       run.companyId,
      structureId,
      earnings:        result.earnings,
      deductions:      result.deductions,
      grossPay:        result.grossPay,
      totalDeductions: result.totalDeductions,
      netPay:          result.netPay,
      lopDays:         result.lopDays,
      presentDays:     result.presentDays,
      workingDays:     result.workingDays,
      pfEmployee:      result.pfEmployee,
      pfEmployer:      result.pfEmployer,
      esiEmployee:     result.esiEmployee,
      esiEmployer:     result.esiEmployer,
      professionalTax: result.professionalTax,
      tds:             result.tds,
      isPreview,
      isActive:        true,
      createdBy:       'system',
      updatedBy:       'system',
      deletedAt:       null as Date | null,
    };
  }

  private assertTransition(current: PayrollRunStatus, next: PayrollRunStatus): void {
    const allowed = VALID_RUN_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new AppError(
        400,
        ErrorCodes.PAYROLL_RUN_INVALID_TRANSITION,
        `Cannot transition payroll run from '${current}' to '${next}'. Allowed: [${allowed.join(', ')}]`,
      );
    }
  }

  // ══ Bank File ═════════════════════════════════════════════════════════════

  async generateBankFile(
    runPublicId: string,
    tenantId: string,
  ): Promise<Array<{ employeeCode: string; bankName: string; ifscCode: string; accountNumber: string; netPay: number }>> {
    const run = await this.getRun(runPublicId, tenantId);
    const allowed = [PayrollRunStatus.FINALIZED, PayrollRunStatus.PAYSLIPS_PUBLISHED];
    if (!allowed.includes(run.status)) {
      throw new AppError(409, ErrorCodes.PAYROLL_LOCKED, 'Bank file can only be generated for finalized runs');
    }

    const items = await this.repo.findRunItems(runPublicId, tenantId);
    if (!items.length) return [];

    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();

    const rows = await Promise.all(items.map(async (item) => {
      const emp = await empRepo.findByPublicId(item.employeeId, tenantId);
      const bank = await empRepo.getBankDetails(item.employeeId, tenantId);
      const primary = (bank ?? []).find((b: { isPrimary: boolean }) => b.isPrimary) ?? bank?.[0];
      return {
        employeeCode:  emp?.employeeCode ?? item.employeeId,
        bankName:      primary?.bankName ?? '',
        ifscCode:      primary?.ifscCode ?? '',
        accountNumber: primary?.accountNumber ?? '',
        netPay:        item.netPay,
      };
    }));

    return rows;
  }

  // ══ Reports ═══════════════════════════════════════════════════════════════

  async salaryRegister(
    tenantId: string,
    companyId: string,
    month: number,
    year: number,
  ): Promise<Record<string, unknown>[]> {
    const runs = await this.repo.findRuns(tenantId, companyId, 1, 1);
    const matchRun = runs.data.find(r => r.month === month && r.year === year &&
      [PayrollRunStatus.PROCESSED, PayrollRunStatus.APPROVED, PayrollRunStatus.FINALIZED, PayrollRunStatus.PAYSLIPS_PUBLISHED].includes(r.status));

    if (!matchRun) return [];

    const items = await this.repo.findRunItems(matchRun.publicId, tenantId);
    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();

    return Promise.all(items.map(async (item) => {
      const emp = await empRepo.findByPublicId(item.employeeId, tenantId);
      const earningsMap = Object.fromEntries(item.earnings.map(e => [e.label, e.amount]));
      const deductionsMap = Object.fromEntries(item.deductions.map(d => [d.label, d.amount]));
      return {
        employeeCode: emp?.employeeCode ?? item.employeeId,
        workingDays:  item.workingDays,
        lopDays:      item.lopDays,
        ...earningsMap,
        grossPay:        item.grossPay,
        pfEmployee:      item.pfEmployee,
        esiEmployee:     item.esiEmployee,
        professionalTax: item.professionalTax,
        tds:             item.tds,
        ...deductionsMap,
        totalDeductions: item.totalDeductions,
        netPay:          item.netPay,
      };
    }));
  }

  async payoutRegister(
    tenantId: string,
    runPublicId: string,
  ): Promise<Record<string, unknown>[]> {
    const run = await this.getRun(runPublicId, tenantId);
    const items = await this.repo.findRunItems(runPublicId, tenantId);
    if (!items.length) return [];

    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();

    return Promise.all(items.map(async (item) => {
      const emp = await empRepo.findByPublicId(item.employeeId, tenantId);
      const bank = await empRepo.getBankDetails(item.employeeId, tenantId);
      const primary = (bank ?? []).find((b: { isPrimary: boolean }) => b.isPrimary) ?? bank?.[0];
      return {
        employeeCode:  emp?.employeeCode ?? item.employeeId,
        month:         `${run.month}/${run.year}`,
        bankName:      primary?.bankName ?? '—',
        ifscCode:      primary?.ifscCode ?? '—',
        accountNumber: primary?.accountNumber ?? '—',
        grossPay:      item.grossPay,
        totalDeductions: item.totalDeductions,
        netPay:        item.netPay,
      };
    }));
  }

  // ══ Loans ═════════════════════════════════════════════════════════════════

  async requestLoan(dto: CreateLoanDto, tenantId: string, orgId: string, employeeId: string, actorId: string): Promise<LoanRequest> {
    const loan = await this.repo.createLoan({
      publicId: generatePublicId('loan_'),
      tenantId, organizationId: orgId,
      employeeId, companyId: dto.companyId,
      amount: dto.amount, tenureMonths: dto.tenureMonths, purpose: dto.purpose,
      status: LoanStatus.PENDING,
      isActive: true, createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'payroll', entityType: 'loan_request', entityPublicId: loan.publicId, newValue: { amount: loan.amount } as unknown as Record<string, unknown> });
    return loan;
  }

  async getLoansForEmployee(employeeCodeOrId: string, tenantId: string): Promise<LoanRequest[]> {
    // employeeCodeOrId may be an employeeCode (EMP-0001) — resolve to publicId for DB query
    const { EmployeeService } = await import('@/modules/employee/employee.service');
    const empSvc = new EmployeeService();
    const emp = await empSvc.getEmployee(employeeCodeOrId, tenantId).catch(() => null);
    const empPublicId = emp?.publicId ?? employeeCodeOrId;
    return this.repo.findLoansByEmployee(empPublicId, tenantId);
  }

  async getAllLoans(tenantId: string, status?: string): Promise<LoanRequest[]> {
    return this.repo.findAllLoans(tenantId, status);
  }

  async getLoanByPublicId(publicId: string, tenantId: string): Promise<LoanRequest> {
    const loan = await this.repo.findLoanByPublicId(publicId, tenantId);
    if (!loan) throw new AppError(404, ErrorCodes.NOT_FOUND, 'Loan not found');
    return loan;
  }

  async approveLoan(publicId: string, tenantId: string, actorId: string): Promise<LoanRequest> {
    const loan = await this.getLoanByPublicId(publicId, tenantId);
    if (loan.status !== LoanStatus.PENDING) throw new AppError(409, ErrorCodes.INVALID_STATUS_TRANSITION, 'Only pending loans can be approved');

    const emi = Math.ceil(loan.amount / loan.tenureMonths);
    const updated = await this.repo.updateLoan(publicId, tenantId, {
      status: LoanStatus.ACTIVE,
      emi, disbursedAt: new Date(), approvedBy: actorId, updatedBy: actorId,
    });

    // Generate installment schedule
    const installments: LoanInstallment[] = [];
    const now = new Date();
    for (let i = 1; i <= loan.tenureMonths; i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      installments.push({
        publicId: generatePublicId('inst_'),
        tenantId, loanId: publicId,
        installmentNo: i, dueDate, emiAmount: emi, paid: false,
      });
    }
    await this.repo.createInstallments(installments);

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.APPROVE, module: 'payroll', entityType: 'loan_request', entityPublicId: publicId });
    return updated!;
  }

  async rejectLoan(publicId: string, reason: string, tenantId: string, actorId: string): Promise<LoanRequest> {
    const loan = await this.getLoanByPublicId(publicId, tenantId);
    if (loan.status !== LoanStatus.PENDING) throw new AppError(409, ErrorCodes.INVALID_STATUS_TRANSITION, 'Only pending loans can be rejected');
    const updated = await this.repo.updateLoan(publicId, tenantId, {
      status: LoanStatus.REJECTED, rejectionReason: reason, updatedBy: actorId,
    });
    return updated!;
  }

  async getLoanSchedule(publicId: string, tenantId: string): Promise<LoanInstallment[]> {
    await this.getLoanByPublicId(publicId, tenantId);
    return this.repo.findInstallmentsByLoan(publicId, tenantId);
  }

  // ══ Full & Final Settlement ════════════════════════════════════════════════

  async initiateFnF(employeeCode: string, dto: { bonusAmount?: number; assetRecovery?: number; notes?: string }, tenantId: string, orgId: string, actorId: string): Promise<FnFSettlement> {
    const { EmployeeService } = await import('@/modules/employee/employee.service');
    const empService = new EmployeeService();
    const employee = await empService.getEmployee(employeeCode, tenantId);

    // Check if FnF already exists
    const existing = await this.repo.findFnFByEmployee(employee.publicId, tenantId);
    if (existing && !['settled'].includes(existing.status)) {
      throw new AppError(409, ErrorCodes.DUPLICATE_RECORD, 'An active FnF settlement already exists for this employee');
    }

    const separationDate = employee.lastWorkingDate ? new Date(employee.lastWorkingDate) : new Date();
    const joiningDate    = new Date(employee.joiningDate);
    const yearsOfService = (separationDate.getTime() - joiningDate.getTime()) / (365.25 * 24 * 3600 * 1000);

    // Leave encashment: get remaining balance
    let leaveEncashmentDays = 0;
    try {
      const { LeaveRepository } = await import('@/modules/leave/leave.repository');
      const leaveRepo = new LeaveRepository();
      const currentYear = separationDate.getFullYear();
      const balances = await leaveRepo.getBalancesByEmployee(employee.publicId, tenantId, currentYear);
      leaveEncashmentDays = balances.reduce((s: number, b: { closingBalance?: number }) => s + (b.closingBalance ?? 0), 0);
    } catch { /* non-critical */ }

    // Get last active salary for daily rate calculation
    const assignment = await this.repo.findEffectiveSalary(employee.publicId, tenantId, separationDate);
    const monthlySalary = assignment?.ctc ? assignment.ctc / 12 : 0;
    const dailyRate = monthlySalary / 26;

    // Gratuity: 5+ years → 15 days per completed year
    const gratuityAmount = yearsOfService >= 5 ? Math.floor(yearsOfService) * 15 * dailyRate : 0;
    const leaveEncashmentAmount = leaveEncashmentDays * dailyRate;

    // Notice pay shortfall
    const noticePeriodDays  = employee.noticePeriodDays ?? 30;
    const noticeServedDays  = 0; // Would come from HR input; default 0
    const noticePay         = Math.max(0, (noticePeriodDays - noticeServedDays)) * dailyRate;

    // Loan recovery
    const activeLoans = await this.repo.findActiveLoansForEmployee(employee.publicId, tenantId);
    const loanRecovery = activeLoans.reduce((s, l) => s + l.amount, 0);

    const bonusAmount   = dto.bonusAmount   ?? 0;
    const assetRecovery = dto.assetRecovery ?? 0;
    const totalPayable  = leaveEncashmentAmount + gratuityAmount + bonusAmount;
    const totalRecovery = loanRecovery + assetRecovery + noticePay;
    const netSettlement = totalPayable - totalRecovery;

    const fnf = await this.repo.createFnF({
      publicId: generatePublicId('fnf_'),
      tenantId, organizationId: orgId,
      employeeId: employee.publicId, companyId: employee.companyId ?? '',
      separationDate, lastWorkingDate: separationDate,
      noticePeriodDays, noticeServedDays, noticePay,
      leaveEncashmentDays, leaveEncashmentAmount,
      gratuityYears: Math.floor(yearsOfService), gratuityAmount,
      bonusAmount, loanRecovery, assetRecovery,
      totalPayable, totalRecovery, netSettlement,
      status: FnFStatus.DRAFT,
      notes: dto.notes,
      isActive: true, createdBy: actorId, updatedBy: actorId, deletedAt: null,
    });

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'payroll', entityType: 'fnf_settlement', entityPublicId: fnf.publicId, newValue: { netSettlement } as unknown as Record<string, unknown> });
    return fnf;
  }

  async getFnF(publicId: string, tenantId: string): Promise<FnFSettlement> {
    const fnf = await this.repo.findFnFByPublicId(publicId, tenantId);
    if (!fnf) throw new AppError(404, ErrorCodes.NOT_FOUND, 'FnF settlement not found');
    return fnf;
  }

  async listFnF(tenantId: string): Promise<FnFSettlement[]> {
    return this.repo.listFnF(tenantId);
  }

  // ══ Accounting Export ═════════════════════════════════════════════════════

  async getAccountingMappings(companyId: string, tenantId: string) {
    return this.repo.findAccountingMappings(companyId, tenantId);
  }

  async saveAccountingMappings(dto: SaveMappingsDto, tenantId: string, actorId: string) {
    return this.repo.upsertAccountingMappings(dto.companyId, tenantId, dto.mappings, actorId);
  }

  async generateAccountingExport(runPublicId: string, tenantId: string, actorId: string): Promise<JVRow[]> {
    const run = await this.getRun(runPublicId, tenantId);
    const allowed = [PayrollRunStatus.FINALIZED, PayrollRunStatus.PAYSLIPS_PUBLISHED];
    if (!allowed.includes(run.status)) {
      throw new AppError(409, ErrorCodes.PAYROLL_LOCKED, 'Accounting export only available for finalized runs');
    }

    const mappingDoc = await this.repo.findAccountingMappings(run.companyId, tenantId);
    const mappingMap = new Map((mappingDoc?.mappings ?? []).map(m => [m.componentCode, m]));

    const items  = await this.repo.findRunItems(runPublicId, tenantId);
    const runDate = `${run.year}-${String(run.month).padStart(2, '0')}-01`;

    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();

    const rows: JVRow[] = [];

    for (const item of items) {
      const emp = await empRepo.findByPublicId(item.employeeId, tenantId);
      const empCode = emp?.employeeCode ?? item.employeeId;
      const costCentre = mappingMap.get('DEFAULT')?.costCentre ?? '';

      // Earnings → Debit salary expense
      for (const line of item.earnings) {
        const mapping = mappingMap.get(line.componentCode);
        rows.push({
          date: runDate,
          description: `${line.componentCode} — ${empCode}`,
          glAccount:    mapping?.glAccount    ?? '5000',
          glDescription: mapping?.glDescription ?? line.componentCode,
          debit:  line.amount,
          credit: 0,
          costCentre: mapping?.costCentre ?? costCentre,
          employeeCode: empCode,
        });
      }

      // Net pay → Credit salary payable
      rows.push({
        date: runDate,
        description: `Net Pay — ${empCode}`,
        glAccount: '2100',
        glDescription: 'Salary Payable',
        debit: 0,
        credit: item.netPay,
        costCentre,
        employeeCode: empCode,
      });

      // Deductions → Credit tax/PF liability
      if (item.pfEmployee > 0) {
        rows.push({ date: runDate, description: `PF Employee — ${empCode}`, glAccount: '2110', glDescription: 'PF Payable', debit: 0, credit: item.pfEmployee, costCentre, employeeCode: empCode });
      }
      if (item.esiEmployee > 0) {
        rows.push({ date: runDate, description: `ESI Employee — ${empCode}`, glAccount: '2120', glDescription: 'ESI Payable', debit: 0, credit: item.esiEmployee, costCentre, employeeCode: empCode });
      }
      if (item.tds > 0) {
        rows.push({ date: runDate, description: `TDS — ${empCode}`, glAccount: '2130', glDescription: 'TDS Payable', debit: 0, credit: item.tds, costCentre, employeeCode: empCode });
      }
    }

    auditService.writeAsync({ tenantId, actorId, action: AuditAction.CREATE, module: 'payroll', entityType: 'accounting_export', entityPublicId: runPublicId, newValue: { rows: rows.length } as unknown as Record<string, unknown> });
    return rows;
  }

  async approveFnF(publicId: string, tenantId: string, actorId: string): Promise<FnFSettlement> {
    const fnf = await this.getFnF(publicId, tenantId);
    if (!['draft', 'pending_approval'].includes(fnf.status)) {
      throw new AppError(409, ErrorCodes.INVALID_STATUS_TRANSITION, 'FnF cannot be approved in its current state');
    }
    const updated = await this.repo.updateFnF(publicId, tenantId, {
      status: FnFStatus.APPROVED, approvedBy: actorId, approvedAt: new Date(), updatedBy: actorId,
    });
    auditService.writeAsync({ tenantId, actorId, action: AuditAction.APPROVE, module: 'payroll', entityType: 'fnf_settlement', entityPublicId: publicId });
    return updated!;
  }
}
