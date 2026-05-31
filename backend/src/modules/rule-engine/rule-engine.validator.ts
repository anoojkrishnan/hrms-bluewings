import { z } from 'zod';

const CONDITION_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'not_in',
  'contains',
] as const;

const RULE_TYPES = [
  'leave_accrual',
  'leave_eligibility',
  'attendance_late',
  'attendance_overtime',
  'payroll_earnings',
  'payroll_deductions',
] as const;

const ACTION_TYPES = ['set_value', 'add_value', 'multiply'] as const;

const conditionSchema = z.object({
  field: z.string().min(1, 'Condition field is required'),
  operator: z.enum(CONDITION_OPERATORS),
  value: z.unknown(),
});

const actionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  outputField: z.string().min(1, 'Output field is required'),
  formula: z.string().min(1, 'Formula is required'),
});

// ── RuleSet ────────────────────────────────────────────────────────────────────

export const createRuleSetSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    module: z.string().min(1, 'Module is required'),
    ruleType: z.enum(RULE_TYPES),
    effectiveFrom: z.string().datetime({ message: 'effectiveFrom must be a valid ISO datetime' }),
    effectiveTo: z.string().datetime({ message: 'effectiveTo must be a valid ISO datetime' }).optional(),
  }),
});

export const updateRuleSetSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    module: z.string().min(1).optional(),
    ruleType: z.enum(RULE_TYPES).optional(),
    isActive: z.boolean().optional(),
    effectiveFrom: z.string().datetime().optional(),
    effectiveTo: z.string().datetime().optional(),
  }),
});

// ── Rule ──────────────────────────────────────────────────────────────────────

export const createRuleSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    priority: z.number().int().min(0, 'Priority must be a non-negative integer'),
    conditions: z.array(conditionSchema).min(1, 'At least one condition is required'),
    action: actionSchema,
    effectiveFrom: z.string().datetime({ message: 'effectiveFrom must be a valid ISO datetime' }),
    effectiveTo: z.string().datetime({ message: 'effectiveTo must be a valid ISO datetime' }).optional(),
  }),
});

export const updateRuleSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    priority: z.number().int().min(0).optional(),
    conditions: z.array(conditionSchema).min(1).optional(),
    action: actionSchema.optional(),
    isActive: z.boolean().optional(),
    effectiveFrom: z.string().datetime().optional(),
    effectiveTo: z.string().datetime().optional(),
  }),
});

// ── Simulate ──────────────────────────────────────────────────────────────────

export const simulateSchema = z.object({
  body: z.object({
    context: z.record(z.unknown()),
    effectiveDate: z.string().datetime({ message: 'effectiveDate must be a valid ISO datetime' }).optional(),
  }),
});

export type CreateRuleSetInput = z.infer<typeof createRuleSetSchema>['body'];
export type UpdateRuleSetInput = z.infer<typeof updateRuleSetSchema>['body'];
export type CreateRuleInput = z.infer<typeof createRuleSchema>['body'];
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>['body'];
export type SimulateInput = z.infer<typeof simulateSchema>['body'];
