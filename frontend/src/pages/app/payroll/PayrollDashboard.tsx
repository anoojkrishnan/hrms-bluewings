import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { payrollApi, type RunStatus } from '@/lib/api/payroll.api';
import { organizationApi } from '@/lib/api/organization.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/router/routes';

const RUN_STATUS_VARIANT: Record<RunStatus, 'default' | 'warning' | 'info' | 'success' | 'danger' | 'teal'> = {
  draft:              'default',
  preview:            'info',
  processing:         'warning',
  processed:          'info',
  approved:           'teal',
  finalized:          'teal',
  payslips_published: 'success',
  rolled_back:        'danger',
};

export default function PayrollDashboard() {
  const { user } = useAuthStore();
  const isHR = user?.permissions.includes('payroll.run.view');

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '50' }),
  });

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['payroll-runs-recent'],
    queryFn: () => payrollApi.listRuns({ limit: 5 }),
    enabled: isHR,
  });

  const { data: payslipsData } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => payrollApi.listPayslips({ limit: 3 }),
  });

  const companies  = companiesData?.data ?? [];
  const runs       = runsData?.data ?? [];
  const payslips   = payslipsData?.data ?? [];

  const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Manage salary runs, payslips, and configurations</p>
        </div>
        {isHR && (
          <div className="page-actions">
            <Link to={ROUTES.PAYROLL_RUNS}><Button>View All Runs</Button></Link>
          </div>
        )}
      </div>

      {isHR && (
        <>
          {/* Quick stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Companies</div>
              <div className="stat-value">{companies.length}</div>
              <div className="stat-sub">active entities</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Recent Runs</div>
              <div className="stat-value">{runs.length}</div>
              <div className="stat-sub">last 5</div>
            </div>
          </div>

          {/* Recent runs */}
          <div className="section-card">
            <div className="section-title">Recent Payroll Runs</div>
            {isLoading ? (
              <Skeleton height={120} />
            ) : runs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                <p>No payroll runs yet.</p>
                <Link to={ROUTES.PAYROLL_RUNS}><Button style={{ marginTop: 12 }}>Create First Run</Button></Link>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Employees</th>
                      <th>Gross Pay</th>
                      <th>Net Pay</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.publicId} className="clickable">
                        <td style={{ fontWeight: 600 }}>{MONTHS[run.month]} {run.year}</td>
                        <td>
                          <Badge variant={RUN_STATUS_VARIANT[run.status]}>
                            {run.status.replace(/_/g, ' ')}
                          </Badge>
                          {run.errorMessage && <div style={{ fontSize: '0.75rem', color: 'var(--color-red)', marginTop: 2 }}>{run.errorMessage}</div>}
                        </td>
                        <td>{run.totalEmployees ?? '—'}</td>
                        <td>{run.totalGross != null ? `₹${run.totalGross.toLocaleString('en-IN')}` : '—'}</td>
                        <td>{run.totalNetPay != null ? `₹${run.totalNetPay.toLocaleString('en-IN')}` : '—'}</td>
                        <td>
                          <Link to={ROUTES.PAYROLL_RUN_DETAIL.replace(':publicId', run.publicId)} className="btn btn-ghost btn-sm">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: 'Salary Components', path: ROUTES.PAYROLL_COMPONENTS, icon: '≡' },
              { label: 'Salary Structures', path: ROUTES.PAYROLL_STRUCTURES, icon: '◫' },
              { label: 'Pay Cycles',        path: ROUTES.PAYROLL_CYCLES,     icon: '◑' },
              { label: 'Statutory Config',  path: ROUTES.PAYROLL_STATUTORY,  icon: '⚖' },
            ].map((item) => (
              <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>{item.icon}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Payslips section — visible to all */}
      <div className="section-card" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="section-title" style={{ margin: 0 }}>My Payslips</div>
          <Link to={ROUTES.PAYROLL_PAYSLIPS} className="btn btn-ghost btn-sm">View All</Link>
        </div>
        {payslips.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>No published payslips yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {payslips.map((ps) => (
              <div key={ps.publicId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{MONTHS[ps.month]} {ps.year}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                    Net: ₹{ps.data.netPay.toLocaleString('en-IN')}
                  </div>
                </div>
                <Link to={ROUTES.PAYROLL_PAYSLIPS} className="btn btn-ghost btn-sm">View</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
