import type { BaseDocument } from '@/shared/types/common';

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains';

export type RuleType =
  | 'leave_accrual'
  | 'leave_eligibility'
  | 'attendance_late'
  | 'attendance_overtime'
  | 'payroll_earnings'
  | 'payroll_deductions';

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export interface RuleAction {
  type: 'set_value' | 'add_value' | 'multiply';
  outputField: string;
  formula: string;
}

export interface RuleSet extends BaseDocument {
  name: string;
  module: string;
  ruleType: RuleType;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface Rule extends BaseDocument {
  ruleSetId: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  action: RuleAction;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
}

export interface EvaluationResult {
  matchedRules: string[];
  output: Record<string, unknown>;
  evaluatedAt: Date;
}

export interface CreateRuleSetDto {
  name: string;
  module: string;
  ruleType: RuleType;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UpdateRuleSetDto {
  name?: string;
  module?: string;
  ruleType?: RuleType;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CreateRuleDto {
  name: string;
  priority: number;
  conditions: RuleCondition[];
  action: RuleAction;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UpdateRuleDto {
  name?: string;
  priority?: number;
  conditions?: RuleCondition[];
  action?: RuleAction;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface SimulateDto {
  context: Record<string, unknown>;
  effectiveDate?: string;
}
