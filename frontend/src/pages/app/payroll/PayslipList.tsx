import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { payrollApi } from '@/lib/api/payroll.api';
import { organizationApi } from '@/lib/api/organization.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Modal } from '@/components/ui/Modal';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function PayslipList() {
  const { user } = useAuthStore();
  const isHR = user?.permissions.includes('payroll.payslip.view');
  const [page, setPage] = useState(1);
  const [filterCompany, setFilterCompany] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '50' }),
    enabled: isHR,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['payslips', page, filterCompany],
    queryFn: () => payrollApi.listPayslips({ page, limit: 20, ...(isHR && filterCompany ? { companyId: filterCompany } : {}) }),
  });

  const { data: detail } = useQuery({
    queryKey: ['payslip-detail', selected],
    queryFn: () => payrollApi.getPayslip(selected!),
    enabled: !!selected,
  });

  const payslips   = data?.data ?? [];
  const meta       = data?.meta;
  const companies  = companiesData?.data ?? [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payslips</h1>
          <p className="page-subtitle">{isHR ? 'All employee payslips' : 'Your published payslips'}</p>
        </div>
      </div>
      {isHR && (
        <div className="filters">
          <select className="select" style={{ maxWidth: 240 }} value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
          </select>
        </div>
      )}

      {isLoading ? (
        <Skeleton height={200} />
      ) : !payslips.length ? (
        <SetupGuide content={SETUP['payslips']} />
) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  {isHR && <th>Employee</th>}
                  <th>Period</th>
                  <th>Gross Pay</th>
                  <th>Net Pay</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(ps => (
                  <tr key={ps.publicId} className="clickable" onClick={() => setSelected(ps.publicId)}>
                    {isHR && <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{ps.employeeId.slice(0, 16)}</td>}
                    <td style={{ fontWeight: 600 }}>{MONTHS[ps.month]} {ps.year}</td>
                    <td>₹{ps.data.grossPay.toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-green)' }}>₹{ps.data.netPay.toLocaleString('en-IN')}</td>
                    <td><Badge variant={ps.isPublished ? 'success' : 'warning'}>{ps.isPublished ? 'Published' : 'Pending'}</Badge></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelected(ps.publicId); }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="pagination-info">Page {meta.page} of {meta.totalPages}</span>
              <button className="btn btn-ghost" disabled={!meta.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Payslip detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={detail ? `Payslip — ${MONTHS[detail.month]} ${detail.year}` : 'Payslip'} size="lg">
        {detail ? (
          <div>
            <div className="stats-grid" style={{ marginBottom: 20 }}>
              <div className="stat-card">
                <div className="stat-label">Gross Pay</div>
                <div className="stat-value" style={{ fontSize: '1.5rem' }}>₹{detail.data.grossPay.toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Deductions</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--color-red)' }}>₹{detail.data.totalDeductions.toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Net Pay</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--color-green)' }}>₹{detail.data.netPay.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <h4 style={{ marginBottom: 10 }}>Earnings</h4>
                {detail.data.earnings.filter(e => e.amount > 0).map(e => (
                  <div key={e.componentCode} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{e.componentName}</span>
                    <span style={{ fontWeight: 600 }}>₹{e.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 style={{ marginBottom: 10 }}>Deductions</h4>
                {detail.data.deductions.filter(d => d.amount > 0).map(d => (
                  <div key={d.componentCode} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{d.componentName}</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-red)' }}>₹{d.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Working days: {detail.data.workingDays} · Present: {detail.data.presentDays} · LOP: {detail.data.lopDays}
            </div>
          </div>
        ) : (
          <Skeleton height={200} />
        )}
      </Modal>
    </div>
  );
}
