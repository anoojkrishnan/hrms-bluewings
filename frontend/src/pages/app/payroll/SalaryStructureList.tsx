import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type SalaryStructure, type SalaryStructureComponent } from '@/lib/api/payroll.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

interface StructForm {
  code: string;
  name: string;
  description: string;
  components: SalaryStructureComponent[];
}

const EMPTY: StructForm = { code: '', name: '', description: '', components: [] };

export default function SalaryStructureList() {
  const qc = useQueryClient();
  const [open, setOpen]       = useState(false);
  const [edit, setEdit]       = useState<SalaryStructure | null>(null);
  const [form, setForm]       = useState<StructForm>(EMPTY);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected]     = useState<SalaryStructure | null>(null);

  const { data: structures, isLoading } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: payrollApi.listStructures,
  });

  const { data: allComponents } = useQuery({
    queryKey: ['salary-components'],
    queryFn: payrollApi.listComponents,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => payrollApi.createStructure({ code: form.code.toUpperCase(), name: form.name, description: form.description || undefined, components: form.components }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-structures'] }); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: () => payrollApi.updateStructure(edit!.publicId, { name: form.name, description: form.description || undefined, components: form.components }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salary-structures'] }); close(); },
  });

  function openAdd() { setEdit(null); setForm(EMPTY); setOpen(true); }

  function openEdit(s: SalaryStructure) {
    setEdit(s);
    setForm({ code: s.code, name: s.name, description: s.description ?? '', components: [...s.components] });
    setOpen(true);
  }

  function close() { setOpen(false); setEdit(null); setForm(EMPTY); createMutation.reset(); updateMutation.reset(); }

  function addComponent(code: string) {
    if (form.components.find(c => c.componentCode === code)) return;
    setForm(p => ({ ...p, components: [...p.components, { componentCode: code }] }));
  }

  function removeComponent(code: string) {
    setForm(p => ({ ...p, components: p.components.filter(c => c.componentCode !== code) }));
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutError  = createMutation.error || updateMutation.error;
  const components = allComponents ?? [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary Structures</h1>
          <p className="page-subtitle">Templates that group components into a salary package</p>
        </div>
        <Button onClick={openAdd}>+ Add Structure</Button>
      </div>

      {isLoading ? (
        <Skeleton height={200} />
      ) : !structures?.length ? (
        <SetupGuide content={SETUP['salary-structures']} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Name</th><th>Components</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {structures.map(s => (
                <tr key={s.publicId}>
                  <td><code style={{ fontSize: '0.8125rem', background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4 }}>{s.code}</code></td>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{s.components.length} component{s.components.length !== 1 ? 's' : ''}</td>
                  <td><Badge variant={s.isActive ? 'success' : 'default'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(s); setDetailOpen(true); }}>View</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail view */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected?.name ?? ''} size="lg">
        {selected && (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>{selected.description}</p>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Component</th><th>Override Type</th><th>Override Value</th></tr>
                </thead>
                <tbody>
                  {selected.components.map(c => (
                    <tr key={c.componentCode}>
                      <td style={{ fontWeight: 500 }}>{c.componentCode}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>{c.overrideFormulaType ?? '—'}</td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {c.overrideAmount != null && `₹${c.overrideAmount.toLocaleString('en-IN')}`}
                        {c.overridePercentage != null && `${c.overridePercentage}%`}
                        {c.overrideFormula && <code>{c.overrideFormula}</code>}
                        {!c.overrideAmount && !c.overridePercentage && !c.overrideFormula && '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit */}
      <Modal open={open} onClose={close} title={edit ? `Edit: ${edit.name}` : 'Add Salary Structure'} size="lg"
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
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Code *</label>
            <input className="input" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="SE_L2" disabled={!!edit} style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Software Engineer L2" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Description</label>
            <input className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
          </div>
        </div>

        <label className="form-label">Components ({form.components.length} selected)</label>
        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <select className="select" style={{ maxWidth: 280 }} onChange={e => { if (e.target.value) addComponent(e.target.value); e.target.value = ''; }} defaultValue="">
            <option value="">+ Add component…</option>
            {components.filter(c => !form.components.find(fc => fc.componentCode === c.code)).map(c => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {form.components.length > 0 && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            {form.components.map((comp, i) => (
              <div key={comp.componentCode} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < form.components.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <code style={{ flex: 1, fontWeight: 600 }}>{comp.componentCode}</code>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)' }} onClick={() => removeComponent(comp.componentCode)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
