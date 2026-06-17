import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '@/lib/api/organization.api';
import type { Location, CreateLocationDto } from '@/lib/api/organization.api';
import { Modal } from '@/components/ui/Modal';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

interface LocationForm {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

const INITIAL_FORM: LocationForm = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  pincode: '',
};

export default function LocationList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Partial<LocationForm>>({});

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['locations'],
    queryFn: () => organizationApi.listLocations({ limit: '100' }),
  });
  const locations = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateLocationDto) => organizationApi.createLocation(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locations'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, dto }: { publicId: string; dto: Partial<CreateLocationDto> }) =>
      organizationApi.updateLocation(publicId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locations'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => organizationApi.deleteLocation(publicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locations'] });
      setDeleteTarget(null);
    },
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditTarget(loc);
    setForm({
      name: loc.name,
      code: loc.code,
      address: loc.address?.line1 ?? '',
      city: loc.address?.city ?? loc.city ?? '',
      state: loc.address?.state ?? loc.state ?? '',
      country: loc.address?.country ?? loc.country,
      pincode: loc.address?.pincode ?? loc.pincode ?? '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
  };

  const set = (field: keyof LocationForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFormErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const errs: Partial<LocationForm> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.code.trim()) errs.code = 'Code is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const toDto = (): CreateLocationDto => ({
    name: form.name,
    code: form.code,
    address: form.address || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    country: form.country || undefined,
    pincode: form.pincode || undefined,
  });

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) {
      updateMutation.mutate({ publicId: editTarget.publicId, dto: toDto() });
    } else {
      createMutation.mutate(toDto());
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Locations</h1>
        <div className="page-actions">
          <Button onClick={openAdd}>+ Add Location</Button>
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
        <div className="alert alert-danger">{getErrorMessage(error, 'Failed to load locations.')}</div>
      )}

      {!isLoading && !isError && locations.length === 0 && (
        <SetupGuide content={SETUP['locations']} />
      )}


      {!isLoading && !isError && locations.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>City</th>
                <th>State</th>
                <th>Country</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.publicId}>
                  <td style={{ fontWeight: 500 }}>{loc.name}</td>
                  <td><code>{loc.code}</code></td>
                  <td>{loc.address?.city ?? loc.city ?? '—'}</td>
                  <td>{loc.address?.state ?? loc.state ?? '—'}</td>
                  <td>{loc.address?.country ?? loc.country}</td>
                  <td>
                    <Badge variant={loc.isActive ? 'success' : 'default'}>
                      {loc.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => openEdit(loc)}>✎</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Delete"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => setDeleteTarget(loc)}
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
        title={editTarget ? 'Edit Location' : 'Add Location'}
        size="lg"
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
          <div className="alert alert-danger">{getErrorMessage(mutationError)}</div>
        )}
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Bangalore HQ" />
            {formErrors.name && <span className="form-error">{formErrors.name}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Code *</label>
            <input className="input" value={form.code} onChange={set('code')} placeholder="BLR_HQ" />
            {formErrors.code && <span className="form-error">{formErrors.code}</span>}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <input className="input" value={form.address} onChange={set('address')} placeholder="123, MG Road" />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="input" value={form.city} onChange={set('city')} placeholder="Bengaluru" />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="input" value={form.state} onChange={set('state')} placeholder="Karnataka" />
          </div>
          <div className="form-group">
            <label className="form-label">Country</label>
            <input className="input" value={form.country} onChange={set('country')} placeholder="India" />
          </div>
          <div className="form-group">
            <label className="form-label">Pincode</label>
            <input className="input" value={form.pincode} onChange={set('pincode')} placeholder="560001" />
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Location"
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
