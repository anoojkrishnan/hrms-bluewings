export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  ROLES: '/roles',
  SETTINGS: '/settings',
  // Employees
  EMPLOYEES: '/employees',
  EMPLOYEE_DETAIL: '/employees/:employeeCode',
  EMPLOYEE_CREATE: '/employees/new',
  // Leave
  LEAVE_APPLICATIONS: '/leave/applications',
  LEAVE_BALANCE: '/leave/balance',
  LEAVE_TYPES: '/leave/types',
  // Attendance
  ATTENDANCE: '/attendance',
  ATTENDANCE_LOGS: '/attendance/logs',
  ATTENDANCE_EXCEPTIONS: '/attendance/exceptions',
  // Phase 3
  NOTIFICATIONS: '/notifications',
  APPROVAL_QUEUE: '/approvals',
  WORKFLOWS: '/settings/workflows',
  RULE_SETS: '/settings/rules',
  FORMS: '/settings/forms',
  FORM_VIEW: '/forms/:formPublicId',
  // Organisation settings
  COMPANIES: '/settings/companies',
  DEPARTMENTS: '/settings/departments',
  DESIGNATIONS: '/settings/designations',
  LOCATIONS: '/settings/locations',
  // Admin
  USERS_MGMT: '/admin/users',
  NOT_FOUND: '*',
} as const;
