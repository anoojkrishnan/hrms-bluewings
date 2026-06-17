import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type SalaryComponent, type ComponentType, type FormulaType } from '@/lib/api/payroll.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

const COMPONENT_TYPES: { value: ComponentType; label: string }[] = [
  { value: 'earning',               label: 'Earning' },
  { value: 'deduction',             label: 'Deduction' },
  { value: 'employer_contribution', label: 'Employer Contribution' },
  { value: 'benefit',               label: 'Benefit' },
];

const FORMULA_TYPES: { value: FormulaType; label: string }[] = [
  { value: 'fixed_amount',        label: 'Fixed Amount (₹)' },
  { value: 'percentage_of_basic', label: '% of Basic' },
  { value: 'percentage_of_gross', label: '% of Gross' },
  { value: 'formula',             label: 'Custom Formula' },
  { value: 'statutory',           label: 'Statutory (auto)' },
];

const TYPE_VARIANT: Record<ComponentType, 'success' | 'danger' | 'info' | 'teal'> = {
  earning:               'success',
  deduction:             'danger',
  employer_contribution: 'info',
  benefit:               'teal',
};

interface CompForm {
  code: string; name: string; type: ComponentType; formulaType: FormulaType;
  defaultAmount: string; defaultPercentage: string; formula: string;
  isTaxable: boolean; isVisible: boolean; displayOrder: string; description: string;
}

const EMPTY: CompForm = {
  code: '', name: '', type: 'earning', formulaType: 'fixed_amount',
  defaultAmount: '', defaultPercentage: '', formula: '',
  isTaxable: true, isVisible: true, displayOrder: '0', description: '',
};

