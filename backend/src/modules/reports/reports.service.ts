import { ReportsRepository } from './reports.repository';
import { ReportStatus, ReportCategory } from './reports.types';
import type { ReportTemplate, ReportJob, GenerateReportDto } from './reports.types';
import { generatePublicId } from '@/shared/utils/publicId';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';

// ── Template registry ──────────────────────────────────────────────────────

const TEMPLATES: ReportTemplate[] = [
  {
    key: 'employee-directory',
    name: 'Employee Directory',
    description: 'All employees with department, designation, location, and status.',
    category: ReportCategory.HR,
    params: [
      { key: 'status', label: 'Status', type: 'select', required: false, options: [
        { value: 'active', label: 'Active' }, { value: 'all', label: 'All' },
      ]},
    ],
  },
  {
    key: 'leave-summary',
    name: 'Leave Summary',
    description: 'Leave taken and balance per employee for a given year.',
    category: ReportCategory.LEAVE,
    params: [
      { key: 'year', label: 'Year', type: 'number', required: true },
    ],
  },
  {
    key: 'attendance-summary',
    name: 'Attendance Summary',
    description: 'Present/absent/late counts by employee for a month.',
    category: ReportCategory.ATTENDANCE,
    params: [
      { key: 'month', label: 'Month (1–12)', type: 'number', required: true },
      { key: 'year',  label: 'Year',         type: 'number', required: true },
    ],
  },
  {
    key: 'payroll-salary-register',
    name: 'Salary Register',
    description: 'Component-wise salary breakdown for all employees in a pay period.',
    category: ReportCategory.PAYROLL,
    params: [
      { key: 'companyId', label: 'Company', type: 'string', required: true },
      { key: 'month',     label: 'Month (1–12)', type: 'number', required: true },
      { key: 'year',      label: 'Year',         type: 'number', required: true },
    ],
  },
  {
    key: 'payroll-payout-register',
    name: 'Payout Register',
    description: 'Net pay, bank details, and deduction summary for a finalized run.',
    category: ReportCategory.PAYROLL,
    params: [
      { key: 'runPublicId', label: 'Payroll Run', type: 'string', required: true },
    ],
  },
  {
    key: 'loan-report',
    name: 'Loan Report',
    description: 'All employee loans with status, outstanding balance, and EMI.',
    category: ReportCategory.FINANCE,
    params: [
      { key: 'status', label: 'Status', type: 'select', required: false, options: [
        { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'all', label: 'All' },
      ]},
    ],
  },
  {
    key: 'expense-claims',
    name: 'Expense Claims',
    description: 'All expense claims with amounts, categories, and approval status.',
    category: ReportCategory.FINANCE,
    params: [
      { key: 'status', label: 'Status', type: 'select', required: false, options: [
        { value: 'submitted', label: 'Submitted' }, { value: 'approved', label: 'Approved' }, { value: 'all', label: 'All' },
      ]},
    ],
  },
  {
    key: 'overtime-report',
    name: 'Overtime Report',
    description: 'Overtime hours and comp-off grants by employee.',
    category: ReportCategory.ATTENDANCE,
    params: [
      { key: 'status', label: 'Status', type: 'select', required: false, options: [
        { value: 'approved', label: 'Approved' }, { value: 'all', label: 'All' },
      ]},
    ],
  },
];

// ── Service ────────────────────────────────────────────────────────────────

export class ReportsService {
  private repo = new ReportsRepository();

  listTemplates(): ReportTemplate[] {
    return TEMPLATES;
  }

  async generate(dto: GenerateReportDto, tenantId: string, orgId: string, userId: string): Promise<{ job: ReportJob; rows: Record<string, unknown>[]; headers: string[] }> {
    const template = TEMPLATES.find(t => t.key === dto.templateKey);
    if (!template) throw new AppError(404, ErrorCodes.NOT_FOUND, `Unknown report template: ${dto.templateKey}`);

    const job = await this.repo.createJob({
      publicId: generatePublicId('rpt_'),
      tenantId, organizationId: orgId,
      templateKey: dto.templateKey,
      params: dto.params,
      status: ReportStatus.PROCESSING,
      requestedBy: userId,
      isActive: true, createdBy: userId, updatedBy: userId, deletedAt: null,
    });

    try {
      const { rows, headers } = await this.runGenerator(dto.templateKey, dto.params, tenantId, orgId);
      await this.repo.updateJob(job.publicId, tenantId, {
        status: ReportStatus.DONE,
        rowCount: rows.length,
        completedAt: new Date(),
        updatedBy: userId,
      });
      return { job, rows, headers };
    } catch (err) {
      await this.repo.updateJob(job.publicId, tenantId, {
        status: ReportStatus.FAILED,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        updatedBy: userId,
      });
      throw err;
    }
  }

  async listJobs(tenantId: string, userId: string): Promise<ReportJob[]> {
    return this.repo.listJobs(tenantId, userId);
  }

