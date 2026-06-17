import { evaluate } from 'mathjs';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import {
  ComponentType, FormulaType,
  type SalaryComponent, type SalaryStructure, type SalaryStructureComponent,
  type EmployeeSalaryComponent, type PayrollInput, type StatutorySettings,
  type PayrollComponentLine, type PTSlab,
  type EmployeeSalaryComponentOverride,
} from './payroll.types';

export interface CalculationContext {
  employeeId:       string;
  structureId:      string;
  salaryAssignment: EmployeeSalaryComponent;
  structure:        SalaryStructure;
  components:       Map<string, SalaryComponent>;  // code → component
  statutory:        StatutorySettings;
  inputs:           PayrollInput | null;
  payPeriod:        { month: number; year: number };
}

export interface CalculationResult {
  earnings:         PayrollComponentLine[];
  deductions:       PayrollComponentLine[];
  grossPay:         number;
  totalDeductions:  number;
  netPay:           number;
  lopDays:          number;
  presentDays:      number;
  workingDays:      number;
  pfEmployee:       number;
  pfEmployer:       number;
  esiEmployee:      number;
  esiEmployer:      number;
  professionalTax:  number;
  tds:              number;
}

export class PayrollCalculator {

  calculate(ctx: CalculationContext): CalculationResult {
    const { month, year } = ctx.payPeriod;
    const workingDays = this.getWorkingDays(year, month);
    const lopDays     = Math.min(ctx.inputs?.lopDays ?? 0, workingDays);
    const presentDays = workingDays - lopDays;
    const ctc         = ctx.salaryAssignment.ctc ?? 0;

    // Initial formula variables
    const vars: Record<string, number> = {
      basic: 0, gross: 0, ctc,
      workingDays, presentDays, lopDays,
    };

    const earnings:   PayrollComponentLine[] = [];
    const deductions: PayrollComponentLine[] = [];

    // ── Pass 1: BASIC component ──────────────────────────────────────────
    const basicStructComp = ctx.structure.components.find(
      (c) => c.componentCode.toUpperCase() === 'BASIC',
    );
    if (basicStructComp) {
      const basicDef = ctx.components.get('BASIC');
      if (basicDef && basicDef.type === ComponentType.EARNING) {
        const empOverride = ctx.salaryAssignment.componentOverrides.find(
          (o) => o.componentCode.toUpperCase() === 'BASIC',
        );
        vars.basic = this.resolveAmount('BASIC', basicDef, basicStructComp, empOverride, vars);
      }
    }

    // Pre-populate vars with 0 for all component codes so forward references in formulas don't fail
    for (const sc of ctx.structure.components) {
      const code = sc.componentCode;
      vars[code.toUpperCase()] = 0;
      vars[code.toLowerCase()] = 0;
      vars[code] = 0;
    }

    // ── Pass 2: All EARNING components ───────────────────────────────────
    for (const structComp of ctx.structure.components) {
      const def = ctx.components.get(structComp.componentCode.toUpperCase());
      if (!def || def.type !== ComponentType.EARNING) continue;
      if (def.formulaType === FormulaType.STATUTORY) continue;

      const empOverride = ctx.salaryAssignment.componentOverrides.find(
        (o) => o.componentCode.toUpperCase() === structComp.componentCode.toUpperCase(),
      );
      const amount = this.resolveAmount(structComp.componentCode, def, structComp, empOverride, vars);

      earnings.push({ componentCode: def.code, componentName: def.name, type: def.type, amount });

      // Expose this component's amount in vars so later formulas can reference it by code
      const upperCode = def.code.toUpperCase();
      const lowerCode = def.code.toLowerCase();
      vars[upperCode] = amount;
      vars[lowerCode] = amount;
      vars[def.code]  = amount;

      // Update vars.gross incrementally so later formulas can reference it
      if (upperCode === 'BASIC') vars.basic = amount;
      vars.gross = earnings.reduce((s, e) => s + e.amount, 0);
    }

    // ── Bonus from inputs ────────────────────────────────────────────────
    if (ctx.inputs?.bonusAmount && ctx.inputs.bonusAmount > 0) {
      earnings.push({
        componentCode: '_BONUS',
        componentName: 'Bonus',
        type: ComponentType.EARNING,
        amount: ctx.inputs.bonusAmount,
      });
      vars.gross = earnings.reduce((s, e) => s + e.amount, 0);
    }

    // ── Ad-hoc earnings from inputs ──────────────────────────────────────
    for (const ae of ctx.inputs?.adhocEarnings ?? []) {
      earnings.push({ componentCode: '_ADHOC_E', componentName: ae.label, type: ComponentType.EARNING, amount: ae.amount });
      vars.gross += ae.amount;
    }

    const grossPay = round2(vars.gross);

    // ── Statutory deductions ─────────────────────────────────────────────
    const stat = this.computeStatutory(grossPay, vars.basic, ctx.statutory);

    // ── LOP deduction ────────────────────────────────────────────────────
    if (lopDays > 0 && vars.basic > 0) {
      const lopAmount = round2((vars.basic / workingDays) * lopDays);
      deductions.push({
        componentCode: 'LOP',
        componentName: 'Loss of Pay',
        type: ComponentType.DEDUCTION,
        amount: lopAmount,
      });
    }

    // ── Structure DEDUCTION components ───────────────────────────────────
    for (const structComp of ctx.structure.components) {
      const def = ctx.components.get(structComp.componentCode.toUpperCase());
      if (!def || def.type !== ComponentType.DEDUCTION) continue;
      if (def.formulaType === FormulaType.STATUTORY) continue;

      const empOverride = ctx.salaryAssignment.componentOverrides.find(
        (o) => o.componentCode.toUpperCase() === structComp.componentCode.toUpperCase(),
      );
      const amount = this.resolveAmount(structComp.componentCode, def, structComp, empOverride, vars);
      if (amount > 0) {
        deductions.push({ componentCode: def.code, componentName: def.name, type: def.type, amount });
      }
    }

    // ── Statutory deduction lines ────────────────────────────────────────
    if (ctx.statutory.pfEnabled && stat.pfEmployee > 0)
      deductions.push({ componentCode: 'PF_EE',  componentName: 'PF (Employee)',      type: ComponentType.DEDUCTION, amount: stat.pfEmployee });
    if (ctx.statutory.esiEnabled && stat.esiEmployee > 0)
      deductions.push({ componentCode: 'ESI_EE', componentName: 'ESI (Employee)',     type: ComponentType.DEDUCTION, amount: stat.esiEmployee });
    if (ctx.statutory.ptEnabled && stat.professionalTax > 0)
      deductions.push({ componentCode: 'PT',     componentName: 'Professional Tax',   type: ComponentType.DEDUCTION, amount: stat.professionalTax });
    if (ctx.statutory.tdsEnabled && stat.tds > 0)
      deductions.push({ componentCode: 'TDS',    componentName: 'TDS',                type: ComponentType.DEDUCTION, amount: stat.tds });

    // ── Ad-hoc deductions from inputs ────────────────────────────────────
    for (const ad of ctx.inputs?.adhocDeductions ?? []) {
      deductions.push({ componentCode: '_ADHOC_D', componentName: ad.label, type: ComponentType.DEDUCTION, amount: ad.amount });
    }

    const totalDeductions = round2(deductions.reduce((s, d) => s + d.amount, 0));
    const netPay          = round2(grossPay - totalDeductions);

    return {
      earnings, deductions,
      grossPay, totalDeductions, netPay,
      lopDays, presentDays, workingDays,
      pfEmployee:      stat.pfEmployee,
      pfEmployer:      stat.pfEmployer,
      esiEmployee:     stat.esiEmployee,
      esiEmployer:     stat.esiEmployer,
      professionalTax: stat.professionalTax,
      tds:             stat.tds,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private resolveAmount(
    code: string,
    def: SalaryComponent,
    structComp: SalaryStructureComponent,
    empOverride: EmployeeSalaryComponentOverride | undefined,
    vars: Record<string, number>,
  ): number {
    // Priority: employee override > structure override > component default
    let formulaType = def.formulaType;
    let amount      = def.defaultAmount;
    let pct         = def.defaultPercentage;
    let formula     = def.formula;

    if (structComp.overrideFormulaType) {
      formulaType = structComp.overrideFormulaType;
      amount      = structComp.overrideAmount;
      pct         = structComp.overridePercentage;
      formula     = structComp.overrideFormula;
    }

    if (empOverride) {
      if (empOverride.amount !== undefined) return round2(empOverride.amount);
      if (empOverride.percentage !== undefined) {
        const base = formulaType === FormulaType.PERCENTAGE_OF_GROSS ? vars.gross : vars.basic;
        return round2(base * empOverride.percentage / 100);
      }
    }

    switch (formulaType) {
      case FormulaType.FIXED_AMOUNT:
        return round2(amount ?? 0);

      case FormulaType.PERCENTAGE_OF_BASIC:
        return round2(vars.basic * (pct ?? 0) / 100);

      case FormulaType.PERCENTAGE_OF_GROSS:
        return round2(vars.gross * (pct ?? 0) / 100);

      case FormulaType.FORMULA: {
        if (!formula) return 0;
        try {
          // Spread all vars (includes component codes from prior passes) plus case aliases
          const scope = {
            ...vars,
            Basic: vars.basic, BASIC: vars.basic,
            Gross: vars.gross, GROSS: vars.gross,
            Ctc: vars.ctc,   CTC:   vars.ctc,
            WorkingDays: vars.workingDays, WORKING_DAYS: vars.workingDays,
            PresentDays: vars.presentDays, PRESENT_DAYS: vars.presentDays,
            LopDays:     vars.lopDays,     LOP_DAYS:     vars.lopDays,
          };
          const result = evaluate(formula, scope);
          if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
            throw new Error(`Non-numeric result: ${String(result)}`);
          }
          return round2(Math.max(0, result));
        } catch (err) {
          throw new AppError(500, ErrorCodes.PAYROLL_FORMULA_ERROR,
            `Formula error in component '${code}': ${String(err)}`);
        }
      }

      case FormulaType.STATUTORY:
        return 0; // Statutory handled separately

      default:
        return 0;
    }
  }

  private computeStatutory(grossPay: number, basic: number, s: StatutorySettings): {
    pfEmployee: number; pfEmployer: number;
    esiEmployee: number; esiEmployer: number;
    professionalTax: number; tds: number;
  } {
    const pfBase = Math.min(basic, s.pfWageCeiling);

    const pfEmployee    = s.pfEnabled  ? round2(pfBase * s.pfEmployeeRate  / 100) : 0;
    const pfEmployer    = s.pfEnabled  ? round2(pfBase * s.pfEmployerRate  / 100) : 0;
    const esiEmployee   = s.esiEnabled && grossPay <= s.esiWageCeiling
      ? round2(grossPay * s.esiEmployeeRate / 100) : 0;
    const esiEmployer   = s.esiEnabled && grossPay <= s.esiWageCeiling
      ? round2(grossPay * s.esiEmployerRate / 100) : 0;
    const professionalTax = s.ptEnabled ? this.computePT(grossPay, s.ptSlabs) : 0;
    // Monthly TDS = annualized gross * rate / 100 / 12
    const tds = s.tdsEnabled ? round2(grossPay * 12 * s.tdsDefaultRate / 100 / 12) : 0;

    return { pfEmployee, pfEmployer, esiEmployee, esiEmployer, professionalTax, tds };
  }

  private computePT(gross: number, slabs: PTSlab[]): number {
    if (!slabs.length) return 0;
    const sorted = [...slabs].sort((a, b) => {
      if (a.upTo === 0) return 1;
      if (b.upTo === 0) return -1;
      return a.upTo - b.upTo;
    });
    for (const slab of sorted) {
      if (slab.upTo === 0 || gross <= slab.upTo) return slab.amount;
    }
    return 0;
  }

  private getWorkingDays(year: number, month: number): number {
    const daysInMonth = new Date(year, month, 0).getDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0 && day !== 6) count++; // exclude Sun=0, Sat=6
    }
    return count;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