export default function SalaryComponentList() {
  const qc = useQueryClient();
  const [open, setOpen]   = useState(false);
  const [edit, setEdit]   = useState<SalaryComponent | null>(null);
  const [form, setForm]   = useState<CompForm>(EMPTY);

  const { data: components, isLoading } = useQuery({
    queryKey: ['salary-components'],
    queryFn:  payrollApi.listComponents,
  });

  const createMutation = useMutation({
    mutationFn: () => payrollApi.createComponent(toDto()),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['salary-components'] }); close(); },
  });

  const updateMutation = useMutation({
    mutationFn: () => payrollApi.updateComponent(edit!.publicId, toDto()),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['salary-components'] }); close(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => payrollApi.deleteComponent(publicId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['salary-components'] }),
  });

  function toDto() {
    return {
      code: form.code.toUpperCase(), name: form.name, type: form.type,
      formulaType: form.formulaType,
      ...(form.formulaType === 'fixed_amount'        ? { defaultAmount:     Number(form.defaultAmount) } : {}),
      ...(form.formulaType === 'percentage_of_basic' || form.formulaType === 'percentage_of_gross'
                                                     ? { defaultPercentage: Number(form.defaultPercentage) } : {}),
      ...(form.formulaType === 'formula'             ? { formula:           form.formula } : {}),
      isTaxable: form.isTaxable, isVisible: form.isVisible,
      displayOrder: Number(form.displayOrder), description: form.description || undefined,
    };
  }

  function openAdd() {
    setEdit(null); setForm(EMPTY); setOpen(true);
  }

  function openEdit(c: SalaryComponent) {
    setEdit(c);
    setForm({
      code: c.code, name: c.name, type: c.type, formulaType: c.formulaType,
      defaultAmount:    String(c.defaultAmount ?? ''),
      defaultPercentage: String(c.defaultPercentage ?? ''),
      formula:          c.formula ?? '',
      isTaxable: c.isTaxable, isVisible: c.isVisible,
      displayOrder: String(c.displayOrder), description: c.description ?? '',
    });
    setOpen(true);
  }

  function close() { setOpen(false); setEdit(null); setForm(EMPTY); createMutation.reset(); updateMutation.reset(); }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutError  = createMutation.error || updateMutation.error;
  const set = (k: keyof CompForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary Components</h1>
          <p className="page-subtitle">Define earnings, deductions, and contributions</p>
        </div>
        <Button onClick={openAdd}>+ Add Component</Button>
      </div>

      {isLoading ? (
        <Skeleton height={200} />
      ) : !components?.length ? (
        <SetupGuide content={SETUP['salary-components']} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Name</th><th>Type</th><th>Formula</th><th>Value</th><th>Taxable</th><th>Visible</th><th></th></tr>
            </thead>
            <tbody>
              {[...components].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)).map(c => (
                <tr key={c.publicId}>
                  <td><code style={{ fontSize: '0.8125rem', background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4 }}>{c.code}</code></td>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td><Badge variant={TYPE_VARIANT[c.type]}>{c.type.replace(/_/g, ' ')}</Badge></td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{FORMULA_TYPES.find(f => f.value === c.formulaType)?.label}</td>
                  <td style={{ fontSize: '0.875rem' }}>
                    {c.formulaType === 'fixed_amount'        && c.defaultAmount    != null && `₹${c.defaultAmount.toLocaleString('en-IN')}`}
                    {(c.formulaType === 'percentage_of_basic' || c.formulaType === 'percentage_of_gross') && c.defaultPercentage != null && `${c.defaultPercentage}%`}
                    {c.formulaType === 'formula'             && <code style={{ fontSize: '0.75rem' }}>{c.formula}</code>}
                    {c.formulaType === 'statutory'           && 'Auto'}
                  </td>
                  <td><Badge variant={c.isTaxable ? 'warning' : 'default'}>{c.isTaxable ? 'Yes' : 'No'}</Badge></td>
                  <td><Badge variant={c.isVisible ? 'success' : 'default'}>{c.isVisible ? 'Yes' : 'No'}</Badge></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      {!c.isSystemComponent && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)' }}
                          onClick={() => { if (confirm(`Delete "${c.name}"?`)) deleteMutation.mutate(c.publicId); }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        title={edit ? `Edit: ${edit.name}` : 'Add Salary Component'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button loading={isPending} onClick={() => edit ? updateMutation.mutate() : createMutation.mutate()}>
              {edit ? 'Save' : 'Create'}
            </Button>
          </div>
        }
      >
        {mutError && <div className="alert alert-danger">{getErrorMessage(mutError)}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Code *</label>
            <input className="input" value={form.code} onChange={set('code')} placeholder="BASIC" disabled={!!edit} style={{ fontFamily: 'monospace', textTransform: 'uppercase' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Basic Salary" />
          </div>
          <div className="form-group">
            <label className="form-label">Type *</label>
            <select className="select" value={form.type} onChange={set('type')}>
              {COMPONENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Formula Type *</label>
            <select className="select" value={form.formulaType} onChange={set('formulaType')}>
              {FORMULA_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {form.formulaType === 'fixed_amount' && (
            <div className="form-group">
              <label className="form-label">Default Amount (₹) *</label>
              <input className="input" type="number" min={0} value={form.defaultAmount} onChange={set('defaultAmount')} placeholder="0" />
            </div>
          )}
          {(form.formulaType === 'percentage_of_basic' || form.formulaType === 'percentage_of_gross') && (
            <div className="form-group">
              <label className="form-label">Percentage (%) *</label>
              <input className="input" type="number" min={0} max={500} step={0.01} value={form.defaultPercentage} onChange={set('defaultPercentage')} placeholder="40" />
            </div>
          )}
          {form.formulaType === 'formula' && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Formula *</label>
              <input className="input" value={form.formula} onChange={set('formula')} placeholder="basic * 0.4 + ctc * 0.1" style={{ fontFamily: 'monospace' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Available variables: basic, gross, ctc, workingDays, presentDays, lopDays
              </span>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Display Order</label>
            <input className="input" type="number" min={0} value={form.displayOrder} onChange={set('displayOrder')} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isTaxable} onChange={e => setForm(p => ({ ...p, isTaxable: e.target.checked }))} style={{ accentColor: 'var(--color-primary)' }} />
            <span className="form-label" style={{ margin: 0 }}>Taxable</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isVisible} onChange={e => setForm(p => ({ ...p, isVisible: e.target.checked }))} style={{ accentColor: 'var(--color-primary)' }} />
            <span className="form-label" style={{ margin: 0 }}>Show on payslip</span>
          </label>
        </div>
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Description</label>
          <input className="input" value={form.description} onChange={set('description')} placeholder="Optional" />
        </div>
      </Modal>
    </div>
  );
}