  private async runGenerator(
    key: string,
    params: Record<string, unknown>,
    tenantId: string,
    orgId: string,
  ): Promise<{ rows: Record<string, unknown>[]; headers: string[] }> {
    switch (key) {
      case 'employee-directory':    return this.employeeDirectory(tenantId, orgId, params);
      case 'leave-summary':         return this.leaveSummary(tenantId, params);
      case 'attendance-summary':    return this.attendanceSummary(tenantId, params);
      case 'payroll-salary-register': return this.payrollSalaryRegister(tenantId, params);
      case 'payroll-payout-register': return this.payrollPayoutRegister(tenantId, params);
      case 'loan-report':           return this.loanReport(tenantId, params);
      case 'expense-claims':        return this.expenseClaimsReport(tenantId, params);
      case 'overtime-report':       return this.overtimeReport(tenantId, params);
      default: throw new AppError(400, ErrorCodes.VALIDATION_ERROR, `Unknown template: ${key}`);
    }
  }

  private async employeeDirectory(tenantId: string, orgId: string, params: Record<string, unknown>) {
    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const { OrganizationRepository } = await import('@/modules/organization/organization.repository');
    const empRepo  = new EmployeeRepository();
    const orgRepo  = new OrganizationRepository();

    const statusFilter = (params.status && params.status !== 'all') ? { status: params.status } : {};
    const result = await empRepo.findEmployees(tenantId, orgId, statusFilter, 1, 5000);

    const [companies, departments, designations, locations] = await Promise.all([
      orgRepo.findCompaniesByTenant(tenantId),
      orgRepo.findDepartmentsByOrg(tenantId, orgId),
      orgRepo.findDesignationsByOrg(tenantId, orgId),
      orgRepo.findLocationsByOrg(tenantId, orgId),
    ]);
    const compMap  = new Map(companies.map(c => [c.publicId, c.name]));
    const deptMap  = new Map(departments.map(d => [d.publicId, d.name]));
    const desiMap  = new Map(designations.map(d => [d.publicId, d.name]));
    const locMap   = new Map(locations.map(l => [l.publicId, l.name]));

    const headers = ['Employee Code', 'Company', 'Department', 'Designation', 'Location', 'Employment Type', 'Status', 'Joining Date'];
    const rows = result.data.map(e => ({
      'Employee Code':   e.employeeCode,
      'Company':         compMap.get(e.companyId ?? '') ?? e.companyId ?? '—',
      'Department':      deptMap.get(e.departmentId ?? '') ?? '—',
      'Designation':     desiMap.get(e.designationId ?? '') ?? '—',
      'Location':        locMap.get(e.locationId ?? '') ?? '—',
      'Employment Type': e.employmentType.replace(/_/g, ' '),
      'Status':          e.status,
      'Joining Date':    e.joiningDate ? new Date(e.joiningDate).toLocaleDateString('en-IN') : '—',
    }));

    return { rows, headers };
  }

  private async leaveSummary(tenantId: string, params: Record<string, unknown>) {
    const year = Number(params.year ?? new Date().getFullYear());
    const { LeaveRepository } = await import('@/modules/leave/leave.repository');
    const leaveRepo = new LeaveRepository();

    const balances = await leaveRepo.findAllBalances(tenantId, year);
    const headers = ['Employee ID', 'Leave Type', 'Opening Balance', 'Accrued', 'Taken', 'Closing Balance'];
    const rows = balances.map(b => ({
      'Employee ID':      b.employeeId,
      'Leave Type':       b.leaveTypeId,
      'Opening Balance':  b.openingBalance ?? 0,
      'Accrued':          b.accrued ?? 0,
      'Taken':            b.taken ?? 0,
      'Closing Balance':  b.closingBalance ?? 0,
    }));
    return { rows, headers };
  }

  private async attendanceSummary(tenantId: string, params: Record<string, unknown>) {
    const month = Number(params.month ?? new Date().getMonth() + 1);
    const year  = Number(params.year  ?? new Date().getFullYear());
    const { AttendanceRepository } = await import('@/modules/attendance/attendance.repository');
    const attRepo = new AttendanceRepository();

    const from = new Date(year, month - 1, 1);
    const to   = new Date(year, month, 0);
    const result = await attRepo.findLogsByTenant(tenantId, undefined, from, to, 1, 5000);

    // Group by employee
    const empMap = new Map<string, { present: number; absent: number; late: number }>();
    for (const log of result.data) {
      const existing = empMap.get(log.employeeId) ?? { present: 0, absent: 0, late: 0 };
      const s = log.status as string;
      if (s === 'present' || s === 'work_from_home') existing.present++;
      if (s === 'absent') existing.absent++;
      if (log.isLate) existing.late++;
      empMap.set(log.employeeId, existing);
    }

    const headers = ['Employee ID', 'Present Days', 'Absent Days', 'Late Days'];
    const rows = Array.from(empMap.entries()).map(([empId, counts]) => ({
      'Employee ID':   empId,
      'Present Days':  counts.present,
      'Absent Days':   counts.absent,
      'Late Days':     counts.late,
    }));
    return { rows, headers };
  }

