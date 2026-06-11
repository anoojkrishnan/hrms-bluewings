import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import { organizationApi } from '@/lib/api/organization.api';
import { employeeApi } from '@/lib/api/employee.api';
import { leaveApi } from '@/lib/api/leave.api';
import { attendanceApi } from '@/lib/api/attendance.api';
import { payrollApi } from '@/lib/api/payroll.api';
import { expenseApi } from '@/lib/api/expense.api';
import { reportsApi } from '@/lib/api/reports.api';
import { ROUTES } from '@/router/routes';

// ── Inline SVG icon ──────────────────────────────────────────────────────────

const PATHS: Record<string, string> = {
  building:     'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z',
  users:        'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  identification:'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  calendar:     'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
  puzzle:       'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z',
  stack:        'M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3',
  refresh:      'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  play:         'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z',
  check:        'M4.5 12.75l6 6 9-13.5',
  clock:        'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  exclamation:  'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z',
  banknotes:    'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75',
  chart:        'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  arrow:        'M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3',
  lock:         'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
  map:          'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  scale:        'M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.589-1.202L18.75 4.97zm-16.5 0c-.99.143-1.99.317-2.99.52m2.99-.52L5.13 15.696c-.122.499.106 1.028.589 1.202a5.989 5.989 0 002.031.352 5.989 5.989 0 002.031-.352c.483-.174.711-.703.589-1.202L5.25 4.97z',
};

function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.6 }: { name: string; size?: number; color?: string; strokeWidth?: number }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={strokeWidth} stroke={color} width={size} height={size} style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

// ── Setup step definitions ────────────────────────────────────────────────────

interface SetupStep {
  key:       string;
  label:     string;
  icon:      string;
  route:     string;
  perm?:     string;
  detail?:   string;
}

