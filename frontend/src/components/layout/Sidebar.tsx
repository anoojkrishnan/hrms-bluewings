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
      { label: 'Employees', path: ROUTES.EMPLOYEES, icon: '◎', anyOf: ['employee.profile.view'] },
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
    ],
  },
  {
    title: 'Approvals',
    items: [
      { label: 'Queue',         path: ROUTES.APPROVAL_QUEUE, icon: '✓', anyOf: ['workflow.instance.approve'] },
      { label: 'Notifications', path: ROUTES.NOTIFICATIONS,  icon: '◉', anyOf: ['notification.view'] },
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
  // Sections without a permission filter are always shown; we rely on items to hide themselves
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
