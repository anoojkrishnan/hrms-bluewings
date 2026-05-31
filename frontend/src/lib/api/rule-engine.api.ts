import { get, getList, post, put, del } from './client';

export interface RuleSet {
  publicId: string;
  name: string;
  module: string;
  ruleType: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  version: number;
  rules: Rule[];
  createdAt: string;
}

export interface Rule {
  publicId: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  formula?: string;
  action?: Record<string, unknown>;
  isActive: boolean;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface SimulateResult {
  matched: boolean;
  appliedRules: string[];
  result: Record<string, unknown>;
}

export const ruleEngineApi = {
  listRuleSets: (params?: { page?: number; limit?: number }) =>
    getList<RuleSet>('/rule-sets', { params }),

  createRuleSet: (data: {
    name: string;
    module: string;
    ruleType: string;
    effectiveFrom: string;
    isActive?: boolean;
  }) => post<RuleSet>('/rule-sets', data),

  updateRuleSet: (publicId: string, data: Partial<RuleSet>) =>
    put<RuleSet>(`/rule-sets/${publicId}`, data),

  listRules: (ruleSetPublicId: string) =>
    get<Rule[]>(`/rule-sets/${ruleSetPublicId}/rules`),

  addRule: (ruleSetPublicId: string, data: Partial<Rule>) =>
    post<Rule>(`/rule-sets/${ruleSetPublicId}/rules`, data),

  updateRule: (ruleSetPublicId: string, rulePublicId: string, data: Partial<Rule>) =>
    put<Rule>(`/rule-sets/${ruleSetPublicId}/rules/${rulePublicId}`, data),

  deleteRule: (ruleSetPublicId: string, rulePublicId: string) =>
    del<void>(`/rule-sets/${ruleSetPublicId}/rules/${rulePublicId}`),

  simulate: (ruleSetPublicId: string, data: { context: Record<string, unknown>; effectiveDate?: string }) =>
    post<SimulateResult>(`/rule-sets/${ruleSetPublicId}/simulate`, data),
};
