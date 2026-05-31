import { evaluate as mathEval } from 'mathjs';
import { RuleEngineRepository } from './rule-engine.repository';
import type {
  RuleSet,
  Rule,
  RuleType,
  RuleCondition,
  EvaluationResult,
  CreateRuleSetDto,
  UpdateRuleSetDto,
  CreateRuleDto,
  UpdateRuleDto,
} from './rule-engine.types';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { generateRuleSetPublicId, generateRulePublicId } from '@/shared/utils/publicId';
import { auditService } from '@/modules/audit/audit.service';
import { AuditAction } from '@/modules/audit/audit.types';
import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';
import type { PaginatedResult } from '@/shared/types/common';
import { buildPaginationMeta } from '@/shared/utils/pagination';

// ─── Dot-notation path resolver (no lodash dependency) ────────────────────────

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class RuleEngineService {
  private readonly repo: RuleEngineRepository;

  constructor() {
    this.repo = new RuleEngineRepository();
  }

  // ── RuleSet CRUD ──────────────────────────────────────────────────────────

  async createRuleSet(dto: CreateRuleSetDto, tenantId: string, actorId: string): Promise<RuleSet> {
    const publicId = generateRuleSetPublicId();

    const ruleSet = await this.repo.createRuleSet({
      publicId,
      tenantId,
      name: dto.name,
      module: dto.module,
      ruleType: dto.ruleType,
      isActive: true,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'rule-engine',
      entityType: 'rule_set',
      entityPublicId: ruleSet.publicId,
    });

    return ruleSet;
  }

  async updateRuleSet(
    publicId: string,
    dto: UpdateRuleSetDto,
    tenantId: string,
    actorId: string,
  ): Promise<RuleSet> {
    const existing = await this.repo.findRuleSetByPublicId(publicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.RULE_SET_NOT_FOUND, 'Rule set not found');

    const updateData: Partial<RuleSet> = { updatedBy: actorId };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.module !== undefined) updateData.module = dto.module;
    if (dto.ruleType !== undefined) updateData.ruleType = dto.ruleType;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.effectiveFrom !== undefined) updateData.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) updateData.effectiveTo = new Date(dto.effectiveTo);

    const updated = await this.repo.updateRuleSet(publicId, tenantId, updateData);
    if (!updated) throw new AppError(404, ErrorCodes.RULE_SET_NOT_FOUND, 'Rule set not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'rule-engine',
      entityType: 'rule_set',
      entityPublicId: publicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async listRuleSets(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<RuleSet>> {
    const { data, total } = await this.repo.listRuleSets(tenantId, page, limit);
    return { data, meta: buildPaginationMeta(page, limit, total) };
  }

  // ── Rule CRUD ─────────────────────────────────────────────────────────────

  async addRule(
    ruleSetPublicId: string,
    dto: CreateRuleDto,
    tenantId: string,
    actorId: string,
  ): Promise<Rule> {
    const ruleSet = await this.repo.findRuleSetByPublicId(ruleSetPublicId, tenantId);
    if (!ruleSet) throw new AppError(404, ErrorCodes.RULE_SET_NOT_FOUND, 'Rule set not found');

    const publicId = generateRulePublicId();

    const rule = await this.repo.createRule({
      publicId,
      tenantId,
      ruleSetId: ruleSet.publicId,
      name: dto.name,
      priority: dto.priority,
      conditions: dto.conditions,
      action: dto.action,
      isActive: true,
      effectiveFrom: new Date(dto.effectiveFrom),
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      createdBy: actorId,
      updatedBy: actorId,
      deletedAt: null,
    });

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.CREATE,
      module: 'rule-engine',
      entityType: 'rule',
      entityPublicId: rule.publicId,
    });

    return rule;
  }

  async updateRule(
    ruleSetPublicId: string,
    rulePublicId: string,
    dto: UpdateRuleDto,
    tenantId: string,
    actorId: string,
  ): Promise<Rule> {
    const ruleSet = await this.repo.findRuleSetByPublicId(ruleSetPublicId, tenantId);
    if (!ruleSet) throw new AppError(404, ErrorCodes.RULE_SET_NOT_FOUND, 'Rule set not found');

    const existing = await this.repo.findRuleByPublicId(rulePublicId, tenantId);
    if (!existing) throw new AppError(404, ErrorCodes.RULE_NOT_FOUND, 'Rule not found');

    const updateData: Partial<Rule> = { updatedBy: actorId };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.conditions !== undefined) updateData.conditions = dto.conditions;
    if (dto.action !== undefined) updateData.action = dto.action;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.effectiveFrom !== undefined) updateData.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveTo !== undefined) updateData.effectiveTo = new Date(dto.effectiveTo);

    const updated = await this.repo.updateRule(rulePublicId, tenantId, updateData);
    if (!updated) throw new AppError(404, ErrorCodes.RULE_NOT_FOUND, 'Rule not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.UPDATE,
      module: 'rule-engine',
      entityType: 'rule',
      entityPublicId: rulePublicId,
      oldValue: existing as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async deleteRule(
    ruleSetPublicId: string,
    rulePublicId: string,
    tenantId: string,
    actorId: string,
  ): Promise<void> {
    const ruleSet = await this.repo.findRuleSetByPublicId(ruleSetPublicId, tenantId);
    if (!ruleSet) throw new AppError(404, ErrorCodes.RULE_SET_NOT_FOUND, 'Rule set not found');

    const deleted = await this.repo.deleteRule(rulePublicId, tenantId, actorId);
    if (!deleted) throw new AppError(404, ErrorCodes.RULE_NOT_FOUND, 'Rule not found');

    auditService.writeAsync({
      tenantId,
      actorId,
      action: AuditAction.DELETE,
      module: 'rule-engine',
      entityType: 'rule',
      entityPublicId: rulePublicId,
    });
  }

  async listRules(ruleSetPublicId: string, tenantId: string): Promise<Rule[]> {
    const ruleSet = await this.repo.findRuleSetByPublicId(ruleSetPublicId, tenantId);
    if (!ruleSet) throw new AppError(404, ErrorCodes.RULE_SET_NOT_FOUND, 'Rule set not found');

    return this.repo.listRulesByRuleSet(ruleSet.publicId, tenantId);
  }

  async getRuleSet(publicId: string, tenantId: string): Promise<RuleSet> {
    const ruleSet = await this.repo.findRuleSetByPublicId(publicId, tenantId);
    if (!ruleSet) throw new AppError(404, ErrorCodes.RULE_SET_NOT_FOUND, 'Rule set not found');
    return ruleSet;
  }

  // ── Evaluation ────────────────────────────────────────────────────────────

  async evaluate(
    ruleType: RuleType,
    context: Record<string, unknown>,
    tenantId: string,
    effectiveDate?: Date,
  ): Promise<EvaluationResult> {
    const result = await this.runEvaluation(ruleType, context, tenantId, effectiveDate);

    eventBus.emit(EVENTS.RULE_EVALUATED, {
      ruleType,
      tenantId,
      matchedRules: result.matchedRules,
      evaluatedAt: result.evaluatedAt,
    });

    return result;
  }

  async simulate(
    ruleType: RuleType,
    context: Record<string, unknown>,
    tenantId: string,
    effectiveDate?: Date,
  ): Promise<EvaluationResult> {
    // Same as evaluate but no event emission
    return this.runEvaluation(ruleType, context, tenantId, effectiveDate);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async runEvaluation(
    ruleType: RuleType,
    context: Record<string, unknown>,
    tenantId: string,
    effectiveDate?: Date,
  ): Promise<EvaluationResult> {
    const date = effectiveDate ?? new Date();

    const ruleSets = await this.repo.findActiveRuleSets(ruleType, tenantId, date);

    const matchedRules: string[] = [];
    const output: Record<string, unknown> = {};

    for (const ruleSet of ruleSets) {
      const rules = await this.repo.listRulesByRuleSet(ruleSet.publicId, tenantId);

      for (const rule of rules) {
        if (!rule.isActive) continue;

        const allConditionsMet = rule.conditions.every((condition) =>
          this.evaluateCondition(condition, context),
        );

        if (allConditionsMet) {
          matchedRules.push(rule.name);

          const { outputField, formula } = rule.action;
          try {
            const evalContext = { ...context, ...output };
            const formulaResult = mathEval(formula, evalContext) as unknown;

            switch (rule.action.type) {
              case 'set_value':
                output[outputField] = formulaResult;
                break;
              case 'add_value': {
                const current = typeof output[outputField] === 'number'
                  ? (output[outputField] as number)
                  : 0;
                output[outputField] = current + Number(formulaResult);
                break;
              }
              case 'multiply': {
                const base = typeof output[outputField] === 'number'
                  ? (output[outputField] as number)
                  : Number(context[outputField] ?? 0);
                output[outputField] = base * Number(formulaResult);
                break;
              }
            }
          } catch {
            // Formula evaluation error — skip this rule's action silently
          }
        }
      }
    }

    return {
      matchedRules,
      output,
      evaluatedAt: new Date(),
    };
  }

  private evaluateCondition(condition: RuleCondition, context: Record<string, unknown>): boolean {
    const value = getByPath(context, condition.field);

    switch (condition.operator) {
      case 'eq':
        // eslint-disable-next-line eqeqeq
        return value == condition.value;
      case 'neq':
        // eslint-disable-next-line eqeqeq
        return value != condition.value;
      case 'gt':
        return Number(value) > Number(condition.value);
      case 'gte':
        return Number(value) >= Number(condition.value);
      case 'lt':
        return Number(value) < Number(condition.value);
      case 'lte':
        return Number(value) <= Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && (condition.value as unknown[]).includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !(condition.value as unknown[]).includes(value);
      case 'contains':
        return String(value).includes(String(condition.value));
      default:
        return false;
    }
  }
}
