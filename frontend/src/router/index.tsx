import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { GuestGuard } from '@/components/guards/GuestGuard';
import { RouteGuard } from '@/components/guards/RouteGuard';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { ROUTES } from './routes';

const Login          = lazy(() => import('@/pages/auth/Login'));
const Signup         = lazy(() => import('@/pages/auth/Signup'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('@/pages/auth/ResetPassword'));
const EmailVerify    = lazy(() => import('@/pages/auth/EmailVerify'));
const Dashboard      = lazy(() => import('@/pages/app/Dashboard'));
const NotFound       = lazy(() => import('@/pages/public/NotFound'));
const Settings       = lazy(() => import('@/pages/app/Settings'));

// People
const EmployeeList   = lazy(() => import('@/pages/app/employees/EmployeeList'));
const EmployeeDetail = lazy(() => import('@/pages/app/employees/EmployeeDetail'));
const EmployeeCreate = lazy(() => import('@/pages/app/employees/EmployeeCreate'));

// Leave
const LeaveApplicationList = lazy(() => import('@/pages/app/leave/LeaveApplicationList'));
const LeaveBalance         = lazy(() => import('@/pages/app/leave/LeaveBalance'));
const LeaveTypeList        = lazy(() => import('@/pages/app/leave/LeaveTypeList'));

// Attendance
const AttendanceDashboard     = lazy(() => import('@/pages/app/attendance/AttendanceDashboard'));
const AttendanceList          = lazy(() => import('@/pages/app/attendance/AttendanceList'));
const AttendanceExceptionList = lazy(() => import('@/pages/app/attendance/AttendanceExceptionList'));

// Comms / Workflow
const NotificationList = lazy(() => import('@/pages/app/notifications/NotificationList'));
const ApprovalQueue    = lazy(() => import('@/pages/app/workflow/ApprovalQueue'));
const WorkflowList     = lazy(() => import('@/pages/app/workflow/WorkflowList'));
const RuleSetList      = lazy(() => import('@/pages/app/rules/RuleSetList'));
const FormList         = lazy(() => import('@/pages/app/forms/FormList'));

// Organisation
const CompanyList              = lazy(() => import('@/pages/app/organization/CompanyList'));
const DepartmentList           = lazy(() => import('@/pages/app/organization/DepartmentList'));
const DesignationList          = lazy(() => import('@/pages/app/organization/DesignationList'));
const LocationList             = lazy(() => import('@/pages/app/organization/LocationList'));
const AuthoritySignatureList   = lazy(() => import('@/pages/app/organization/AuthoritySignatureList'));

// Admin
const UserList = lazy(() => import('@/pages/app/admin/UserList'));
const RoleList = lazy(() => import('@/pages/app/admin/RoleList'));

// Phase 5
const ShiftList         = lazy(() => import('@/pages/app/attendance/ShiftList'));
const OvertimeList      = lazy(() => import('@/pages/app/attendance/OvertimeList'));
const ExpenseClaimList  = lazy(() => import('@/pages/app/expense/ExpenseClaimList'));
const LoanList          = lazy(() => import('@/pages/app/payroll/LoanList'));
const FnFPage           = lazy(() => import('@/pages/app/payroll/FnFPage'));

// Phase 6
const ReportsPage          = lazy(() => import('@/pages/app/reports/ReportsPage'));
const AnalyticsDashboard   = lazy(() => import('@/pages/app/reports/AnalyticsDashboard'));
const ApiClientList        = lazy(() => import('@/pages/app/integrations/ApiClientList'));
const WebhookList          = lazy(() => import('@/pages/app/integrations/WebhookList'));
const AccountingMappings   = lazy(() => import('@/pages/app/payroll/AccountingMappings'));

// Payroll
const PayrollDashboard      = lazy(() => import('@/pages/app/payroll/PayrollDashboard'));
const SalaryComponentList   = lazy(() => import('@/pages/app/payroll/SalaryComponentList'));
const SalaryStructureList   = lazy(() => import('@/pages/app/payroll/SalaryStructureList'));
const PayrollCycleList      = lazy(() => import('@/pages/app/payroll/PayrollCycleList'));
const PayrollRunList        = lazy(() => import('@/pages/app/payroll/PayrollRunList'));
const PayrollRunDetail      = lazy(() => import('@/pages/app/payroll/PayrollRunDetail'));
const PayrollInputsPage     = lazy(() => import('@/pages/app/payroll/PayrollInputsPage'));
const PayslipList           = lazy(() => import('@/pages/app/payroll/PayslipList'));
const StatutorySettings     = lazy(() => import('@/pages/app/payroll/StatutorySettings'));
const PayrollReportsPage    = lazy(() => import('@/pages/app/payroll/PayrollReportsPage'));
const SalaryAssignmentPage  = lazy(() => import('@/pages/app/payroll/SalaryAssignmentPage'));

// ── Helpers ────────────────────────────────────────────────────────────────

function P({ perm, anyOf, children }: { perm?: string; anyOf?: string[]; children: React.ReactNode }) {
  return <RouteGuard permission={perm} anyOf={anyOf}>{children}</RouteGuard>;
}

// ── Router ─────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  { path: ROUTES.LOGIN,           element: <GuestGuard><Login /></GuestGuard> },
  { path: ROUTES.SIGNUP,          element: <GuestGuard><Signup /></GuestGuard> },
  { path: ROUTES.FORGOT_PASSWORD, element: <GuestGuard><ForgotPassword /></GuestGuard> },
  { path: ROUTES.RESET_PASSWORD,  element: <ResetPassword /> },
  { path: ROUTES.VERIFY_EMAIL,    element: <EmailVerify /> },

  {
    path: '/',
    element: <AuthGuard><AppShell /></AuthGuard>,
    children: [
      { index: true,               element: <Dashboard /> },
      { path: ROUTES.DASHBOARD,    element: <Dashboard /> },

      // ── People ──────────────────────────────────────────────────────────
      {
        path: ROUTES.EMPLOYEES,
        element: <P perm="employee.profile.view"><EmployeeList /></P>,
      },
      {
        path: ROUTES.EMPLOYEE_CREATE,
        element: <P perm="employee.profile.create"><EmployeeCreate /></P>,
      },
      {
        path: ROUTES.EMPLOYEE_DETAIL,
        element: <P perm="employee.profile.view"><EmployeeDetail /></P>,
      },

      // ── Leave ────────────────────────────────────────────────────────────
      {
        path: ROUTES.LEAVE_APPLICATIONS,
        element: <P perm="leave.application.view"><LeaveApplicationList /></P>,
      },
      {
        path: ROUTES.LEAVE_BALANCE,
        element: <P perm="leave.balance.view"><LeaveBalance /></P>,
      },
      {
        path: ROUTES.LEAVE_TYPES,
        element: <P perm="leave.policy.configure"><LeaveTypeList /></P>,
      },

      // ── Attendance ───────────────────────────────────────────────────────
      {
        path: ROUTES.ATTENDANCE,
        element: <P perm="attendance.log.view"><AttendanceDashboard /></P>,
      },
      {
        path: ROUTES.ATTENDANCE_LOGS,
        element: <P perm="attendance.log.view"><AttendanceList /></P>,
      },
      {
        path: ROUTES.ATTENDANCE_EXCEPTIONS,
        element: <P perm="attendance.exception.view"><AttendanceExceptionList /></P>,
      },

      // ── Comms ────────────────────────────────────────────────────────────
      {
        path: ROUTES.NOTIFICATIONS,
        element: <P perm="notification.view"><NotificationList /></P>,
      },
      {
        path: ROUTES.APPROVAL_QUEUE,
        element: <P perm="workflow.instance.approve"><ApprovalQueue /></P>,
      },

      // ── Configuration ────────────────────────────────────────────────────
      {
        path: ROUTES.WORKFLOWS,
        element: <P perm="workflow.configure"><WorkflowList /></P>,
      },
      {
        path: ROUTES.RULE_SETS,
        element: <P perm="rule.configure"><RuleSetList /></P>,
      },
      {
        path: ROUTES.FORMS,
        element: <P perm="form.configure"><FormList /></P>,
      },

      // ── Organisation ─────────────────────────────────────────────────────
      {
        path: ROUTES.COMPANIES,
        element: <P perm="organization.company.view"><CompanyList /></P>,
      },
      {
        path: ROUTES.DEPARTMENTS,
        element: <P perm="organization.department.view"><DepartmentList /></P>,
      },
      {
        path: ROUTES.DESIGNATIONS,
        element: <P perm="organization.designation.view"><DesignationList /></P>,
      },
      {
        path: ROUTES.LOCATIONS,
        element: <P perm="organization.location.view"><LocationList /></P>,
      },
      {
        path: ROUTES.AUTHORITY_SIGNATURES,
        element: <P perm="organization.authority_signature.view"><AuthoritySignatureList /></P>,
      },

      // ── Admin ────────────────────────────────────────────────────────────
      {
        path: ROUTES.USERS,
        element: <P perm="rbac.role.view"><UserList /></P>,
      },
      {
        path: ROUTES.USERS_MGMT,
        element: <P perm="rbac.role.view"><UserList /></P>,
      },
      {
        path: ROUTES.ROLES,
        element: <P perm="rbac.role.view"><RoleList /></P>,
      },
      {
        path: ROUTES.SETTINGS,
        element: <P perm="tenant.settings.view"><Settings /></P>,
      },

      // ── Payroll ──────────────────────────────────────────────────────────
      {
        path: ROUTES.PAYROLL_DASHBOARD,
        element: <P anyOf={['payroll.run.view', 'payroll.payslip.view']}><PayrollDashboard /></P>,
      },
      {
        path: ROUTES.PAYROLL_COMPONENTS,
        element: <P perm="payroll.component.view"><SalaryComponentList /></P>,
      },
      {
        path: ROUTES.PAYROLL_STRUCTURES,
        element: <P perm="payroll.structure.view"><SalaryStructureList /></P>,
      },
      {
        path: ROUTES.PAYROLL_CYCLES,
        element: <P perm="payroll.cycle.manage"><PayrollCycleList /></P>,
      },
      {
        path: ROUTES.PAYROLL_RUNS,
        element: <P perm="payroll.run.view"><PayrollRunList /></P>,
      },
      {
        path: ROUTES.PAYROLL_RUN_DETAIL,
        element: <P perm="payroll.run.view"><PayrollRunDetail /></P>,
      },
      {
        path: ROUTES.PAYROLL_INPUTS,
        element: <P perm="payroll.run.edit"><PayrollInputsPage /></P>,
      },
      {
        path: ROUTES.PAYROLL_PAYSLIPS,
        element: <P anyOf={['payroll.payslip.view', 'payroll.run.view']}><PayslipList /></P>,
      },
      {
        path: ROUTES.PAYROLL_STATUTORY,
        element: <P perm="payroll.statutory.manage"><StatutorySettings /></P>,
      },
      {
        path: ROUTES.PAYROLL_REPORTS,
        element: <P perm="payroll.run.view"><PayrollReportsPage /></P>,
      },
      {
        path: ROUTES.EMPLOYEE_SALARY,
        element: <P perm="employee.salary.view"><SalaryAssignmentPage /></P>,
      },

      // ── Phase 5 ──────────────────────────────────────────────────────────
      {
        path: ROUTES.SHIFTS,
        element: <P perm="attendance.log.view"><ShiftList /></P>,
      },
      {
        path: ROUTES.OVERTIME,
        element: <P perm="attendance.overtime.view"><OvertimeList /></P>,
      },
      {
        path: ROUTES.EXPENSE_CLAIMS,
        element: <P perm="expense.claim.view"><ExpenseClaimList /></P>,
      },
      {
        path: ROUTES.PAYROLL_LOANS,
        element: <P perm="payroll.loan.view"><LoanList /></P>,
      },
      {
        path: ROUTES.PAYROLL_FNF,
        element: <P perm="payroll.fnf.view"><FnFPage /></P>,
      },

      // ── Phase 6 ──────────────────────────────────────────────────────────
      {
        path: ROUTES.REPORTS,
        element: <P perm="reports.standard.view"><ReportsPage /></P>,
      },
      {
        path: ROUTES.ANALYTICS,
        element: <P perm="reports.analytics.view"><AnalyticsDashboard /></P>,
      },
      {
        path: ROUTES.INTEGRATIONS,
        element: <P perm="integrations.api_client.manage"><ApiClientList /></P>,
      },
      {
        path: ROUTES.WEBHOOKS,
        element: <P perm="integrations.webhook.manage"><WebhookList /></P>,
      },
      {
        path: ROUTES.PAYROLL_ACCOUNTING,
        element: <P perm="payroll.run.view"><AccountingMappings /></P>,
      },
    ],
  },

  { path: ROUTES.NOT_FOUND, element: <NotFound /> },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
