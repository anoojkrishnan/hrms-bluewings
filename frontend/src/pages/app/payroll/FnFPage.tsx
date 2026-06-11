import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '@/lib/api/payroll.api';
import { employeeApi } from '@/lib/api/employee.api';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

type FnFStatus = 'draft' | 'pending_approval' | 'approved' | 'settled';

const STATUS_VARIANT: Record<FnFStatus, 'default' | 'warning' | 'info' | 'success' | 'teal'> = {
  draft: 'default', pending_approval: 'warning', approved: 'info', settled: 'teal' as 'success',
};

interface FnFRecord {
  publicId: string; employeeId: string;
  noticePay: number; leaveEncashmentDays: number; leaveEncashmentAmount: number;
  gratuityYears: number; gratuityAmount: number; bonusAmount: number;
  loanRecovery: number; assetRecovery: number;
  totalPayable: number; totalRecovery: number; netSettlement: number;
  status: FnFStatus; createdAt: string;
}

function AmtRow({ label, amount, variant = 'neutral' }: { label: string; amount: number; variant?: 'positive' | 'negative' | 'neutral' }) {
  const color = variant === 'positive' ? 'var(--color-green)' : variant === 'negative' ? 'var(--color-red)' : 'var(--color-text-primary)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.875rem' }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color }}>₹{amount.toLocaleString('en-IN')}</span>
    </div>
  );
}

