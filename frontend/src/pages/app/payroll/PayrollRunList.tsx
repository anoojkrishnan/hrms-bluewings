import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type RunStatus } from '@/lib/api/payroll.api';
import { organizationApi } from '@/lib/api/organization.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/router/routes';

const STATUS_VARIANT: Record<RunStatus, 'default' | 'warning' | 'info' | 'success' | 'danger' | 'teal'> = {
  draft: 'default', preview: 'info', processing: 'warning', processed: 'info',
  approved: 'teal', finalized: 'teal', payslips_published: 'success', rolled_back: 'danger',
};

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const now = new Date();

interface RunForm { companyId: string; cyclePublicId: string; month: string; year: string; }
const EMPTY_FORM: RunForm = { companyId: '', cyclePublicId: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()) };

export default function PayrollRunList() {
  const qc = useQueryClient();
  const [page, setPage]   = useState(1);
  const [open, setOpen]   = useState(false);
  const [form, setForm]   = useState<RunForm>(EMPTY_FORM);
  const [filterCompany, setFilterCompany] = useState('');

  const { data: runsData, isLoading } = useQuery({
    queryKey: ['payroll-runs', page, filterCompany],
    queryFn: () => payrollApi.listRuns({ page, limit: 20, ...(filterCompany ? { companyId: filterCompany } : {}) }),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });

  const { data: cyclesData } = useQuery({
    queryKey: ['payroll-cycles', form.companyId],
    queryFn: () => payrollApi.listCycles(form.companyId),
    enabled: open && !!form.companyId,
  });

  const createMutation = useMutation({
    mutationFn: () => payrollApi.createRun({ companyId: form.companyId, cyclePublicId: form.cyclePublicId, month: Number(form.month), year: Number(form.year) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-runs'] }); setOpen(false); setForm(EMPTY_FORM); },
  });

  const runs      = runsData?.data ?? [];
  const meta      = runsData?.meta;
  const companies = companiesData?.data ?? [];
  const cycles    = cyclesData ?? [];
  const set = (k: keyof RunForm) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Runs</h1>
          <p className="page-subtitle">Manage monthly payroll processing cycles</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setOpen(true); }}>+ New Run</Button>
      </div>

      <div className="filters">
        <select className="select" style={{ maxWidth: 240 }} value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <Skeleton height={240} />
      ) : !runs.length ? (
        <SetupGuide content={SETUP['payroll-runs']} />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Period</th><th>Company</th><th>Status</th><th>Employees</th><th>Gross Pay</th><th>Net Pay</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.publicId} className="clickable" onClick={() => window.location.href = ROUTES.PAYROLL_RUN_DETAIL.replace(':publicId', run.publicId)}>
                    <td style={{ fontWeight: 600 }}>{MONTHS[run.month]} {run.year}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{companies.find(c => c.publicId === run.companyId)?.name ?? run.companyId}</td>
                    <td>
                      <Badge variant={STATUS_VARIANT[run.status]}>{run.status.replace(/_/g, ' ')}</Badge>
                      {run.errorMessage && <div style={{ fontSize: '0.75rem', color: 'var(--color-red)', marginTop: 2 }}>Error: {run.errorMessage.slice(0, 40)}</div>}
                    </td>
                    <td>{run.totalEmployees ?? '—'}</td>
                    <td>{run.totalGross     != null ? `₹${run.totalGross.toLocaleString('en-IN')}`   : '—'}</td>
                    <td>{run.totalNetPay   != null ? `₹${run.totalNetPay.toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{new Date(run.createdAt).toLocaleDateString('en-IN')}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <Link to={ROUTES.PAYROLL_RUN_DETAIL.replace(':publicId', run.publicId)} className="btn btn-ghost btn-sm">Open →</Link>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Create Payroll Run" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} disabled={!form.companyId || !form.cyclePublicId} onClick={() => createMutation.mutate()}>Create Run</Button>
          </div>
        }
      >
        {createMutation.isError && <div className="alert alert-danger">{(createMutation.error as {message?: string}).message ?? 'Failed to create'}</div>}
        <div className="form-group">
          <label className="form-label">Company *</label>
          <select className="select" value={form.companyId} onChange={set('companyId')}>
            <option value="">Select company</option>
            {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Pay Cycle *</label>
          <select className="select" value={form.cyclePublicId} onChange={set('cyclePublicId')} disabled={!form.companyId}>
            <option value="">Select cycle</option>
            {cycles.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
          </select>
          {form.companyId && !cycles.length && <span style={{ fontSize: '0.75rem', color: 'var(--color-amber)' }}>No cycles for this company. Create one first.</span>}
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Month</label>
            <select className="select" value={form.month} onChange={set('month')}>
              {MONTHS.slice(1).map((m, i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Year</label>
            <input className="input" type="number" min={2020} max={2099} value={form.year} onChange={set('year')} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