  private async payrollSalaryRegister(tenantId: string, params: Record<string, unknown>) {
    const { PayrollService } = await import('@/modules/payroll/payroll.service');
    const payrollService = new PayrollService();
    const rows = await payrollService.salaryRegister(
      tenantId, String(params.companyId ?? ''), Number(params.month), Number(params.year),
    );
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { rows, headers };
  }

  private async payrollPayoutRegister(tenantId: string, params: Record<string, unknown>) {
    const { PayrollService } = await import('@/modules/payroll/payroll.service');
    const payrollService = new PayrollService();
    const rows = await payrollService.payoutRegister(tenantId, String(params.runPublicId ?? ''));
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { rows, headers };
  }

  private async loanReport(tenantId: string, params: Record<string, unknown>) {
    const { PayrollRepository } = await import('@/modules/payroll/payroll.repository');
    const repo = new PayrollRepository();
    const status = (params.status && params.status !== 'all') ? String(params.status) : undefined;
    const loans = await repo.findAllLoans(tenantId, status);
    const headers = ['Loan ID', 'Employee ID', 'Amount', 'Tenure (months)', 'EMI', 'Status', 'Purpose'];
    const rows = loans.map(l => ({
      'Loan ID':         l.publicId,
      'Employee ID':     l.employeeId,
      'Amount':          l.amount,
      'Tenure (months)': l.tenureMonths,
      'EMI':             l.emi ?? '—',
      'Status':          l.status,
      'Purpose':         l.purpose,
    }));
    return { rows, headers };
  }

  private async expenseClaimsReport(tenantId: string, params: Record<string, unknown>) {
    const { ExpenseRepository } = await import('@/modules/expense/expense.repository');
    const repo = new ExpenseRepository();
    const status = (params.status && params.status !== 'all') ? String(params.status) : undefined;
    const result = await repo.findClaims(tenantId, status ? { status } : {}, 1, 5000);
    const headers = ['Claim ID', 'Employee ID', 'Title', 'Total Amount', 'Status', 'Submitted At'];
    const rows = result.data.map(c => ({
      'Claim ID':     c.publicId,
      'Employee ID':  c.employeeId,
      'Title':        c.title,
      'Total Amount': c.totalAmount,
      'Status':       c.status,
      'Submitted At': c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-IN') : '—',
    }));
    return { rows, headers };
  }

  private async overtimeReport(tenantId: string, params: Record<string, unknown>) {
    const { AttendanceRepository } = await import('@/modules/attendance/attendance.repository');
    const repo = new AttendanceRepository();
    const status = (params.status && params.status !== 'all') ? String(params.status) : undefined;
    const records = await repo.findOvertimeRecords(tenantId, undefined, status);
    const headers = ['OT ID', 'Employee ID', 'Date', 'Hours', 'Reason', 'Status', 'Comp-Off Granted'];
    const rows = records.map(r => ({
      'OT ID':            r.publicId,
      'Employee ID':      r.employeeId,
      'Date':             new Date(r.date).toLocaleDateString('en-IN'),
      'Hours':            r.overtimeHours,
      'Reason':           r.reason,
      'Status':           r.status,
      'Comp-Off Granted': r.compOffGranted ? 'Yes' : 'No',
    }));
    return { rows, headers };
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async headcountAnalytics(tenantId: string, orgId: string) {
    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();
    const result = await empRepo.findEmployees(tenantId, orgId, { status: 'active' }, 1, 5000);
    const total = result.meta.total;

    // Group by department
    const deptCount = new Map<string, number>();
    for (const emp of result.data) {
      const key = emp.departmentId ?? 'Unassigned';
      deptCount.set(key, (deptCount.get(key) ?? 0) + 1);
    }
    const byDepartment = Array.from(deptCount.entries())
      .map(([deptId, count]) => ({ deptId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { total, byDepartment };
  }

  async attritionAnalytics(tenantId: string, orgId: string, from: string, to: string) {
    const { EmployeeRepository } = await import('@/modules/employee/employee.repository');
    const empRepo = new EmployeeRepository();
    const result = await empRepo.findEmployees(tenantId, orgId, { status: 'separated' }, 1, 5000);
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    const separated = result.data.filter(e =>
      e.lastWorkingDate && new Date(e.lastWorkingDate) >= fromDate && new Date(e.lastWorkingDate) <= toDate,
    );
    return { count: separated.length, period: { from, to } };
  }

  async payrollCostAnalytics(tenantId: string, companyId: string, month: number, year: number) {
    const { PayrollService } = await import('@/modules/payroll/payroll.service');
    const payrollService = new PayrollService();
    const rows = await payrollService.salaryRegister(tenantId, companyId, month, year);
    const grossPay = rows.reduce((s, r) => s + (Number(r.grossPay) || 0), 0);
    const netPay   = rows.reduce((s, r) => s + (Number(r.netPay)   || 0), 0);
    const deductions = grossPay - netPay;
    return { employeeCount: rows.length, grossPay, netPay, deductions, month, year };
  }
}
