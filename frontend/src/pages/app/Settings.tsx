import { Link } from 'react-router-dom';
import { ROUTES } from '@/router/routes';

interface SettingItem {
  label: string;
  desc: string;
  path: string;
}

interface SettingGroup {
  title: string;
  items: SettingItem[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: 'Organisation',
    items: [
      { label: 'Companies', desc: 'Manage legal entities and company settings', path: ROUTES.COMPANIES },
      { label: 'Departments', desc: 'Org structure and reporting hierarchy', path: ROUTES.DEPARTMENTS },
      { label: 'Designations', desc: 'Job titles and designations', path: ROUTES.DESIGNATIONS },
      { label: 'Locations', desc: 'Office and work locations', path: ROUTES.LOCATIONS },
    ],
  },
  {
    title: 'Automation',
    items: [
      { label: 'Workflows', desc: 'Approval workflows and routing rules', path: ROUTES.WORKFLOWS },
      { label: 'Rule Sets', desc: 'Business rules and formula engine', path: ROUTES.RULE_SETS },
      { label: 'Forms', desc: 'Dynamic form builder', path: ROUTES.FORMS },
    ],
  },
];

export default function Settings() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {SETTING_GROUPS.map((group) => (
        <section key={group.title} style={{ marginBottom: 40 }}>
          <h2 style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-secondary)',
            marginBottom: 16,
          }}>
            {group.title}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}>
            {group.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                >
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.9375rem',
                      color: 'var(--color-text-primary)',
                      marginBottom: 4,
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.4,
                    }}>
                      {item.desc}
                    </div>
                  </div>
                  <span style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
