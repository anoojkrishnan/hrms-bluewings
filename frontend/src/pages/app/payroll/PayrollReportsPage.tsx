import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '@/lib/api/payroll.api';
import { organizationApi } from '@/lib/api/organization.api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

type Tab = 'salary-register' | 'payout-register';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PayrollReportsPage() {
  const [tab, setTab] = useState<Tab>('salary-register');
  const now = new Date();
  const [srCompany, setSrCompany] = useState('');
  const [srMonth,   setSrMonth]   = useState(String(now.getMonth() + 1));
  const [srYear,    setSrYear]    = useState(String(now.getFullYear()));
  const [srEnabled, setSrEnabled] = useState(false);

  const [prRun,     setPrRun]     = useState('');
  const [prEnabled, setPrEnabled] = useState(false);

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });

  const { data: runsData } = useQuery({
    queryKey: ['payroll-runs-finalized'],
    queryFn: () => payrollApi.listRuns({ page: 1, limit: 100, ...(srCompany ? { companyId: srCompany } : {}) }),
  });

  const companies = companiesData?.data ?? [];
  const finalizedRuns = (runsData?.data ?? []).filter(r => ['finalized', 'payslips_published'].includes(r.status));

  const { data: salaryRegData, isLoading: srLoading } = useQuery({
    queryKey: ['salary-register', srCompany, srMonth, srYear],
    queryFn: () => payrollApi.salaryRegister({ companyId: srCompany, month: Number(srMonth), year: Number(srYear) }),
    enabled: srEnabled && !!srCompany,
  });

  const { data: payoutRegData, isLoading: prLoading } = useQuery({
    queryKey: ['payout-register', prRun],
    queryFn: () => payrollApi.payoutRegister(prRun),
    enabled: prEnabled && !!prRun,
  });

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '9px 18px',
    border: 'none',
    borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    fontWeight: tab === t ? 600 : 500,
    color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
    marginBottom: '-1px',
    transition: 'color 0.12s',
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Reports</h1>
          <p className="page-subtitle">Generate salary and payout registers for download</p>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
        <button style={tabStyle('salary-register')} onClick={() => setTab('salary-register')}>Salary Register</button>
        <button style={tabStyle('payout-register')} onClick={() => setTab('payout-register')}>Payout Register</button>
      </div>

      {tab === 'salary-register' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24 }}>
            <div className="form-group" style={{ margin: 0, minWidth: 200 }}>
              <label className="form-label">Company *</label>
              <select className="select" value={srCompany} onChange={e => { setSrCompany(e.target.value); setSrEnabled(false); }}>
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
              <label className="form-label">Month</label>
              <select className="select" value={srMonth} onChange={e => setSrMonth(e.target.value)}>
                {MONTHS.map(m => <option key={m.value} value={String(m.value)}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, width: 100 }}>
              <label className="form-label">Year</label>
              <input type="number" className="input" value={srYear} onChange={e => setSrYear(e.target.value)} min={2020} max={2099} />
            </div>
            <Button disabled={!srCompany} onClick={() => setSrEnabled(true)}>Generate</Button>
          </div>

          {srLoading && <Skeleton height={240} />}

          {salaryRegData && salaryRegData.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Button variant="secondary" onClick={() => downloadCsv(
                  `salary-register-${srYear}-${srMonth.padStart(2, '0')}.csv`,
                  salaryRegData as unknown as Record<string, unknown>[],
                )}>
                  ↓ Download CSV
                </Button>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      {Object.keys(salaryRegData[0] as object).map(k => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(salaryRegData as unknown as Record<string, unknown>[]).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => <td key={j}>{String(v ?? '—')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {srEnabled && !srLoading && salaryRegData?.length === 0 && (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 32 }}>
              No salary data found for the selected period.
            </p>
          )}
        </div>
      )}

      {tab === 'payout-register' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24 }}>
            <div className="form-group" style={{ margin: 0, minWidth: 280 }}>
              <label className="form-label">Finalized Payroll Run *</label>
              <select className="select" value={prRun} onChange={e => { setPrRun(e.target.value); setPrEnabled(false); }}>
                <option value="">Select run…</option>
                {finalizedRuns.map(r => (
                  <option key={r.publicId} value={r.publicId}>
                    {MONTHS.find(m => m.value === r.month)?.label} {r.year} — {r.status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <Button disabled={!prRun} onClick={() => setPrEnabled(true)}>Generate</Button>
          </div>

          {prLoading && <Skeleton height={240} />}

          {payoutRegData && payoutRegData.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Button variant="secondary" onClick={() => downloadCsv(
                  `payout-register-${prRun}.csv`,
                  payoutRegData as unknown as Record<string, unknown>[],
                )}>
                  ↓ Download CSV
                </Button>
              </div>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      {Object.keys(payoutRegData[0] as object).map(k => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(payoutRegData as unknown as Record<string, unknown>[]).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => <td key={j}>{String(v ?? '—')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {prEnabled && !prLoading && payoutRegData?.length === 0 && (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 32 }}>
              No payout data for this run.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