const SETUP_STEPS: SetupStep[] = [
  { key: 'company',    label: 'Company',          icon: 'building',       route: ROUTES.COMPANIES,          perm: 'organization.company.view',  detail: 'Legal entity for payroll' },
  { key: 'department', label: 'Departments',       icon: 'stack',          route: ROUTES.DEPARTMENTS,        perm: 'organization.department.view', detail: 'Org structure for approvals' },
  { key: 'designation',label: 'Designations',      icon: 'identification', route: ROUTES.DESIGNATIONS,       perm: 'organization.designation.view', detail: 'Job titles' },
  { key: 'employee',   label: 'Employees',         icon: 'users',          route: ROUTES.EMPLOYEES,          perm: 'employee.profile.view',      detail: 'People in the system' },
  { key: 'leavetype',  label: 'Leave Types',       icon: 'calendar',       route: ROUTES.LEAVE_TYPES,        perm: 'leave.policy.configure',     detail: 'Annual, Sick, Casual etc.' },
  { key: 'component',  label: 'Salary Components', icon: 'puzzle',         route: ROUTES.PAYROLL_COMPONENTS, perm: 'payroll.component.view',     detail: 'Basic, HRA, PF etc.' },
  { key: 'structure',  label: 'Salary Structure',  icon: 'stack',          route: ROUTES.PAYROLL_STRUCTURES, perm: 'payroll.structure.view',     detail: 'Bundle components' },
  { key: 'cycle',      label: 'Pay Cycle',         icon: 'refresh',        route: ROUTES.PAYROLL_CYCLES,     perm: 'payroll.cycle.manage',       detail: 'Pay day and cutoff' },
  { key: 'statutory',  label: 'Statutory',         icon: 'scale',          route: ROUTES.PAYROLL_STATUTORY,  perm: 'payroll.statutory.manage',   detail: 'PF, ESI, PT, TDS' },
  { key: 'payroll',    label: 'First Payroll Run',  icon: 'play',           route: ROUTES.PAYROLL_RUNS,       perm: 'payroll.run.view',           detail: 'Process salaries' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'var(--color-primary)', route, loading }: {
  icon: string; label: string; value: React.ReactNode; sub?: React.ReactNode;
  color?: string; route?: string; loading?: boolean;
}) {
  const content = (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      cursor: route ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s, border-color 0.15s',
    }}
    onMouseEnter={e => { if (route) { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; } }}
    onMouseLeave={e => { if (route) { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} color={color} strokeWidth={2} />
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      {loading ? (
        <div style={{ height: 32, width: 80, background: 'var(--color-border)', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
      )}
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return route ? <Link to={route} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link> : content;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
      {children}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const perms = user?.permissions ?? [];
  const has = (p: string) => perms.includes(p);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── Setup status queries ─────────────────────────────────────────────────

  const { data: companies }    = useQuery({ queryKey: ['companies'],    queryFn: () => organizationApi.listCompanies({ limit: '1' }),    enabled: has('organization.company.view'), staleTime: 30000 });
  const { data: departments }  = useQuery({ queryKey: ['departments'],  queryFn: () => organizationApi.listDepartments({ limit: '1' }),  enabled: has('organization.department.view'), staleTime: 30000 });
  const { data: designations } = useQuery({ queryKey: ['designations'], queryFn: () => organizationApi.listDesignations({ limit: '1' }), enabled: has('organization.designation.view'), staleTime: 30000 });
  const { data: employees }    = useQuery({ queryKey: ['employees-dash'],queryFn: () => employeeApi.list({ limit: '1' }),                 enabled: has('employee.profile.view'), staleTime: 30000 });
  const { data: leaveTypes }   = useQuery({ queryKey: ['leave-types'],  queryFn: leaveApi.listTypes,                                     enabled: has('leave.policy.configure'), staleTime: 30000 });
  const { data: components }   = useQuery({ queryKey: ['payroll-components'], queryFn: payrollApi.listComponents,                        enabled: has('payroll.component.view'), staleTime: 30000 });
  const { data: structures }   = useQuery({ queryKey: ['payroll-structures'], queryFn: payrollApi.listStructures,                        enabled: has('payroll.structure.view'), staleTime: 30000 });
  const { data: cycles }       = useQuery({ queryKey: ['payroll-cycles'],     queryFn: () => payrollApi.listCycles(),                    enabled: has('payroll.cycle.manage'), staleTime: 30000 });
  const { data: runsData }     = useQuery({ queryKey: ['payroll-runs-dash'],  queryFn: () => payrollApi.listRuns({ page: 1, limit: 1 }), enabled: has('payroll.run.view'), staleTime: 30000 });

  // ── Pending action queries ───────────────────────────────────────────────

  const { data: pendingLeave } = useQuery({
    queryKey: ['pending-leave'],
    queryFn: () => leaveApi.listApplications({ status: 'pending', limit: '10' }),
    enabled: has('leave.application.view'), staleTime: 15000,
  });
  const { data: pendingExceptions } = useQuery({
    queryKey: ['pending-exceptions'],
    queryFn: () => attendanceApi.listExceptions({ status: 'pending' }),
    enabled: has('attendance.exception.view'), staleTime: 15000,
  });
  const { data: pendingExpense } = useQuery({
    queryKey: ['pending-expense'],
    queryFn: () => expenseApi.listClaims({ status: 'submitted' }),
    enabled: has('expense.claim.approve'), staleTime: 15000,
  });
  const { data: pendingLoans } = useQuery({
    queryKey: ['pending-loans'],
    queryFn: () => payrollApi.listLoans({ status: 'pending' }),
    enabled: has('payroll.loan.approve'), staleTime: 15000,
  });

  // ── Analytics queries ────────────────────────────────────────────────────

  const { data: headcountData } = useQuery({
    queryKey: ['headcount'],
    queryFn: () => reportsApi.headcount(),
    enabled: has('reports.analytics.view'), staleTime: 30000,
  });
  const companyId = (companies?.data ?? [])[0]?.publicId;
  const { data: payrollCostData } = useQuery({
    queryKey: ['payroll-cost-dash', companyId],
    queryFn: () => reportsApi.payrollCost({ companyId, month: now.getMonth() + 1, year: now.getFullYear() }),
    enabled: !!companyId && has('reports.analytics.view'), staleTime: 30000,
  });

  // ── Computed setup progress ──────────────────────────────────────────────

  const stepStatus = useMemo<Record<string, boolean | null>>(() => ({
    company:     companies    !== undefined ? (companies.data.length > 0)     : null,
    department:  departments  !== undefined ? (departments.data.length > 0)   : null,
    designation: designations !== undefined ? (designations.data.length > 0)  : null,
    employee:    employees    !== undefined ? (employees.data.length > 0)     : null,
    leavetype:   leaveTypes   !== undefined ? (leaveTypes.length > 0)         : null,
    component:   components   !== undefined ? (components.length > 0)         : null,
    structure:   structures   !== undefined ? (structures.length > 0)         : null,
    cycle:       cycles       !== undefined ? (cycles.length > 0)             : null,
    statutory:   companyId    !== undefined ? true                            : null,
    payroll:     runsData     !== undefined ? (runsData.meta.total > 0)       : null,
  }), [companies, departments, designations, employees, leaveTypes, components, structures, cycles, companyId, runsData]);

  const visibleSteps = SETUP_STEPS.filter(s => !s.perm || has(s.perm));
  const doneCount    = visibleSteps.filter(s => stepStatus[s.key] === true).length;
  const totalSteps   = visibleSteps.length;
  const allDone      = doneCount === totalSteps;
  const progressPct  = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  const nextStep     = visibleSteps.find(s => stepStatus[s.key] === false);

  const isFreshAccount = doneCount <= 1;

  // ── Pending actions ──────────────────────────────────────────────────────

  interface PendingItem { label: string; count: number; route: string; icon: string; color: string }
  const pendingActions: PendingItem[] = [
    { label: 'Leave applications awaiting approval', count: (pendingLeave as { data?: unknown[] } | undefined)?.data?.length ?? 0, route: ROUTES.LEAVE_APPLICATIONS, icon: 'calendar', color: 'var(--color-warning)' },
    { label: 'Attendance exceptions to review', count: (pendingExceptions as { data?: unknown[] } | undefined)?.data?.length ?? 0, route: ROUTES.ATTENDANCE_EXCEPTIONS, icon: 'exclamation', color: 'var(--color-danger)' },
    { label: 'Expense claims pending approval', count: (pendingExpense as { data?: unknown[] } | undefined)?.data?.length ?? 0, route: ROUTES.EXPENSE_CLAIMS, icon: 'banknotes', color: 'var(--color-info)' },
    { label: 'Loan requests awaiting approval', count: (pendingLoans as unknown[])?.length ?? 0, route: ROUTES.PAYROLL_LOANS, icon: 'scale', color: 'var(--color-primary)' },
  ].filter(a => a.count > 0);

  const totalPending = pendingActions.reduce((s, a) => s + a.count, 0);

  // ── Quick access shortcuts ────────────────────────────────────────────────

  const quickLinks = [
    { label: 'Add Employee',    route: ROUTES.EMPLOYEE_CREATE,      icon: 'users',    perm: 'employee.profile.create' },
    { label: 'Apply Leave',     route: ROUTES.LEAVE_APPLICATIONS,   icon: 'calendar', perm: 'leave.application.create' },
    { label: 'Run Payroll',     route: ROUTES.PAYROLL_RUNS,         icon: 'play',     perm: 'payroll.run.create' },
    { label: 'Generate Report', route: ROUTES.REPORTS,              icon: 'chart',    perm: 'reports.standard.view' },
    { label: 'Attendance Logs', route: ROUTES.ATTENDANCE_LOGS,      icon: 'clock',    perm: 'attendance.log.view' },
    { label: 'Analytics',       route: ROUTES.ANALYTICS,            icon: 'chart',    perm: 'reports.analytics.view' },
  ].filter(l => has(l.perm));

  // ── Latest payroll run ───────────────────────────────────────────────────

  const latestRun = (runsData?.data ?? [])[0] as { status?: string; month?: number; year?: number } | undefined;
  const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const runStatusColor: Record<string, string> = {
    draft: 'var(--color-text-muted)', preview: 'var(--color-info)',
    processing: 'var(--color-warning)', processed: 'var(--color-info)',
    approved: 'var(--color-secondary)', finalized: 'var(--color-secondary)',
    payslips_published: 'var(--color-success)', rolled_back: 'var(--color-danger)',
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1200, padding: '0 4px' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2 }}>
            {greeting}{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{dayStr}</div>
        </div>
        {totalPending > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px',
            background: 'var(--color-danger)', borderRadius: 8, color: '#fff',
            fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer',
          }}
          onClick={() => { const el = document.getElementById('pending-section'); el?.scrollIntoView({ behavior: 'smooth' }); }}
          >
            <Icon name="exclamation" size={14} color="#fff" strokeWidth={2.5} />
            {totalPending} action{totalPending !== 1 ? 's' : ''} need your attention
          </div>
        )}
      </div>

      {/* ── Setup progress ── */}
      {!allDone && (
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 3 }}>
                {isFreshAccount ? 'Get started — configure your HRMS' : 'Setup in progress'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {doneCount} of {totalSteps} steps complete
                {nextStep && <> · Next: <strong>{nextStep.label}</strong></>}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>{progressPct}%</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 1 }}>complete</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 99, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: `linear-gradient(90deg, var(--color-primary), var(--color-secondary))`,
              width: `${progressPct}%`, transition: 'width 0.6s ease',
            }} />
          </div>

          {/* Steps timeline */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(visibleSteps.length, 5)}, 1fr)`, gap: 8 }}>
            {visibleSteps.slice(0, 10).map((step, i) => {
              const status = stepStatus[step.key];
              const done   = status === true;
              const active = !done && visibleSteps.slice(0, i).every(s => stepStatus[s.key] === true);
              const locked = !done && !active;

              return (
                <div
                  key={step.key}
                  onClick={() => !locked && navigate(step.route)}
                  style={{
                    padding: '12px 12px 10px',
                    borderRadius: 10,
                    border: `1.5px solid ${done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: done ? 'rgba(22,163,74,0.04)' : active ? 'rgba(37,99,235,0.04)' : 'var(--color-background)',
                    cursor: locked ? 'default' : 'pointer',
                    opacity: locked ? 0.5 : 1,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!locked) (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  {/* Step status indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-border)',
                    }}>
                      {done ? (
                        <Icon name="check" size={13} color="#fff" strokeWidth={3} />
                      ) : (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: active ? '#fff' : 'var(--color-text-muted)' }}>{i + 1}</span>
                      )}
                    </div>
                    <Icon name={step.icon} size={15} color={done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-text-secondary)', lineHeight: 1.3 }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 2, lineHeight: 1.4 }}>
                    {step.detail}
                  </div>
                  {active && (
                    <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)' }} />
                  )}
                </div>
              );
            })}
          </div>

          {nextStep && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                to={nextStep.route}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  background: 'var(--color-primary)', color: '#fff',
                  fontSize: '0.8125rem', fontWeight: 700, textDecoration: 'none',
                }}
              >
                Continue: {nextStep.label}
                <Icon name="arrow" size={13} color="#fff" strokeWidth={2.5} />
              </Link>
              {isFreshAccount && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Complete setup to unlock payroll, leave, and attendance workflows
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Insights row ── */}
      {has('reports.analytics.view') && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeading>Insights</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            <StatCard
              icon="users" label="Active Employees"
              value={headcountData?.total ?? (employees?.meta?.total ?? '—')}
              sub="across all departments"
              color="var(--color-primary)"
              route={ROUTES.EMPLOYEES}
              loading={!headcountData && !employees}
            />
            <StatCard
              icon="calendar" label="Pending Leave"
              value={(pendingLeave as { data?: unknown[] } | undefined)?.data?.length ?? '—'}
              sub="awaiting approval"
              color="var(--color-warning, #f59e0b)"
              route={ROUTES.LEAVE_APPLICATIONS}
            />
            <StatCard
              icon="exclamation" label="Attendance Flags"
              value={(pendingExceptions as { data?: unknown[] } | undefined)?.data?.length ?? '—'}
              sub="exceptions to review"
              color="var(--color-danger, #dc2626)"
              route={ROUTES.ATTENDANCE_EXCEPTIONS}
            />
            {latestRun ? (
              <StatCard
                icon="play" label="Latest Payroll"
                value={<span style={{ fontSize: '1.125rem' }}>{MONTHS[latestRun.month ?? 0]} {latestRun.year}</span>}
                sub={<span style={{ color: runStatusColor[latestRun.status ?? ''] ?? 'var(--color-text-muted)' }}>{(latestRun.status ?? '').replace(/_/g, ' ')}</span>}
                color="var(--color-secondary, #14b8a6)"
                route={ROUTES.PAYROLL_RUNS}
              />
            ) : (
              <StatCard
                icon="banknotes" label="Gross Payroll"
                value={payrollCostData ? `₹${(payrollCostData.grossPay / 100000).toFixed(1)}L` : '—'}
                sub={payrollCostData ? `${payrollCostData.employeeCount} employees this month` : 'No run yet'}
                color="var(--color-secondary, #14b8a6)"
                route={ROUTES.PAYROLL_RUNS}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Department distribution (if we have data) ── */}
      {headcountData && headcountData.byDepartment.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <SectionHeading>Headcount by Department</SectionHeading>
              <Link to={ROUTES.ANALYTICS} style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Full analytics →
              </Link>
            </div>
            {headcountData.byDepartment.slice(0, 6).map(d => {
              const pct = headcountData.total > 0 ? Math.round((d.count / headcountData.total) * 100) : 0;
              return (
                <div key={d.deptId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 140, fontSize: '0.8125rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={d.deptId}>
                    {d.deptId}
                  </div>
                  <div style={{ flex: 1, height: 7, background: 'var(--color-border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 28, textAlign: 'right' }}>{d.count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: 32, textAlign: 'right' }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pending actions + Quick access ── */}
      <div style={{ display: 'grid', gridTemplateColumns: pendingActions.length > 0 ? '1fr 300px' : '1fr', gap: 16, marginBottom: 24 }}>

        {/* Pending actions */}
        {pendingActions.length > 0 && (
          <div id="pending-section" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px' }}>
            <SectionHeading>Action Required</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingActions.map(action => (
                <Link
                  key={action.label}
                  to={action.route}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                    borderRadius: 8, border: '1px solid var(--color-border)',
                    background: 'var(--color-background)', textDecoration: 'none',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; (e.currentTarget as HTMLElement).style.borderColor = action.color; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${action.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={action.icon} size={15} color={action.color} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{action.label}</div>
                  </div>
                  <div style={{
                    minWidth: 26, height: 26, borderRadius: 8, background: action.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8125rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {action.count}
                  </div>
                  <Icon name="arrow" size={13} color="var(--color-text-muted)" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick access */}
        {quickLinks.length > 0 && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px' }}>
            <SectionHeading>Quick Access</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {quickLinks.map(link => (
                <Link
                  key={link.route}
                  to={link.route}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    borderRadius: 8, border: '1px solid var(--color-border)',
                    background: 'var(--color-background)', textDecoration: 'none',
                    fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-background)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={link.icon} size={14} color="var(--color-primary)" strokeWidth={2} />
                  </div>
                  {link.label}
                  <span style={{ marginLeft: 'auto' }}><Icon name="arrow" size={12} color="var(--color-text-muted)" /></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Configuration health (only when mostly set up) ── */}
      {!isFreshAccount && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <SectionHeading>Configuration Health</SectionHeading>
              <span style={{ fontSize: '0.75rem', color: progressPct >= 80 ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 600 }}>
                {progressPct >= 100 ? 'Fully configured' : progressPct >= 80 ? 'Almost ready' : `${100 - progressPct}% remaining`}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {visibleSteps.map(step => {
                const done = stepStatus[step.key] === true;
                const pending = stepStatus[step.key] === false;
                return (
                  <Link
                    key={step.key}
                    to={step.route}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                      borderRadius: 8, textDecoration: 'none',
                      border: `1px solid ${done ? 'var(--color-success)' : 'var(--color-border)'}`,
                      background: done ? 'rgba(22,163,74,0.04)' : 'var(--color-background)',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? 'var(--color-success)' : pending ? 'var(--color-warning, #f59e0b)' : 'var(--color-border)',
                    }}>
                      {done && <Icon name="check" size={10} color="#fff" strokeWidth={3} />}
                      {pending && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: done ? 'var(--color-success)' : 'var(--color-text-secondary)', lineHeight: 1.2 }}>
                      {step.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
