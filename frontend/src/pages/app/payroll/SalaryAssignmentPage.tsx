import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type EmployeeSalaryComponent } from '@/lib/api/payroll.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

interface SalaryForm {
  structurePublicId: string;
  effectiveFrom: string;
  ctc: string;
  arrearsFlag: boolean;
  revisionNote: string;
}

const EMPTY_FORM: SalaryForm = {
  structurePublicId: '',
  effectiveFrom: new Date().toISOString().split('T')[0],
  ctc: '',
  arrearsFlag: false,
  revisionNote: '',
};

export default function SalaryAssignmentPage() {
  const { employeeCode } = useParams<{ employeeCode: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [assignOpen, setAssignOpen]   = useState(false);
  const [reviseOpen, setReviseOpen]   = useState(false);
  const [form, setForm]               = useState<SalaryForm>(EMPTY_FORM);
  const [isRevision, setIsRevision]   = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['employee-salary', employeeCode],
    queryFn: () => payrollApi.getEmployeeSalary(employeeCode!),
    enabled: !!employeeCode,
  });

  const { data: structuresData } = useQuery({
    queryKey: ['payroll-structures'],
    queryFn: () => payrollApi.listStructures(),
  });

  const structures = structuresData ?? [];
  const history: EmployeeSalaryComponent[] = data?.history ?? [];
  const active = history.find(h => new Date(h.effectiveFrom) <= new Date());

  const openAssign = () => {
    setIsRevision(false);
    setForm({ ...EMPTY_FORM, structurePublicId: active?.structureId ?? '' });
    setAssignOpen(true);
  };

  const openRevise = () => {
    setIsRevision(true);
    setForm({
      structurePublicId: active?.structureId ?? '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      ctc: active?.ctc ? String(active.ctc) : '',
      arrearsFlag: false,
      revisionNote: '',
    });
    setReviseOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const dto = {
        structurePublicId: form.structurePublicId,
        effectiveFrom: new Date(form.effectiveFrom).toISOString(),
        ctc: form.ctc ? Number(form.ctc) : undefined,
        ...(isRevision && { arrearsFlag: form.arrearsFlag, revisionNote: form.revisionNote || undefined }),
      };
      return isRevision
        ? payrollApi.reviseSalary(employeeCode!, dto)
        : payrollApi.assignSalary(employeeCode!, dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-salary', employeeCode] });
      setAssignOpen(false);
      setReviseOpen(false);
    },
  });

  const set = (k: keyof SalaryForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <h1 className="page-title">Salary — {employeeCode}</h1>
        </div>
        <div className="page-actions">
          {active ? (
            <Button onClick={openRevise}>Revise Salary</Button>
          ) : (
            <Button onClick={openAssign}>Assign Salary Structure</Button>
          )}
          {active && (
            <Button variant="secondary" onClick={openAssign}>Re-assign Structure</Button>
          )}
        </div>
      </div>
      {isLoading ? (
        <Skeleton height={200} />
      ) : history.length === 0 ? (
        <SetupGuide content={SETUP['salary-assignment']} />
      ) : (
        <>
          {active && (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 24,
              marginBottom: 24,
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Current Salary</h3>
                <Badge variant="success">Active</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 32px' }}>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 2 }}>Structure</div>
                  <div style={{ fontWeight: 600 }}>{structures.find(s => s.publicId === active.structureId)?.name ?? active.structureId}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 2 }}>Effective From</div>
                  <div style={{ fontWeight: 500 }}>{new Date(active.effectiveFrom).toLocaleDateString('en-IN')}</div>
                </div>
                {active.ctc != null && (
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 2 }}>Annual CTC</div>
                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-green)' }}>
                      ₹{active.ctc.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <h3 style={{ marginBottom: 12 }}>Salary History</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Effective From</th>
                  <th>Structure</th>
                  <th>CTC</th>
                  <th>Arrears</th>
                  <th>Note</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {[...history].sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()).map(h => (
                  <tr key={h.publicId}>
                    <td style={{ fontWeight: 500 }}>{new Date(h.effectiveFrom).toLocaleDateString('en-IN')}</td>
                    <td>{structures.find(s => s.publicId === h.structureId)?.name ?? h.structureId}</td>
                    <td>{h.ctc != null ? `₹${h.ctc.toLocaleString('en-IN')}` : '—'}</td>
                    <td>{h.arrearsFlag ? <Badge variant="warning">Yes</Badge> : '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{h.revisionNote || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{new Date(h.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Assign / Re-assign Modal */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Salary Structure" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} disabled={!form.structurePublicId || !form.effectiveFrom} onClick={() => saveMutation.mutate()}>Assign</Button>
          </div>
        }
      >
        {saveMutation.isError && <div className="alert alert-danger">{(saveMutation.error as { message?: string }).message ?? 'Failed to assign'}</div>}
        <div className="form-group">
          <label className="form-label">Salary Structure *</label>
          <select className="select" value={form.structurePublicId} onChange={set('structurePublicId')}>
            <option value="">Select structure…</option>
            {structures.map(s => <option key={s.publicId} value={s.publicId}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Effective From *</label>
          <input type="date" className="input" value={form.effectiveFrom} onChange={set('effectiveFrom')} />
        </div>
        <div className="form-group">
          <label className="form-label">Annual CTC (₹)</label>
          <input type="number" className="input" value={form.ctc} onChange={set('ctc')} placeholder="e.g. 600000" min={0} />
          <span className="form-hint">Leave blank to use component defaults</span>
        </div>
      </Modal>

      {/* Revise Modal */}
      <Modal open={reviseOpen} onClose={() => setReviseOpen(false)} title="Revise Salary" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setReviseOpen(false)}>Cancel</Button>
            <Button loading={saveMutation.isPending} disabled={!form.structurePublicId || !form.effectiveFrom} onClick={() => saveMutation.mutate()}>Save Revision</Button>
          </div>
        }
      >
        {saveMutation.isError && <div className="alert alert-danger">{(saveMutation.error as { message?: string }).message ?? 'Failed to revise'}</div>}
        <div className="form-group">
          <label className="form-label">New Salary Structure *</label>
          <select className="select" value={form.structurePublicId} onChange={set('structurePublicId')}>
            <option value="">Select structure…</option>
            {structures.map(s => <option key={s.publicId} value={s.publicId}>{s.name} ({s.code})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Effective From *</label>
          <input type="date" className="input" value={form.effectiveFrom} onChange={set('effectiveFrom')} />
        </div>
        <div className="form-group">
          <label className="form-label">Annual CTC (₹)</label>
          <input type="number" className="input" value={form.ctc} onChange={set('ctc')} placeholder="e.g. 720000" min={0} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <input type="checkbox" id="arrears" checked={form.arrearsFlag} onChange={e => setForm(p => ({ ...p, arrearsFlag: e.target.checked }))} style={{ accentColor: 'var(--color-primary)', width: 16, height: 16 }} />
          <label htmlFor="arrears" className="form-label" style={{ margin: 0 }}>Calculate arrears for this revision</label>
        </div>
        <div className="form-group">
          <label className="form-label">Revision Note</label>
          <textarea className="input" rows={2} value={form.revisionNote} onChange={set('revisionNote')} placeholder="e.g. Annual increment 2026" />
        </div>
      </Modal>
    </div>
  );
}
