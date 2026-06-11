import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type PayrollCycle } from '@/lib/api/payroll.api';
import { organizationApi } from '@/lib/api/organization.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

interface CycleForm {
  companyId: string; name: string; payDay: string; cutoffDay: string;
}

const EMPTY: CycleForm = { companyId: '', name: '', payDay: '28', cutoffDay: '25' };

export default function PayrollCycleList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PayrollCycle | null>(null);
  const [form, setForm] = useState<CycleForm>(EMPTY);

  const { data: cyclesData, isLoading } = useQuery({
    queryKey: ['payroll-cycles'],
    queryFn: () => payrollApi.listCycles(),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });

  const createMutation = useMutation({
    mutationFn: () => payrollApi.createCycle({ companyId: form.companyId, name: form.name, payDay: Number(form.payDay), cutoffDay: Number(form.cutoffDay) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-cycles'] }); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: () => payrollApi.updateCycle(edit!.publicId, { name: form.name, payDay: Number(form.payDay), cutoffDay: Number(form.cutoffDay) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll-cycles'] }); close(); },
  });

  function close() { setOpen(false); setEdit(null); setForm(EMPTY); createMutation.reset(); updateMutation.reset(); }

  const cycles    = cyclesData ?? [];
  const companies = companiesData?.data ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutError  = createMutation.error || updateMutation.error;
  const set = (k: keyof CycleForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pay Cycles</h1>
          <p className="page-subtitle">Configure payroll frequency and dates per company</p>
        </div>
        <Button onClick={() => { setEdit(null); setForm(EMPTY); setOpen(true); }}>+ Add Cycle</Button>
      </div>
      {isLoading ? (
        <Skeleton height={160} />
      ) : !cycles.length ? (
        <SetupGuide content={SETUP['payroll-cycles']} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Company</th><th>Frequency</th><th>Pay Day</th><th>Input Cutoff</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {cycles.map(c => (
                <tr key={c.publicId}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{companies.find(co => co.publicId === c.companyId)?.name ?? c.companyId}</td>
                  <td style={{ textTransform: 'capitalize' }}>{c.frequency}</td>
                  <td>{c.payDay}{c.payDay === 1 ? 'st' : c.payDay === 2 ? 'nd' : c.payDay === 3 ? 'rd' : 'th'} of month</td>
                  <td>{c.cutoffDay}{c.cutoffDay === 1 ? 'st' : c.cutoffDay === 2 ? 'nd' : c.cutoffDay === 3 ? 'rd' : 'th'} of month</td>
                  <td><Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEdit(c); setForm({ companyId: c.companyId, name: c.name, payDay: String(c.payDay), cutoffDay: String(c.cutoffDay) }); setOpen(true); }}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={close} title={edit ? 'Edit Pay Cycle' : 'Add Pay Cycle'} size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button loading={isPending} onClick={() => edit ? updateMutation.mutate() : createMutation.mutate()}>
              {edit ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      >
        {mutError && <div className="alert alert-danger">{(mutError as {message?: string}).message ?? 'Failed to save'}</div>}
        {!edit && (
          <div className="form-group">
            <label className="form-label">Company *</label>
            <select className="select" value={form.companyId} onChange={set('companyId')}>
              <option value="">Select company</option>
              {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Cycle Name *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Monthly — India" />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Pay Day (1–31)</label>
            <input className="input" type="number" min={1} max={31} value={form.payDay} onChange={set('payDay')} />
            <span className="form-hint">Day salary is credited</span>
          </div>
          <div className="form-group">
            <label className="form-label">Input Cutoff (1–31)</label>
            <input className="input" type="number" min={1} max={31} value={form.cutoffDay} onChange={set('cutoffDay')} />
            <span className="form-hint">Last day to enter LOP / inputs</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
