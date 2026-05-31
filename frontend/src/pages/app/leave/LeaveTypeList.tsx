import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '@/lib/api/leave.api';
import type { LeaveType } from '@/lib/api/leave.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface LeaveTypeForm {
  name: string;
  code: string;
  isPaidLeave: boolean;
  isCarryForward: boolean;
  maxCarryForwardDays: string;
  isEncashable: boolean;
  requiresDocument: boolean;
  minDaysNotice: string;
  maxConsecutiveDays: string;
}

const EMPTY_FORM: LeaveTypeForm = {
  name: '',
  code: '',
  isPaidLeave: true,
  isCarryForward: false,
  maxCarryForwardDays: '',
  isEncashable: false,
  requiresDocument: false,
  minDaysNotice: '',
  maxConsecutiveDays: '',
};

function toDto(f: LeaveTypeForm) {
  return {
    name: f.name.trim(),
    code: f.code.trim().toUpperCase(),
    isPaidLeave: f.isPaidLeave,
    isCarryForward: f.isCarryForward,
    maxCarryForwardDays: f.isCarryForward && f.maxCarryForwardDays ? Number(f.maxCarryForwardDays) : undefined,
    isEncashable: f.isEncashable,
    requiresDocument: f.requiresDocument,
    minDaysNotice: f.minDaysNotice ? Number(f.minDaysNotice) : undefined,
    maxConsecutiveDays: f.maxConsecutiveDays ? Number(f.maxConsecutiveDays) : undefined,
  };
}

function fromType(lt: LeaveType): LeaveTypeForm {
  return {
    name: lt.name,
    code: lt.code,
    isPaidLeave: lt.isPaidLeave ?? true,
    isCarryForward: lt.isCarryForward ?? false,
    maxCarryForwardDays: lt.maxCarryForwardDays != null ? String(lt.maxCarryForwardDays) : '',
    isEncashable: lt.isEncashable ?? false,
    requiresDocument: lt.requiresDocument ?? false,
    minDaysNotice: lt.minDaysNotice != null ? String(lt.minDaysNotice) : '',
    maxConsecutiveDays: lt.maxConsecutiveDays != null ? String(lt.maxConsecutiveDays) : '',
  };
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 38, height: 22, borderRadius: 11, border: 'none', padding: 0,
          background: checked ? 'var(--color-green)' : 'var(--color-border)',
          position: 'relative', cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
          background: '#fff', transition: 'left 0.15s', left: checked ? 19 : 3, display: 'block',
        }} />
      </button>
    </div>
  );
}

