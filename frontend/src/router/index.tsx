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
const CompanyList     = lazy(() => import('@/pages/app/organization/CompanyList'));
const DepartmentList  = lazy(() => import('@/pages/app/organization/DepartmentList'));
const DesignationList = lazy(() => import('@/pages/app/organization/DesignationList'));
const LocationList    = lazy(() => import('@/pages/app/organization/LocationList'));

// Admin
const UserList = lazy(() => import('@/pages/app/admin/UserList'));
const RoleList = lazy(() => import('@/pages/app/admin/RoleList'));

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
