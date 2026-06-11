import { z } from 'zod';
import { ComponentType, FormulaType, PayrollFrequency } from './payroll.types';
import { paginationSchema } from '@/shared/validators/common.schemas';

// ── Salary Components ──────────────────────────────────────────────────────

export const createSalaryComponentSchema = z.object({
  body: z.object({
    code:             z.string().min(1).max(20),
    name:             z.string().min(1).max(100),
    type:             z.nativeEnum(ComponentType),
    formulaType:      z.nativeEnum(FormulaType),
    defaultAmount:    z.number().min(0).optional(),
    defaultPercentage: z.number().min(0).max(500).optional(),
    formula:          z.string().optional(),
    isTaxable:        z.boolean().default(true),
    isVisible:        z.boolean().default(true),
    displayOrder:     z.number().int().min(0).default(0),
    description:      z.string().optional(),
  }).refine((d) => {
    if (d.formulaType === FormulaType.FIXED_AMOUNT && d.defaultAmount === undefined) return false;
    if ((d.formulaType === FormulaType.PERCENTAGE_OF_BASIC || d.formulaType === FormulaType.PERCENTAGE_OF_GROSS) && d.defaultPercentage === undefined) return false;
    if (d.formulaType === FormulaType.FORMULA && !d.formula) return false;
    return true;
  }, { message: 'A matching resolution value is required for the chosen formulaType (defaultAmount / defaultPercentage / formula)' }),
});

export const updateSalaryComponentSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name:             z.string().min(1).max(100).optional(),
    type:             z.nativeEnum(ComponentType).optional(),
    formulaType:      z.nativeEnum(FormulaType).optional(),
    defaultAmount:    z.number().min(0).optional(),
    defaultPercentage: z.number().min(0).max(500).optional(),
    formula:          z.string().optional(),
    isTaxable:        z.boolean().optional(),
    isVisible:        z.boolean().optional(),
    displayOrder:     z.number().int().min(0).optional(),
    description:      z.string().optional(),
  }),
});

// ── Salary Structures ──────────────────────────────────────────────────────

const structureComponentSchema = z.object({
  componentCode:       z.string().min(1),
  overrideFormulaType: z.nativeEnum(FormulaType).optional(),
  overrideAmount:      z.number().min(0).optional(),
  overridePercentage:  z.number().min(0).max(500).optional(),
  overrideFormula:     z.string().optional(),
});

export const createSalaryStructureSchema = z.object({
  body: z.object({
    code:        z.string().min(1).max(30),
    name:        z.string().min(1).max(100),
    description: z.string().optional(),
    components:  z.array(structureComponentSchema).min(1, 'At least one component required'),
  }),
});

export const updateSalaryStructureSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name:        z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    components:  z.array(structureComponentSchema).optional(),
  }),
});

// ── Employee Salary ────────────────────────────────────────────────────────

const salaryOverrideSchema = z.object({
  componentCode: z.string().min(1),
  amount:        z.number().min(0).optional(),
  percentage:    z.number().min(0).max(500).optional(),
});

export const assignSalarySchema = z.object({
  body: z.object({
    structurePublicId:  z.string().min(1),
    effectiveFrom:      z.string().datetime(),
    ctc:                z.number().min(0).optional(),
    componentOverrides: z.array(salaryOverrideSchema).optional(),
  }),
});

export const reviseSalarySchema = z.object({
  body: z.object({
    structurePublicId:  z.string().min(1),
    effectiveFrom:      z.string().datetime(),
    ctc:                z.number().min(0).optional(),
    componentOverrides: z.array(salaryOverrideSchema).optional(),
    arrearsFlag:        z.boolean().optional(),
    revisionNote:       z.string().optional(),
  }),
});

// ── Payroll Cycles ─────────────────────────────────────────────────────────

export const createPayrollCycleSchema = z.object({
  body: z.object({
    companyId:  z.string().min(1),
    name:       z.string().min(1).max(100),
    frequency:  z.nativeEnum(PayrollFrequency).optional().default(PayrollFrequency.MONTHLY),
    payDay:     z.number().int().min(1).max(31),
    cutoffDay:  z.number().int().min(1).max(31),
  }),
});

export const updatePayrollCycleSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name:      z.string().min(1).max(100).optional(),
    payDay:    z.number().int().min(1).max(31).optional(),
    cutoffDay: z.number().int().min(1).max(31).optional(),
  }),
});

// ── Payroll Runs ───────────────────────────────────────────────────────────

export const createPayrollRunSchema = z.object({
  body: z.object({
    companyId:      z.string().min(1),
    cyclePublicId:  z.string().min(1),
    month:          z.number().int().min(1).max(12),
    year:           z.number().int().min(2020).max(2099),
  }),
});

export const rollbackRunSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
  }),
});

export const listRunsSchema = z.object({
  query: paginationSchema.extend({
    companyId: z.string().optional(),
  }),
});

// ── Payroll Inputs ─────────────────────────────────────────────────────────

export const upsertPayrollInputsSchema = z.object({
  params: z.object({ runPublicId: z.string().min(1) }),
  body: z.object({
    inputs: z.array(z.object({
      employeeCode:   z.string().min(1),
      lopDays:        z.number().min(0).max(31).optional(),
      bonusAmount:    z.number().min(0).optional(),
      adhocEarnings:  z.array(z.object({ label: z.string().min(1), amount: z.number().min(0) })).optional(),
      adhocDeductions: z.array(z.object({ label: z.string().min(1), amount: z.number().min(0) })).optional(),
      notes:          z.string().optional(),
    })).min(1),
  }),
});

// ── Statutory Settings ─────────────────────────────────────────────────────

export const upsertStatutorySchema = z.object({
  body: z.object({
    pfEnabled:        z.boolean(),
    pfEmployeeRate:   z.number().min(0).max(100).default(12),
    pfEmployerRate:   z.number().min(0).max(100).default(12),
    pfWageCeiling:    z.number().min(0).default(15000),
    esiEnabled:       z.boolean(),
    esiEmployeeRate:  z.number().min(0).max(100).default(0.75),
    esiEmployerRate:  z.number().min(0).max(100).default(3.25),
    esiWageCeiling:   z.number().min(0).default(21000),
    ptEnabled:        z.boolean(),
    ptState:          z.string().max(5).default(''),
    ptSlabs:          z.array(z.object({
      upTo:   z.number().min(0),
      amount: z.number().min(0),
    })).default([]),
    tdsEnabled:       z.boolean(),
    tdsDefaultRate:   z.number().min(0).max(50).default(0),
  }),
});

// ── Loans ──────────────────────────────────────────────────────────────────

export const requestLoanSchema = z.object({
  body: z.object({
    amount:       z.number().int().min(1000, 'Minimum loan amount is ₹1,000'),
    tenureMonths: z.number().int().min(1).max(60),
    purpose:      z.string().min(5).max(500),
    companyId:    z.string().min(1).optional(),
  }),
});

export const rejectLoanSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    rejectionReason: z.string().min(5).max(500),
  }),
});

// ── FnF ────────────────────────────────────────────────────────────────────

export const initiateFnFSchema = z.object({
  params: z.object({ employeeCode: z.string().min(1) }),
  body: z.object({
    bonusAmount:   z.number().min(0).default(0),
    assetRecovery: z.number().min(0).default(0),
    notes:         z.string().optional(),
  }),
});