export default function LeaveTypeList() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<LeaveTypeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof LeaveTypeForm, string>>>({});

  const { data: types, isLoading, isError } = useQuery({
    queryKey: ['leave-types'],
    queryFn: leaveApi.listTypes,
  });

  const createMutation = useMutation({
    mutationFn: (dto: ReturnType<typeof toDto>) => leaveApi.createType(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, dto }: { publicId: string; dto: ReturnType<typeof toDto> }) =>
      leaveApi.updateType(publicId, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave-types'] }); closeModal(); },
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditTarget(lt);
    setForm(fromType(lt));
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
    createMutation.reset();
    updateMutation.reset();
  };

  const set = (field: keyof LeaveTypeForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(p => ({ ...p, [field]: e.target.value }));
      setErrors(p => ({ ...p, [field]: undefined }));
    };

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.code.trim()) errs.code = 'Required';
    else if (!/^[A-Z0-9_]+$/.test(form.code.trim().toUpperCase())) errs.code = 'Letters, numbers and underscores only';
    if (form.isCarryForward && form.maxCarryForwardDays && Number(form.maxCarryForwardDays) < 0) errs.maxCarryForwardDays = 'Must be ≥ 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const dto = toDto(form);
    if (editTarget) {
      updateMutation.mutate({ publicId: editTarget.publicId, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Leave Types</h1>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 8 }}><Skeleton height={60} /></div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-container">
        <EmptyState title="Failed to load" description="Could not load leave types." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Types</h1>
          <p className="page-subtitle">{types?.length ?? 0} type{types?.length !== 1 ? 's' : ''} configured</p>
        </div>
        <Button onClick={openAdd}>+ Add Leave Type</Button>
      </div>

      {types && types.length > 0 ? (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Paid</th>
                <th>Carry Forward</th>
                <th>Encashable</th>
                <th>Doc Required</th>
                <th>Max Consecutive</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {types.map((lt) => (
                <tr key={lt.publicId} className="clickable" onClick={() => openEdit(lt)}>
                  <td style={{ fontWeight: 600 }}>{lt.name}</td>
                  <td>
                    <code style={{ fontSize: '0.8125rem', background: 'var(--color-bg)', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace' }}>
                      {lt.code}
                    </code>
                  </td>
                  <td><Badge variant={lt.isPaidLeave ? 'success' : 'default'}>{lt.isPaidLeave ? 'Paid' : 'Unpaid'}</Badge></td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {lt.isCarryForward
                      ? (lt.maxCarryForwardDays != null ? `Up to ${lt.maxCarryForwardDays} days` : 'Yes')
                      : '—'}
                  </td>
                  <td><Badge variant={lt.isEncashable ? 'teal' : 'default'}>{lt.isEncashable ? 'Yes' : 'No'}</Badge></td>
                  <td><Badge variant={lt.requiresDocument ? 'warning' : 'default'}>{lt.requiresDocument ? 'Required' : 'No'}</Badge></td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {lt.maxConsecutiveDays != null ? `${lt.maxConsecutiveDays} days` : '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(lt)}>Edit</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-red)' }}
                        onClick={() => setDeleteTarget(lt)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No leave types configured"
          description="Add leave types like Casual Leave, Sick Leave, or Annual Leave to let employees apply."
          cta={<Button onClick={openAdd}>Add Leave Type</Button>}
        />
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? `Edit: ${editTarget.name}` : 'Add Leave Type'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={isPending}>
              {editTarget ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        }
      >
        {mutationError && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            {(mutationError as { message?: string }).message ?? 'Failed to save. Please try again.'}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Name <span style={{ color: 'var(--color-red)' }}>*</span></label>
            <input
              className={`input${errors.name ? ' error' : ''}`}
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Casual Leave"
              autoFocus
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Code <span style={{ color: 'var(--color-red)' }}>*</span></label>
            <input
              className={`input${errors.code ? ' error' : ''}`}
              value={form.code}
              onChange={e => { setForm(p => ({ ...p, code: e.target.value.toUpperCase() })); setErrors(p => ({ ...p, code: undefined })); }}
              placeholder="e.g. CL"
              disabled={!!editTarget}
              style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
            />
            {errors.code
              ? <span className="form-error">{errors.code}</span>
              : <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Unique identifier — cannot be changed after creation</span>
            }
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          <Toggle label="Paid Leave" checked={form.isPaidLeave} onChange={v => setForm(p => ({ ...p, isPaidLeave: v }))} />
          <Toggle label="Carry Forward to next year" checked={form.isCarryForward} onChange={v => setForm(p => ({ ...p, isCarryForward: v, maxCarryForwardDays: v ? p.maxCarryForwardDays : '' }))} />

          {form.isCarryForward && (
            <div className="form-group" style={{ paddingLeft: 16, paddingTop: 10 }}>
              <label className="form-label">Max Carry Forward Days</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.maxCarryForwardDays}
                onChange={set('maxCarryForwardDays')}
                placeholder="Leave blank for unlimited"
                style={{ maxWidth: 220 }}
              />
              {errors.maxCarryForwardDays && <span className="form-error">{errors.maxCarryForwardDays}</span>}
            </div>
          )}

          <Toggle label="Encashable" checked={form.isEncashable} onChange={v => setForm(p => ({ ...p, isEncashable: v }))} />
          <Toggle label="Requires supporting document" checked={form.requiresDocument} onChange={v => setForm(p => ({ ...p, requiresDocument: v }))} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginTop: 4 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Min Days Notice</label>
            <input className="input" type="number" min={0} value={form.minDaysNotice} onChange={set('minDaysNotice')} placeholder="0" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Max Consecutive Days</label>
            <input className="input" type="number" min={1} value={form.maxConsecutiveDays} onChange={set('maxConsecutiveDays')} placeholder="No limit" />
          </div>
        </div>
      </Modal>

      {/* ── Delete confirmation ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Leave Type"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteTarget) {
                  leaveApi.updateType(deleteTarget.publicId, { isActive: false } as Partial<LeaveType>)
                    .then(() => { qc.invalidateQueries({ queryKey: ['leave-types'] }); setDeleteTarget(null); })
                    .catch(() => alert('Failed to delete. Please try again.'));
                }
              }}
            >
              Deactivate
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Are you sure you want to deactivate <strong style={{ color: 'var(--color-text-primary)' }}>{deleteTarget?.name}</strong>?
          Existing leave applications using this type will not be affected.
        </p>
      </Modal>
    </div>
  );
}
