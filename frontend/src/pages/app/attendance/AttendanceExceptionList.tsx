import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance.api';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { Skeleton } from '@/components/ui/Skeleton';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

export default function AttendanceExceptionList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-exceptions', page, status],
    queryFn: () => attendanceApi.listExceptions({ status }),
  });

  const approveMutation = useMutation({
    mutationFn: (publicId: string) => attendanceApi.approveException(publicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-exceptions'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, note }: { publicId: string; note: string }) =>
      attendanceApi.rejectException(publicId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-exceptions'] });
      setRejectTarget(null);
      setRejectNote('');
    },
  });

  const exceptions = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Attendance Exceptions</h1>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <select className="select" style={{ width: 200 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton height={48} /></div>)
      ) : exceptions.length === 0 ? (
        <SetupGuide content={SETUP['attendance-exceptions']} />
) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((exc) => (
                  <tr key={exc.publicId}>
                    <td>{exc.employeeId}</td>
                    <td>{new Date(exc.date).toLocaleDateString()}</td>
                    <td>{exc.exceptionType.replace(/_/g, ' ')}</td>
                    <td>{exc.reason ?? '—'}</td>
                    <td>
                      <Badge variant={STATUS_VARIANTS[exc.status] ?? 'default'}>
                        {exc.status}
                      </Badge>
                    </td>
                    <td>
                      {exc.status === 'pending' && (
                        <PermissionGuard permission="attendance.exception.approve">
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => approveMutation.mutate(exc.publicId)}
                              disabled={approveMutation.isPending}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setRejectTarget(exc.publicId)}
                            >
                              Reject
                            </button>
                          </div>
                        </PermissionGuard>
                      )}
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

      {rejectTarget && (
        <Modal open={!!rejectTarget} title="Reject Exception" onClose={() => setRejectTarget(null)}>
          <div className="form-group">
            <label className="form-label">Note *</label>
            <textarea className="input" rows={3} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!rejectNote || rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ publicId: rejectTarget, note: rejectNote })}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
