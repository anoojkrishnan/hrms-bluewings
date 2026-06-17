import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '@/lib/api/payroll.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

type LoanStatus = 'pending' | 'approved' | 'active' | 'closed' | 'rejected';

const STATUS_VARIANT: Record<LoanStatus, 'default' | 'warning' | 'info' | 'success' | 'danger' | 'teal'> = {
  pending: 'warning', approved: 'info', active: 'success', closed: 'default', rejected: 'danger',
};

export default function LoanList() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isHr = user?.permissions.includes('payroll.loan.approve') ?? false;

  const [createOpen, setCreateOpen]     = useState(false);
  const [scheduleId, setScheduleId]     = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({ amount: '', tenureMonths: '12', purpose: '' });

  const { data: loans, isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => payrollApi.listLoans(),
  });

  const { data: schedule } = useQuery({
    queryKey: ['loan-schedule', scheduleId],
    queryFn: () => payrollApi.getLoanSchedule(scheduleId!),
    enabled: !!scheduleId,
  });

  const createMutation = useMutation({
    mutationFn: () => payrollApi.requestLoan({ amount: Number(form.amount), tenureMonths: Number(form.tenureMonths), purpose: form.purpose }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); setCreateOpen(false); setForm({ amount: '', tenureMonths: '12', purpose: '' }); },
  });

  const approveMutation = useMutation({
    mutationFn: (publicId: string) => payrollApi.approveLoan(publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) => payrollApi.rejectLoan(publicId, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loans'] }); setRejectTarget(null); setRejectReason(''); },
  });

  const loanList = (loans ?? []) as Array<{ publicId: string; amount: number; tenureMonths: number; emi?: number; purpose: string; status: LoanStatus; createdAt: string }>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loans</h1>
          <p className="page-subtitle">Request and manage employee salary loans</p>
        </div>
        <PermissionGuard permission="payroll.loan.create">
          <Button onClick={() => setCreateOpen(true)}>+ Request Loan</Button>
        </PermissionGuard>
      </div>

      {isLoading ? (
        <Skeleton height={240} />
      ) : !loanList.length ? (
        <SetupGuide content={SETUP['loans']} ctaNode={<Button onClick={() => setCreateOpen(true)}>+ Request Loan</Button>} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Tenure</th>
                <th>EMI</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loanList.map((loan: { publicId: string; amount: number; tenureMonths: number; emi?: number; purpose: string; status: LoanStatus; createdAt: string }) => (
                <tr key={loan.publicId}>
                  <td style={{ fontWeight: 700 }}>₹{loan.amount.toLocaleString('en-IN')}</td>
                  <td>{loan.tenureMonths} months</td>
                  <td>{loan.emi != null ? `₹${loan.emi.toLocaleString('en-IN')}` : '—'}</td>
                  <td style={{ color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {loan.purpose}
                  </td>
                  <td><Badge variant={STATUS_VARIANT[loan.status]}>{loan.status}</Badge></td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    {new Date(loan.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['active', 'approved'].includes(loan.status) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setScheduleId(loan.publicId)}>Schedule</button>
                      )}
                      {loan.status === 'pending' && isHr && (
                        <>
                          <PermissionGuard permission="payroll.loan.approve">
                            <button className="btn btn-sm btn-success" onClick={() => approveMutation.mutate(loan.publicId)}>Approve</button>
                            <button className="btn btn-sm btn-danger" onClick={() => setRejectTarget(loan.publicId)}>Reject</button>
                          </PermissionGuard>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Loan Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Request Loan" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} disabled={!form.amount || !form.purpose} onClick={() => createMutation.mutate()}>
              Submit Request
            </Button>
          </div>
        }
      >
        {createMutation.isError && <div className="alert alert-danger">{getErrorMessage(createMutation.error)}</div>}
        <div className="form-group">
          <label className="form-label">Loan Amount (₹) *</label>
          <input type="number" className="input" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="e.g. 50000" min={1000} />
        </div>
        <div className="form-group">
          <label className="form-label">Tenure (months) *</label>
          <input type="number" className="input" value={form.tenureMonths} onChange={e => setForm(p => ({ ...p, tenureMonths: e.target.value }))} min={1} max={60} />
          {form.amount && form.tenureMonths && (
            <span className="form-hint">Estimated EMI: ₹{Math.ceil(Number(form.amount) / Number(form.tenureMonths)).toLocaleString('en-IN')}/month</span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Purpose *</label>
          <textarea className="input" rows={3} value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Explain why you need this loan (min 5 chars)" />
        </div>
      </Modal>

      {/* Repayment Schedule Modal */}
      <Modal open={!!scheduleId} onClose={() => setScheduleId(null)} title="Repayment Schedule"
        footer={<Button onClick={() => setScheduleId(null)}>Close</Button>}
      >
        {schedule && schedule.length > 0 ? (
          <div className="table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>#</th><th>Due Date</th><th>EMI</th><th>Status</th></tr>
              </thead>
              <tbody>
                {(schedule as Array<{ installmentNo: number; dueDate: string; emiAmount: number; paid: boolean }>)?.map((inst) => (
                  <tr key={inst.installmentNo} style={{ opacity: inst.paid ? 0.6 : 1 }}>
                    <td>{inst.installmentNo}</td>
                    <td>{new Date(inst.dueDate).toLocaleDateString('en-IN')}</td>
                    <td>₹{inst.emiAmount.toLocaleString('en-IN')}</td>
                    <td>{inst.paid ? <Badge variant="success">Paid</Badge> : <Badge variant="default">Pending</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>Schedule not available yet.</p>}
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Loan" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={rejectMutation.isPending} disabled={rejectReason.length < 5}
              onClick={() => rejectMutation.mutate({ publicId: rejectTarget!, reason: rejectReason })}>
              Reject
            </Button>
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Rejection Reason *</label>
          <textarea className="input" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason (min 5 chars)" />
        </div>
      </Modal>
    </div>
  );
}
