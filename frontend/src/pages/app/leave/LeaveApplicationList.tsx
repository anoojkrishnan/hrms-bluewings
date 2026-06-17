import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '@/lib/api/leave.api';
import { employeeApi } from '@/lib/api/employee.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/utils/errors';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  cancelled: 'default',
  revoked: 'danger',
  draft: 'default',
};

export default function LeaveApplicationList() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // HR users have no employeePublicId — they must pick an employee explicitly
  const isHrMode = !user?.employeePublicId;

  // Apply form state
  const [applyForm, setApplyForm] = useState({
    employeeCode: '',
    leaveTypeCode: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['leave-applications', page, status],
    queryFn: () => leaveApi.listApplications({ page: String(page), ...(status && { status }) }),
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: leaveApi.listTypes,
  });

  const applyMutation = useMutation({
    mutationFn: () => leaveApi.apply({
      ...(applyForm.employeeCode ? { employeeCode: applyForm.employeeCode } : {}),
      leaveTypeCode: applyForm.leaveTypeCode,
      startDate: applyForm.startDate ? new Date(applyForm.startDate).toISOString() : applyForm.startDate,
      endDate: applyForm.endDate ? new Date(applyForm.endDate).toISOString() : applyForm.endDate,
      reason: applyForm.reason || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      setShowApply(false);
      setApplyForm({ employeeCode: '', leaveTypeCode: '', startDate: '', endDate: '', reason: '' });
    },
  });

  // Load employees for name resolution in table and for HR apply-on-behalf
  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeApi.list({ limit: '200', status: 'active' }),
    enabled: isHrMode,
  });
  const employees = employeesData?.data ?? [];

  const approveMutation = useMutation({
    mutationFn: (publicId: string) => leaveApi.approve(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-applications'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) =>
      leaveApi.reject(publicId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      setRejectTarget(null);
      setRejectReason('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (publicId: string) => leaveApi.cancel(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-applications'] }),
  });

  const applications = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Leave Applications</h1>
        <div className="page-actions">
          <PermissionGuard permission="leave.application.create">
            <Button onClick={() => setShowApply(true)}>Apply for Leave</Button>
          </PermissionGuard>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton height={48} /></div>)
      ) : applications.length === 0 ? (
        <SetupGuide content={SETUP['leave-applications']} ctaNode={<Button onClick={() => setShowApply(true)}>Apply for Leave</Button>} />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.publicId}>
                    <td>{(() => { const e = employees.find(emp => emp.publicId === app.employeeId); return e ? (e.firstName || e.lastName ? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() : e.employeeCode) : app.employeeId; })()}</td>
                    <td>{leaveTypes?.find((t: { publicId: string; name: string }) => t.publicId === app.leaveTypeId)?.name ?? app.leaveTypeId}</td>
                    <td>
                      {new Date(app.startDate).toLocaleDateString()} – {new Date(app.endDate).toLocaleDateString()}
                    </td>
                    <td>{app.totalDays}</td>
                    <td>
                      <Badge variant={STATUS_VARIANTS[app.status] ?? 'default'}>
                        {app.status}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {app.status === 'pending' && (
                          <>
                            <PermissionGuard permission="leave.application.approve">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => approveMutation.mutate(app.publicId)}
                              >
                                Approve
                              </button>
                            </PermissionGuard>
                            <PermissionGuard permission="leave.application.reject">
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => setRejectTarget(app.publicId)}
                              >
                                Reject
                              </button>
                            </PermissionGuard>
                          </>
                        )}
                        {app.status === 'pending' && app.appliedBy === user?.userId && (
                          <PermissionGuard permission="leave.application.cancel">
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => cancelMutation.mutate(app.publicId)}
                            >
                              Cancel
                            </button>
                          </PermissionGuard>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="pagination-info">Page {meta.page} of {meta.totalPages}</span>
              <button className="btn btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Apply Leave Modal */}
      {showApply && (
        <Modal open={showApply} title={isHrMode ? 'Apply Leave on Behalf' : 'Apply for Leave'} onClose={() => setShowApply(false)}>
          {isHrMode && (
            <div className="form-group">
              <label className="form-label">Employee *</label>
              <select
                className="select"
                value={applyForm.employeeCode}
                onChange={(e) => setApplyForm((f) => ({ ...f, employeeCode: e.target.value }))}
              >
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.employeeCode} value={emp.employeeCode}>
                    {emp.firstName || emp.lastName ? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() : emp.employeeCode} ({emp.employeeCode})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>
                HR applying on behalf of an employee
              </span>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Leave Type *</label>
            <select
              className="select"
              value={applyForm.leaveTypeCode}
              onChange={(e) => setApplyForm((f) => ({ ...f, leaveTypeCode: e.target.value }))}
            >
              <option value="">Select leave type</option>
              {leaveTypes?.map((lt) => (
                <option key={lt.code} value={lt.code}>{lt.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Start Date *</label>
            <input type="date" className="input" value={applyForm.startDate}
              onChange={(e) => setApplyForm((f) => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date *</label>
            <input type="date" className="input" value={applyForm.endDate}
              onChange={(e) => setApplyForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="input" rows={3} value={applyForm.reason}
              onChange={(e) => setApplyForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          {applyMutation.isError && (
            <div className="alert alert-danger">{getErrorMessage(applyMutation.error)}</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending || (isHrMode && !applyForm.employeeCode)}
            >
              {applyMutation.isPending ? 'Applying...' : 'Apply'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <Modal open={!!rejectTarget} title="Reject Leave" onClose={() => setRejectTarget(null)}>
          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea className="input" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!rejectReason || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ publicId: rejectTarget, reason: rejectReason })}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
