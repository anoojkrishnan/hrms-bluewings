import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '@/lib/api/workflow.api';
import type { WorkflowInstance } from '@/lib/api/workflow.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/utils/errors';

export default function ApprovalQueue() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState<WorkflowInstance | null>(null);
  const [rejectTarget, setRejectTarget] = useState<WorkflowInstance | null>(null);
  const [approveComment, setApproveComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['approval-queue', page],
    queryFn: () => workflowApi.getApprovalQueue({ page, limit: 20 }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ publicId, comment }: { publicId: string; comment?: string }) =>
      workflowApi.approveInstance(publicId, { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      setApproveTarget(null);
      setApproveComment('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) =>
      workflowApi.rejectInstance(publicId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      setRejectTarget(null);
      setRejectReason('');
    },
  });

  const instances = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? instances.length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          Pending Approvals{total > 0 && (
            <span
              style={{
                marginLeft: 10,
                background: 'var(--color-danger)',
                color: '#fff',
                borderRadius: 12,
                padding: '2px 10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                verticalAlign: 'middle',
              }}
            >
              {total}
            </span>
          )}
        </h1>
      </div>

      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <Skeleton height={48} />
          </div>
        ))
      ) : instances.length === 0 ? (
        <EmptyState
          title="No pending approvals"
          description="You have no pending items requiring approval."
        />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Entity</th>
                  <th>Requested By</th>
                  <th>Requested At</th>
                  <th>SLA Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {instances.map((inst) => (
                  <tr key={inst.publicId}>
                    <td style={{ textTransform: 'capitalize' }}>{inst.module}</td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                        {inst.entityType}
                      </span>
                      <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                        {inst.entityPublicId}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                      {inst.requestedBy}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {new Date(inst.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem' }}>
                      {inst.slaDeadline
                        ? new Date(inst.slaDeadline).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => { setApproveTarget(inst); setApproveComment(''); }}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => { setRejectTarget(inst); setRejectReason(''); }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="pagination-info">Page {meta.page} of {meta.totalPages}</span>
              <button className="btn btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Approve Modal */}
      {approveTarget && (
        <Modal open title="Approve Request" onClose={() => setApproveTarget(null)}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Approve the {approveTarget.entityType} request from{' '}
            <strong>{approveTarget.requestedBy}</strong>?
          </p>
          <div className="form-group">
            <label className="form-label">Comment (optional)</label>
            <textarea
              className="input"
              rows={3}
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              placeholder="Add a comment..."
            />
          </div>
          {approveMutation.isError && (
            <div className="alert alert-danger">{getErrorMessage(approveMutation.error)}</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button
              onClick={() =>
                approveMutation.mutate({
                  publicId: approveTarget.publicId,
                  comment: approveComment || undefined,
                })
              }
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <Modal open title="Reject Request" onClose={() => setRejectTarget(null)}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Reject the {rejectTarget.entityType} request from{' '}
            <strong>{rejectTarget.requestedBy}</strong>?
          </p>
          <div className="form-group">
            <label className="form-label">Reason *</label>
            <textarea
              className="input"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide a reason for rejection..."
            />
          </div>
          {rejectMutation.isError && (
            <div className="alert alert-danger">{getErrorMessage(rejectMutation.error)}</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() =>
                rejectMutation.mutate({ publicId: rejectTarget.publicId, reason: rejectReason })
              }
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