export default function FnFPage() {
  const qc = useQueryClient();
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [detailId, setDetailId]         = useState<string | null>(null);
  const [selectedEmp, setSelectedEmp]   = useState('');
  const [bonusAmount, setBonusAmount]   = useState('');
  const [assetRecovery, setAssetRecovery] = useState('');
  const [notes, setNotes]               = useState('');

  const { data: settlements, isLoading } = useQuery({
    queryKey: ['fnf-list'],
    queryFn: () => payrollApi.listFnF(),
  });

  const { data: detail } = useQuery({
    queryKey: ['fnf-detail', detailId],
    queryFn: () => payrollApi.getFnF(detailId!),
    enabled: !!detailId,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeApi.list({ limit: '200' }),
  });
  const employees = employeesData?.data ?? [];

  const initiateMutation = useMutation({
    mutationFn: () => payrollApi.initiateFnF(selectedEmp, { bonusAmount: bonusAmount ? Number(bonusAmount) : 0, assetRecovery: assetRecovery ? Number(assetRecovery) : 0, notes: notes || undefined }),
    onSuccess: (fnf: unknown) => {
      qc.invalidateQueries({ queryKey: ['fnf-list'] });
      setInitiateOpen(false);
      setDetailId((fnf as FnFRecord).publicId);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (publicId: string) => payrollApi.approveFnF(publicId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fnf-list'] }); qc.invalidateQueries({ queryKey: ['fnf-detail', detailId] }); },
  });

  const fnfList: FnFRecord[] = (settlements ?? []) as FnFRecord[];
  const fnfDetail = detail as FnFRecord | undefined;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Full & Final Settlement</h1>
          <p className="page-subtitle">Process FnF for separated employees</p>
        </div>
        <PermissionGuard permission="payroll.fnf.initiate">
          <Button onClick={() => setInitiateOpen(true)}>Initiate FnF</Button>
        </PermissionGuard>
      </div>

      {isLoading ? (
        <Skeleton height={240} />
      ) : !fnfList.length ? (
        <SetupGuide content={SETUP['fnf']} ctaNode={<Button onClick={() => setInitiateOpen(true)}>+ Initiate FnF</Button>} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Net Settlement</th>
                <th>Total Payable</th>
                <th>Total Recovery</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fnfList.map(fnf => (
                <tr key={fnf.publicId}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{fnf.employeeId.slice(0, 16)}</td>
                  <td style={{ fontWeight: 700, color: fnf.netSettlement >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                    ₹{fnf.netSettlement.toLocaleString('en-IN')}
                  </td>
                  <td style={{ color: 'var(--color-green)' }}>₹{fnf.totalPayable.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--color-red)' }}>₹{fnf.totalRecovery.toLocaleString('en-IN')}</td>
                  <td><Badge variant={STATUS_VARIANT[fnf.status]}>{fnf.status.replace(/_/g, ' ')}</Badge></td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    {new Date(fnf.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDetailId(fnf.publicId)}>View</button>
                      {['draft', 'pending_approval'].includes(fnf.status) && (
                        <PermissionGuard permission="payroll.fnf.approve">
                          <button className="btn btn-sm btn-success" onClick={() => approveMutation.mutate(fnf.publicId)}>Approve</button>
                        </PermissionGuard>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Initiate Modal */}
      <Modal open={initiateOpen} onClose={() => setInitiateOpen(false)} title="Initiate Full & Final Settlement" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setInitiateOpen(false)}>Cancel</Button>
            <Button loading={initiateMutation.isPending} disabled={!selectedEmp} onClick={() => initiateMutation.mutate()}>
              Calculate FnF
            </Button>
          </div>
        }
      >
        {initiateMutation.isError && <div className="alert alert-danger">{(initiateMutation.error as { message?: string }).message}</div>}
        <div className="form-group">
          <label className="form-label">Employee *</label>
          <select className="select" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e.employeeCode} value={e.employeeCode}>{e.employeeCode}</option>)}
          </select>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Bonus Amount (₹)</label>
            <input type="number" className="input" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="0" min={0} />
          </div>
          <div className="form-group">
            <label className="form-label">Asset Recovery (₹)</label>
            <input type="number" className="input" value={assetRecovery} onChange={e => setAssetRecovery(e.target.value)} placeholder="0" min={0} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailId} onClose={() => setDetailId(null)} title="FnF Settlement Detail"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setDetailId(null)}>Close</Button>
            {fnfDetail && ['draft', 'pending_approval'].includes(fnfDetail.status) && (
              <PermissionGuard permission="payroll.fnf.approve">
                <Button onClick={() => approveMutation.mutate(fnfDetail.publicId)} loading={approveMutation.isPending}>
                  Approve Settlement
                </Button>
              </PermissionGuard>
            )}
          </div>
        }
      >
        {fnfDetail && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Badge variant={STATUS_VARIANT[fnfDetail.status]}>{fnfDetail.status.replace(/_/g, ' ')}</Badge>
            </div>
            <p style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Payable to Employee</p>
            <AmtRow label="Notice Pay" amount={fnfDetail.noticePay} variant="negative" />
            <AmtRow label={`Leave Encashment (${fnfDetail.leaveEncashmentDays} days)`} amount={fnfDetail.leaveEncashmentAmount} variant="positive" />
            <AmtRow label={`Gratuity (${fnfDetail.gratuityYears} yrs)`} amount={fnfDetail.gratuityAmount} variant="positive" />
            <AmtRow label="Bonus" amount={fnfDetail.bonusAmount} variant="positive" />
            <AmtRow label="Total Payable" amount={fnfDetail.totalPayable} />

            <p style={{ fontWeight: 600, margin: '16px 0 8px', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recoveries</p>
            <AmtRow label="Loan Recovery" amount={fnfDetail.loanRecovery} variant="negative" />
            <AmtRow label="Asset Recovery" amount={fnfDetail.assetRecovery} variant="negative" />
            <AmtRow label="Total Recovery" amount={fnfDetail.totalRecovery} />

            <div style={{ marginTop: 16, padding: '12px 16px', background: fnfDetail.netSettlement >= 0 ? 'var(--color-green-bg, #f0fdf4)' : 'var(--color-red-bg, #fff1f2)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Net Settlement</span>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: fnfDetail.netSettlement >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                ₹{fnfDetail.netSettlement.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
