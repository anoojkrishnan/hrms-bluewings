import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports.api';
import { organizationApi } from '@/lib/api/organization.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';

function StatCard({ label, value, sub, color = 'var(--color-text-primary)' }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SimpleBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ fontSize: '0.8125rem', width: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }} title={label}>{label}</div>
      <div style={{ flex: 1, height: 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{value}</div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const now = new Date();
  const { data: companiesData } = useQuery({ queryKey: ['companies'], queryFn: () => organizationApi.listCompanies({ limit: '100' }) });
  const companies = companiesData?.data ?? [];

  const { data: headcount, isLoading: hcLoading } = useQuery({
    queryKey: ['analytics-headcount'],
    queryFn: () => reportsApi.headcount(),
  });

  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
  const { data: attrition, isLoading: attrLoading } = useQuery({
    queryKey: ['analytics-attrition'],
    queryFn: () => reportsApi.attrition({ from: quarterStart, to: now.toISOString() }),
  });

  const firstCompanyId = companies[0]?.publicId;
  const { data: payrollCost, isLoading: pcLoading } = useQuery({
    queryKey: ['analytics-payroll-cost', firstCompanyId, now.getMonth() + 1, now.getFullYear()],
    queryFn: () => reportsApi.payrollCost({ companyId: firstCompanyId, month: now.getMonth() + 1, year: now.getFullYear() }),
    enabled: !!firstCompanyId,
  });

  const maxDept = headcount?.byDepartment[0]?.count ?? 1;
  const deptMap = new Map(companies.map(c => [c.publicId, c.name]));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Key HR metrics at a glance</p>
        </div>
      </div>

      <SetupGuide content={SETUP['analytics']} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {hcLoading   ? <Skeleton height={100} /> : <StatCard label="Active Employees" value={headcount?.total ?? 0} color="var(--color-primary)" />}
        {attrLoading ? <Skeleton height={100} /> : <StatCard label="Attrition (QTD)" value={attrition?.count ?? 0} sub="separations this quarter" color="var(--color-red)" />}
        {pcLoading || !firstCompanyId ? <Skeleton height={100} /> : (
          <StatCard label="Gross Payroll" value={"₹" + ((payrollCost?.grossPay ?? 0) / 100000).toFixed(1) + "L"} sub={(payrollCost?.employeeCount ?? 0) + " employees"} color="var(--color-green)" />
        )}
        {pcLoading || !firstCompanyId ? <Skeleton height={100} /> : (
          <StatCard label="Net Payroll" value={"₹" + ((payrollCost?.netPay ?? 0) / 100000).toFixed(1) + "L"} sub="after all deductions" color="var(--color-secondary)" />
        )}
      </div>

      {headcount && headcount.byDepartment.length > 0 && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-card)', marginBottom: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Headcount by Department</h3>
          {headcount.byDepartment.map(d => (
            <SimpleBar key={d.deptId} value={d.count} max={maxDept} label={deptMap.get(d.deptId) ?? d.deptId} />
          ))}
        </div>
      )}

      {!firstCompanyId && (
        <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 40 }}>
          Add a company to see payroll analytics.
        </div>
      )}
    </div>
  );
}
