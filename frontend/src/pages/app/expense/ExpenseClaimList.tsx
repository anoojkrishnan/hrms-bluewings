import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi, type ExpenseClaim } from '@/lib/api/expense.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

const STATUS_VARIANT: Record<ExpenseClaim['status'], 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
  draft: 'default', submitted: 'warning', approved: 'success', rejected: 'danger', paid: 'teal' as 'success',
};

interface NewItemRow { categoryId: string; description: string; amount: string; date: string; }

export default function ExpenseClaimList() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isHr = user?.permissions.includes('expense.claim.approve') ?? false;

  const [filterStatus, setFilterStatus] = useState('');
  const [createOpen, setCreateOpen]     = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [claimTitle, setClaimTitle]     = useState('');
  const [claimNotes, setClaimNotes]     = useState('');
  const [items, setItems]               = useState<NewItemRow[]>([{ categoryId: '', description: '', amount: '', date: '' }]);

  const { data, isLoading } = useQuery({
    queryKey: ['expense-claims', filterStatus],
    queryFn: () => expenseApi.listClaims(filterStatus ? { status: filterStatus } : {}),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseApi.listCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () => expenseApi.createClaim({
      title: claimTitle,
      notes: claimNotes || undefined,
      items: items.filter(i => i.categoryId && i.description && i.amount && i.date).map(i => ({
        categoryId: i.categoryId,
        description: i.description,
        amount: Number(i.amount),
        date: new Date(i.date).toISOString(),
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense-claims'] }); setCreateOpen(false); resetCreate(); },
  });

  const submitMutation = useMutation({
    mutationFn: (publicId: string) => expenseApi.submitClaim(publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-claims'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (publicId: string) => expenseApi.approveClaim(publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-claims'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ publicId, reason }: { publicId: string; reason: string }) => expenseApi.rejectClaim(publicId, reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense-claims'] }); setRejectTarget(null); setRejectReason(''); },
  });

  const resetCreate = () => {
    setClaimTitle(''); setClaimNotes('');
    setItems([{ categoryId: '', description: '', amount: '', date: '' }]);
  };

  const addItem = () => setItems(p => [...p, { categoryId: '', description: '', amount: '', date: '' }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const setItem = (i: number, k: keyof NewItemRow, v: string) =>
    setItems(p => p.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const claims = data?.data ?? [];
  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expense Claims</h1>
          <p className="page-subtitle">Submit and track reimbursement requests</p>
        </div>
        <PermissionGuard permission="expense.claim.create">
          <Button onClick={() => setCreateOpen(true)}>+ New Claim</Button>
        </PermissionGuard>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <select className="select" style={{ width: 200 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {isLoading ? (
        <Skeleton height={240} />
      ) : !claims.length ? (
        <SetupGuide content={SETUP['expense-claims']} ctaNode={<Button onClick={() => setCreateOpen(true)}>+ New Claim</Button>} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(claim => (
                <tr key={claim.publicId}>
                  <td style={{ fontWeight: 600 }}>{claim.title}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{claim.items.length} item{claim.items.length !== 1 ? 's' : ''}</td>
                  <td style={{ fontWeight: 600 }}>₹{claim.totalAmount.toLocaleString('en-IN')}</td>
                  <td><Badge variant={STATUS_VARIANT[claim.status]}>{claim.status}</Badge></td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    {claim.submittedAt ? new Date(claim.submittedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {claim.status === 'draft' && (
                        <PermissionGuard permission="expense.claim.submit">
                          <button className="btn btn-sm btn-primary" onClick={() => submitMutation.mutate(claim.publicId)}>Submit</button>
                        </PermissionGuard>
                      )}
                      {claim.status === 'submitted' && isHr && (
                        <>
                          <PermissionGuard permission="expense.claim.approve">
                            <button className="btn btn-sm btn-success" onClick={() => approveMutation.mutate(claim.publicId)}>Approve</button>
                          </PermissionGuard>
                          <PermissionGuard permission="expense.claim.reject">
                            <button className="btn btn-sm btn-danger" onClick={() => setRejectTarget(claim.publicId)}>Reject</button>
                          </PermissionGuard>
                        </>
                      )}
                      {claim.status === 'rejected' && claim.rejectionReason && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-red)' }}>{claim.rejectionReason.slice(0, 40)}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Claim Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Expense Claim"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} disabled={!claimTitle || !items.some(i => i.categoryId && i.amount)} onClick={() => createMutation.mutate()}>
              Save as Draft
            </Button>
          </div>
        }
      >
        {createMutation.isError && <div className="alert alert-danger">{getErrorMessage(createMutation.error)}</div>}
        <div className="form-group">
          <label className="form-label">Claim Title *</label>
          <input className="input" value={claimTitle} onChange={e => setClaimTitle(e.target.value)} placeholder="e.g. Travel to Client Office" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="form-label" style={{ margin: 0 }}>Expense Items *</label>
            <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Add Item</button>
          </div>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1.2fr auto', gap: 6, marginBottom: 6 }}>
              <select className="select" value={item.categoryId} onChange={e => setItem(idx, 'categoryId', e.target.value)}>
                <option value="">Category</option>
                {(categories ?? []).map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
              </select>
              <input className="input" value={item.description} onChange={e => setItem(idx, 'description', e.target.value)} placeholder="Description" />
              <input type="number" className="input" value={item.amount} onChange={e => setItem(idx, 'amount', e.target.value)} placeholder="₹" min={0} />
              <input type="date" className="input" value={item.date} onChange={e => setItem(idx, 'date', e.target.value)} />
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)' }} onClick={() => removeItem(idx)} disabled={items.length === 1}>✕</button>
            </div>
          ))}
          {totalAmount > 0 && (
            <div style={{ textAlign: 'right', fontSize: '0.875rem', fontWeight: 600, marginTop: 4 }}>
              Total: ₹{totalAmount.toLocaleString('en-IN')}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="input" rows={2} value={claimNotes} onChange={e => setClaimNotes(e.target.value)} placeholder="Optional notes" />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Claim" size="sm"
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
          <label className="form-label">Reason *</label>
          <textarea className="input" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (min 5 chars)" />
        </div>
      </Modal>
    </div>
  );
}
