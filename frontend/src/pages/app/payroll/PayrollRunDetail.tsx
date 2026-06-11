import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type RunStatus } from '@/lib/api/payroll.api';
import { organizationApi } from '@/lib/api/organization.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTES } from '@/router/routes';

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_VARIANT: Record<RunStatus, 'default' | 'warning' | 'info' | 'success' | 'danger' | 'teal'> = {
  draft: 'default', preview: 'info', processing: 'warning', processed: 'info',
  approved: 'teal', finalized: 'teal', payslips_published: 'success', rolled_back: 'danger',
};

export default function PayrollRunDetail() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const perms = user?.permissions ?? [];

  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');

  const { data: run, isLoading } = useQuery({
    queryKey: ['payroll-run', publicId],
    queryFn: () => payrollApi.getRun(publicId!),
    enabled: !!publicId,
    // Poll when processing
    refetchInterval: (query) => (query.state.data?.status === 'processing' ? 3000 : false),
  });

  const { data: runItems } = useQuery({
    queryKey: ['payroll-run-items', publicId],
    queryFn: () => payrollApi.getRunItems(publicId!),
    enabled: !!publicId && !!run && !['draft', 'rolled_back'].includes(run.status),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '50' }),
  });

  const companyName = companiesData?.data.find(c => c.publicId === run?.companyId)?.name ?? run?.companyId;

  const previewMutation  = useMutation({ mutationFn: () => payrollApi.previewRun(publicId!),  onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-run', publicId] }) });
  const processMutation  = useMutation({ mutationFn: () => payrollApi.processRun(publicId!),  onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-run', publicId] }) });
  const approveMutation  = useMutation({ mutationFn: () => payrollApi.approveRun(publicId!),  onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-run', publicId] }) });
  const finalizeMutation = useMutation({ mutationFn: () => payrollApi.finalizeRun(publicId!), onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-run', publicId] }) });
  const publishMutation  = useMutation({ mutationFn: () => payrollApi.publishPayslips(publicId!), onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-run', publicId] }) });
  const rollbackMutation = useMutation({
    mutationFn: () => payrollApi.rollbackRun(publicId!, rollbackReason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-run', publicId] }); setRollbackOpen(false); setRollbackReason(''); },
  });

  // These must stay ABOVE early returns — React hooks must always be called in the same order.
  const bankFileMutation = useMutation({
    mutationFn: () => payrollApi.generateBankFile(publicId!),
    onSuccess: (data) => {
      if (run) downloadCsv(`bank-file-${run.month}-${run.year}.csv`, data as unknown as Record<string, unknown>[]);
    },
  });

  const accountingMutation = useMutation({
    mutationFn: () => payrollApi.generateAccountingExport(publicId!),
    onSuccess: (data) => {
      if (run && data.length) downloadCsv(`jv-${run.month}-${run.year}.csv`, data as unknown as Record<string, unknown>[]);
    },
  });

  if (isLoading) return (
    <div className="page-container">
      <Skeleton height={32} width={200} />
      <div style={{ marginTop: 16 }}><Skeleton height={180} /></div>
    </div>
  );

  if (!run) return <div className="page-container"><p>Run not found.</p></div>;

  const canPreview    = run.status === 'draft' || run.status === 'preview';
  const canProcess    = run.status === 'preview';
  const canApprove    = run.status === 'processed'  && perms.includes('payroll.run.approve');
  const canFinalize   = run.status === 'approved'   && perms.includes('payroll.run.finalize');
  const canPublish    = run.status === 'finalized'  && perms.includes('payroll.payslip.publish');
  const canRollback   = !['finalized', 'payslips_published', 'rolled_back', 'processing'].includes(run.status) && perms.includes('payroll.run.rollback');
  const canInputs     = ['draft', 'preview'].includes(run.status) && perms.includes('payroll.run.edit');
  const canBankFile   = ['finalized', 'payslips_published'].includes(run.status);
  const canAccounting = ['finalized', 'payslips_published'].includes(run.status);
  const isProcessing  = run.status === 'processing';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(ROUTES.PAYROLL_RUNS)} style={{ marginBottom: 8 }}>← Back to Runs</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title">{MONTHS[run.month]} {run.year} Payroll</h1>
            <Badge variant={STATUS_VARIANT[run.status]}>{run.status.replace(/_/g, ' ')}</Badge>
          </div>
          <p className="page-subtitle">{companyName}</p>
        </div>
        <div className="page-actions">
          {canInputs   && <Link to={ROUTES.PAYROLL_INPUTS.replace(':publicId', publicId!)} className="btn btn-secondary btn-sm">Manage Inputs</Link>}
          {canPreview  && <Button variant="secondary" onClick={() => previewMutation.mutate()} loading={previewMutation.isPending}>Preview</Button>}
          {canProcess  && <Button onClick={() => processMutation.mutate()} loading={processMutation.isPending}>Process</Button>}
          {canApprove  && <Button variant="secondary" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>Approve</Button>}
          {canFinalize && <Button onClick={() => finalizeMutation.mutate()} loading={finalizeMutation.isPending}>Finalize</Button>}
          {canPublish  && <Button onClick={() => publishMutation.mutate()} loading={publishMutation.isPending}>Publish Payslips</Button>}
          {canBankFile    && <Button variant="secondary" onClick={() => bankFileMutation.mutate()}   loading={bankFileMutation.isPending}>↓ Bank File</Button>}
          {canAccounting  && <Button variant="secondary" onClick={() => accountingMutation.mutate()} loading={accountingMutation.isPending}>↓ JV Export</Button>}
          {canRollback && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)' }} onClick={() => setRollbackOpen(true)}>Rollback</button>
          )}
        </div>
      </div>

      {run.errorMessage && <div className="alert alert-danger"><strong>Processing Error:</strong> {run.errorMessage}</div>}

      {isProcessing && (
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2.5, borderColor: 'rgba(26,86,219,0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
          Processing payroll… This may take a moment. Page will update automatically.
        </div>
      )}

      {/* Summary cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Employees</div>
          <div className="stat-value">{run.totalEmployees ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Gross Pay</div>
          <div className="stat-value" style={{ fontSize: '1.5rem' }}>
            {run.totalGross != null ? `₹${run.totalGross.toLocaleString('en-IN')}` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Deductions</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--color-red)' }}>
            {run.totalDeductions != null ? `₹${run.totalDeductions.toLocaleString('en-IN')}` : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Net Pay</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--color-green)' }}>
            {run.totalNetPay != null ? `₹${run.totalNetPay.toLocaleString('en-IN')}` : '—'}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="section-card">
        <h3 style={{ marginBottom: 16 }}>Run Timeline</h3>
        {[
          { label: 'Created',            date: run.createdAt,            always: true },
          { label: 'Processed',          date: run.processedAt,          always: false },
          { label: 'Approved',           date: run.approvedAt,           always: false },
          { label: 'Finalized',          date: run.finalizedAt,          always: false },
          { label: 'Payslips Published', date: run.payslipsPublishedAt,  always: false },
          { label: 'Rolled Back',        date: run.rolledBackAt,         always: false },
        ].filter(t => t.always || t.date).map(t => (
          <div key={t.label} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '6px 0', fontSize: '0.875rem' }}>
            <span style={{ width: 140, color: 'var(--color-text-muted)' }}>{t.label}</span>
            <span style={{ fontWeight: 500 }}>{t.date ? new Date(t.date).toLocaleString('en-IN') : '—'}</span>
          </div>
        ))}
      </div>

      {/* Employee breakdown */}
      {runItems && runItems.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Working Days</th>
                <th>LOP Days</th>
                <th>Gross Pay</th>
                <th>Total Deductions</th>
                <th>Net Pay</th>
                <th>PF (EE)</th>
                <th>ESI (EE)</th>
                <th>PT</th>
                <th>TDS</th>
                {run.status === 'preview' && <th style={{ color: 'var(--color-amber)' }}>Preview</th>}
              </tr>
            </thead>
            <tbody>
              {runItems.map(item => (
                <tr key={item.publicId}>
                  <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8125rem' }}>{item.employeeId.slice(0, 16)}</td>
                  <td>{item.workingDays}</td>
                  <td style={{ color: item.lopDays > 0 ? 'var(--color-red)' : undefined }}>{item.lopDays}</td>
                  <td style={{ fontWeight: 600 }}>₹{item.grossPay.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--color-red)' }}>₹{item.totalDeductions.toLocaleString('en-IN')}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-green)' }}>₹{item.netPay.toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '0.8125rem' }}>₹{item.pfEmployee.toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '0.8125rem' }}>₹{item.esiEmployee.toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '0.8125rem' }}>₹{item.professionalTax.toLocaleString('en-IN')}</td>
                  <td style={{ fontSize: '0.8125rem' }}>₹{item.tds.toLocaleString('en-IN')}</td>
                  {run.status === 'preview' && <td><Badge variant="warning">Preview</Badge></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rollback modal */}
      <Modal open={rollbackOpen} onClose={() => setRollbackOpen(false)} title="Rollback Payroll Run" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setRollbackOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={rollbackMutation.isPending} disabled={rollbackReason.length < 5} onClick={() => rollbackMutation.mutate()}>Confirm Rollback</Button>
          </div>
        }
      >
        <div className="alert alert-danger">This will delete all run items and payslips for this run. The run status will be set to <strong>rolled_back</strong> and a new run can be created for the same period.</div>
        <div className="form-group">
          <label className="form-label">Reason *</label>
          <textarea className="input textarea" rows={3} value={rollbackReason} onChange={e => setRollbackReason(e.target.value)} placeholder="Explain why this run is being rolled back (min 5 chars)" />
        </div>
        {rollbackMutation.isError && <div className="alert alert-danger">{(rollbackMutation.error as {message?: string}).message}</div>}
      </Modal>
    </div>
  );
}
