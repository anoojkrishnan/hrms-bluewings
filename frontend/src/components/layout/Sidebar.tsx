import { NavLink } from 'react-router-dom';
import { useUiStore } from '@/lib/store/ui.store';
import { useAnyPermission } from '@/lib/hooks/usePermission';
import { ROUTES } from '@/router/routes';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  /** Any one of these grants access. Omit = always visible. */
  anyOf?: string[];
}

interface NavSection {
  title: string;
  /** Section hidden if no child items are visible */
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: '',
    items: [
      { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: '⊞' },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Employees', path: ROUTES.EMPLOYEES, icon: '◎', anyOf: ['employee.profile.create'] },
    ],
  },
  {
    title: 'Time Off',
    items: [
      { label: 'Applications', path: ROUTES.LEAVE_APPLICATIONS, icon: '◷', anyOf: ['leave.application.view'] },
      { label: 'My Balance',   path: ROUTES.LEAVE_BALANCE,      icon: '◑', anyOf: ['leave.balance.view'] },
      { label: 'Leave Types',  path: ROUTES.LEAVE_TYPES,        icon: '≡', anyOf: ['leave.policy.configure'] },
    ],
  },
  {
    title: 'Attendance',
    items: [
      { label: 'Mark',       path: ROUTES.ATTENDANCE,            icon: '●', anyOf: ['attendance.log.view'] },
      { label: 'Logs',       path: ROUTES.ATTENDANCE_LOGS,       icon: '≡', anyOf: ['attendance.log.view'] },
      { label: 'Exceptions', path: ROUTES.ATTENDANCE_EXCEPTIONS, icon: '⚠', anyOf: ['attendance.exception.view', 'attendance.regularization.approve'] },
      { label: 'Shifts',     path: ROUTES.SHIFTS,                icon: '🕐', anyOf: ['attendance.log.view'] },
      { label: 'Overtime',   path: ROUTES.OVERTIME,              icon: '⏱', anyOf: ['attendance.overtime.view'] },
    ],
  },
  {
    title: 'Payroll',
    items: [
      { label: 'Overview',   path: ROUTES.PAYROLL_DASHBOARD,  icon: '₹', anyOf: ['payroll.run.view', 'payroll.payslip.view'] },
      { label: 'Runs',       path: ROUTES.PAYROLL_RUNS,        icon: '▶', anyOf: ['payroll.run.view'] },
      { label: 'Payslips',   path: ROUTES.PAYROLL_PAYSLIPS,    icon: '◧', anyOf: ['payroll.payslip.view', 'payroll.run.view'] },
      { label: 'Salary',     path: ROUTES.PAYROLL_COMPONENTS,  icon: '≡', anyOf: ['payroll.component.view'] },
      { label: 'Structures', path: ROUTES.PAYROLL_STRUCTURES,  icon: '◫', anyOf: ['payroll.structure.view'] },
      { label: 'Cycles',     path: ROUTES.PAYROLL_CYCLES,      icon: '◑', anyOf: ['payroll.cycle.manage'] },
      { label: 'Statutory',  path: ROUTES.PAYROLL_STATUTORY,   icon: '⚖', anyOf: ['payroll.statutory.manage'] },
      { label: 'Reports',     path: ROUTES.PAYROLL_REPORTS,     icon: '📊', anyOf: ['payroll.run.view'] },
      { label: 'Loans',       path: ROUTES.PAYROLL_LOANS,       icon: '💳', anyOf: ['payroll.loan.view'] },
      { label: 'FnF',         path: ROUTES.PAYROLL_FNF,         icon: '📋', anyOf: ['payroll.fnf.view'] },
      { label: 'Accounting',  path: ROUTES.PAYROLL_ACCOUNTING,  icon: '🏦', anyOf: ['payroll.run.view'] },
    ],
  },
  {
    title: 'Approvals',
    items: [
      { label: 'Queue',         path: ROUTES.APPROVAL_QUEUE, icon: '✓', anyOf: ['workflow.instance.approve'] },
      { label: 'Notifications', path: ROUTES.NOTIFICATIONS,  icon: '◉', anyOf: ['notification.view'] },
      { label: 'Expenses',      path: ROUTES.EXPENSE_CLAIMS, icon: '🧾', anyOf: ['expense.claim.view'] },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { label: 'Companies',    path: ROUTES.COMPANIES,    icon: '⬡', anyOf: ['organization.company.view'] },
      { label: 'Departments',  path: ROUTES.DEPARTMENTS,  icon: '◫', anyOf: ['organization.department.view'] },
      { label: 'Designations', path: ROUTES.DESIGNATIONS, icon: '◧', anyOf: ['organization.designation.view'] },
      { label: 'Locations',    path: ROUTES.LOCATIONS,    icon: '◎', anyOf: ['organization.location.view'] },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Workflows', path: ROUTES.WORKFLOWS, icon: '⇄', anyOf: ['workflow.configure'] },
      { label: 'Rule Sets', path: ROUTES.RULE_SETS, icon: '⚖', anyOf: ['rule.configure'] },
      { label: 'Forms',     path: ROUTES.FORMS,     icon: '☰', anyOf: ['form.configure'] },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'All Reports', path: ROUTES.REPORTS,   icon: '📄', anyOf: ['reports.standard.view'] },
      { label: 'Analytics',   path: ROUTES.ANALYTICS, icon: '📈', anyOf: ['reports.analytics.view'] },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { label: 'API Clients', path: ROUTES.INTEGRATIONS, icon: '🔑', anyOf: ['integrations.api_client.manage'] },
      { label: 'Webhooks',    path: ROUTES.WEBHOOKS,     icon: '🔗', anyOf: ['integrations.webhook.manage'] },
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'Users',    path: ROUTES.USERS_MGMT, icon: '◈', anyOf: ['rbac.role.view'] },
      { label: 'Roles',    path: ROUTES.ROLES,      icon: '◆', anyOf: ['rbac.role.view'] },
      { label: 'Settings', path: ROUTES.SETTINGS,   icon: '⚙', anyOf: ['tenant.settings.view'] },
    ],
  },
];

// ── Per-item permission check ──────────────────────────────────────────────

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const allowed = useAnyPermission(...(item.anyOf ?? ['*']));
  // Items with no anyOf are always shown; items with anyOf must pass the check
  if (item.anyOf && !allowed) return null;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <span className={styles.itemIcon}>{item.icon}</span>
      {!collapsed && <span className={styles.itemLabel}>{item.label}</span>}
    </NavLink>
  );
}

function SectionBlock({ section, collapsed }: { section: NavSection; collapsed: boolean }) {
  // Build visibility checks for every item in this section
  const visibilities = section.items.map((item) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useAnyPermission(...(item.anyOf ?? ['*']));
  });
  const anyVisible = section.items.some((item, i) => !item.anyOf || visibilities[i]);
  if (!anyVisible) return null;

  return (
    <div className={styles.section}>
      {!collapsed && section.title && (
        <div className={styles.sectionLabel}>{section.title}</div>
      )}
      {section.items.map((item) => (
        <NavItemLink key={item.path} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { sidebarOpen } = useUiStore();
  const collapsed = !sidebarOpen;

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>HR</span>
        {!collapsed && <span className={styles.logoName}>HRMS</span>}
      </div>

      <nav className={styles.nav} aria-label="Main navigation">
        {NAV.map((section) => (
          <SectionBlock
            key={section.title || '_root'}
            section={section}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </aside>
  );
}
