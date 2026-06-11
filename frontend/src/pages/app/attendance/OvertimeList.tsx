import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

type OTStatus = 'pending' | 'approved' | 'rejected' | 'converted';

const STATUS_VARIANT: Record<OTStatus, 'default' | 'warning' | 'success' | 'danger' | 'teal'> = {
  pending: 'warning', approved: 'success', rejected: 'danger', converted: 'teal',
};

export default function OvertimeList() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isHr = user?.permissions.includes('attendance.overtime.approve') ?? false;

  const [createOpen, setCreateOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ date: '', overtimeHours: '2', reason: '' });

  const { data: records, isLoading } = useQuery({
    queryKey: ['overtime', filterStatus],
    queryFn: () => attendanceApi.listOvertime(filterStatus ? { status: filterStatus } : {}),
  });

  const { data: compOff } = useQuery({
    queryKey: ['comp-off-balance'],
    queryFn: () => attendanceApi.getCompOffBalance(),
  });

  const createMutation = useMutation({
    mutationFn: () => attendanceApi.submitOvertime({ date: new Date(form.date).toISOString(), overtimeHours: Number(form.overtimeHours), reason: form.reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['overtime'] }); setCreateOpen(false); setForm({ date: '', overtimeHours: '2', reason: '' }); },
  });

  const approveMutation = useMutation({
    mutationFn: ({ publicId, convertToCompOff }: { publicId: string; convertToCompOff: boolean }) =>
      attendanceApi.approveOvertime(publicId, convertToCompOff),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['overtime'] }); qc.invalidateQueries({ queryKey: ['comp-off-balance'] }); },
  });

  const rejectMutation = useMutation({
    mutationFn: (publicId: string) => attendanceApi.rejectOvertime(publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
  });

  const otList = (records ?? []) as Array<{ publicId: string; date: string; overtimeHours: number; reason: string; status: OTStatus; compOffGranted?: boolean }>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Overtime</h1>
          <p className="page-subtitle">Submit and track overtime requests</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {compOff && (compOff as { balance: number }).balance > 0 && (
            <div style={{ fontSize: '0.875rem', background: 'var(--color-teal-bg, #e0f7f5)', color: 'var(--color-secondary)', padding: '6px 12px', borderRadius: 8, fontWeight: 600 }}>
              🔄 Comp-Off Balance: {(compOff as { balance: number }).balance} day{(compOff as { balance: number }).balance !== 1 ? 's' : ''}
            </div>
          )}
          <PermissionGuard permission="attendance.overtime.submit">
            <Button onClick={() => setCreateOpen(true)}>+ Submit OT</Button>
          </PermissionGuard>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="converted">Converted to Comp-Off</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <Skeleton height={240} />
      ) : !otList.length ? (
        <SetupGuide content={SETUP['overtime']} ctaNode={<Button onClick={() => setCreateOpen(true)}>+ Submit OT</Button>} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Comp-Off</th>
                {isHr && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {otList.map((rec: { publicId: string; date: string; overtimeHours: number; reason: string; status: OTStatus; compOffGranted?: boolean }) => (
                <tr key={rec.publicId}>
                  <td style={{ fontWeight: 500 }}>{new Date(rec.date).toLocaleDateString('en-IN')}</td>
                  <td>{rec.overtimeHours}h</td>
                  <td style={{ color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rec.reason}
                  </td>
                  <td><Badge variant={STATUS_VARIANT[rec.status]}>{rec.status}</Badge></td>
                  <td>{rec.compOffGranted ? <Badge variant="teal">Granted</Badge> : '—'}</td>
                  {isHr && (
                    <td>
                      {rec.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <PermissionGuard permission="attendance.overtime.approve">
                            <button className="btn btn-sm btn-success" onClick={() => approveMutation.mutate({ publicId: rec.publicId, convertToCompOff: false })}>Approve</button>
                            <button className="btn btn-sm" style={{ background: 'var(--color-teal-bg, #e0f7f5)', color: 'var(--color-secondary)', border: 'none', cursor: 'pointer' }}
                              onClick={() => approveMutation.mutate({ publicId: rec.publicId, convertToCompOff: true })}>
                              → Comp-Off
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => rejectMutation.mutate(rec.publicId)}>Reject</button>
                          </PermissionGuard>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit OT Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Submit Overtime Request" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} disabled={!form.date || !form.reason} onClick={() => createMutation.mutate()}>
              Submit
            </Button>
          </div>
        }
      >
        {createMutation.isError && <div className="alert alert-danger">{(createMutation.error as { message?: string }).message}</div>}
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input type="date" className="input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Overtime Hours *</label>
          <input type="number" className="input" value={form.overtimeHours} onChange={e => setForm(p => ({ ...p, overtimeHours: e.target.value }))} min={0.5} max={24} step={0.5} />
        </div>
        <div className="form-group">
          <label className="form-label">Reason *</label>
          <textarea className="input" rows={3} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Explain the reason for overtime (min 5 chars)" />
        </div>
      </Modal>
    </div>
  );
}
