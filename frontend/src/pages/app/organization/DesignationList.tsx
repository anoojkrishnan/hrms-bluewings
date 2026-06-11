import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '@/lib/api/organization.api';
import type { Designation, CreateDesignationDto } from '@/lib/api/organization.api';
import { Modal } from '@/components/ui/Modal';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface DesignationForm {
  name: string;
  code: string;
}

const INITIAL_FORM: DesignationForm = { name: '', code: '' };

export default function DesignationList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Designation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);
  const [form, setForm] = useState<DesignationForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Partial<DesignationForm>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['designations'],
    queryFn: () => organizationApi.listDesignations({ limit: '100' }),
  });
  const designations = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateDesignationDto) => organizationApi.createDesignation(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['designations'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, dto }: { publicId: string; dto: Partial<CreateDesignationDto> }) =>
      organizationApi.updateDesignation(publicId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['designations'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => organizationApi.deleteDesignation(publicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['designations'] });
      setDeleteTarget(null);
    },
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (d: Designation) => {
    setEditTarget(d);
    setForm({ name: d.name, code: d.code });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
  };

  const set = (field: keyof DesignationForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFormErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const errs: Partial<DesignationForm> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.code.trim()) errs.code = 'Code is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) {
      updateMutation.mutate({ publicId: editTarget.publicId, dto: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.isError || updateMutation.isError;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Designations</h1>
        <div className="page-actions">
          <Button onClick={openAdd}>+ Add Designation</Button>
        </div>
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}><Skeleton height={56} /></div>
          ))}
        </div>
      )}

      {isError && (
        <div className="alert alert-danger">Failed to load designations. Please try again.</div>
      )}

      {!isLoading && !isError && designations.length === 0 && (
        <SetupGuide content={SETUP['designations']} />
      )}


      {!isLoading && !isError && designations.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {designations.map((d) => (
                <tr key={d.publicId}>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td><code>{d.code}</code></td>
                  <td>
                    <Badge variant={d.isActive ? 'success' : 'default'}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(d)}>✎</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Delete"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => setDeleteTarget(d)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Edit Designation' : 'Add Designation'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        }
      >
        {mutationError && (
          <div className="alert alert-danger">Failed to save. Please try again.</div>
        )}
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Senior Engineer" />
          {formErrors.name && <span className="form-error">{formErrors.name}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Code *</label>
          <input className="input" value={form.code} onChange={set('code')} placeholder="SR_ENG" />
          {formErrors.code && <span className="form-error">{formErrors.code}</span>}
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Designation"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.publicId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      >
        <p>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot
          be undone.
        </p>
      </Modal>
    </div>
  );
}
