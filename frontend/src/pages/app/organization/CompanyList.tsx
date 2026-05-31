import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '@/lib/api/organization.api';
import type { Company, CreateCompanyDto, UpdateCompanyDto } from '@/lib/api/organization.api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface CompanyForm {
  name: string;
  legalName: string;
  country: string;
  state: string;
  currency: string;
  timezone: string;
}

const INITIAL_FORM: CompanyForm = {
  name: '',
  legalName: '',
  country: 'India',
  state: '',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
};

function toCreateDto(form: CompanyForm): CreateCompanyDto {
  return {
    name: form.name,
    legalName: form.legalName || undefined,
    country: form.country || undefined,
    state: form.state || undefined,
    currency: form.currency || undefined,
    timezone: form.timezone || undefined,
  };
}

export default function CompanyList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Partial<CompanyForm>>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });

  const companies = data?.data ?? [];
  const activeCount = companies.filter((c) => c.isActive).length;

  const createMutation = useMutation({
    mutationFn: (dto: CreateCompanyDto) => organizationApi.createCompany(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, dto }: { publicId: string; dto: UpdateCompanyDto }) =>
      organizationApi.updateCompany(publicId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => organizationApi.deleteCompany(publicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeleteTarget(null);
    },
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditTarget(company);
    setForm({
      name: company.name,
      legalName: company.legalName ?? '',
      country: company.country,
      state: company.state ?? '',
      currency: company.currency,
      timezone: company.timezone,
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

  const set = (field: keyof CompanyForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFormErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const errs: Partial<CompanyForm> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editTarget) {
      updateMutation.mutate({ publicId: editTarget.publicId, dto: toCreateDto(form) });
    } else {
      createMutation.mutate(toCreateDto(form));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.isError || updateMutation.isError;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Companies</h1>
        <div className="page-actions">
          <Button onClick={openAdd}>+ Add Company</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Companies</div>
          <div className="stat-value">{companies.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value">{activeCount}</div>
        </div>
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}><Skeleton height={56} /></div>
          ))}
        </div>
      )}

      {isError && (
        <div className="alert alert-danger">Failed to load companies. Please try again.</div>
      )}

      {!isLoading && !isError && companies.length === 0 && (
        <EmptyState
          title="No companies yet"
          description="Add your first legal entity to get started."
          cta={<Button onClick={openAdd}>Add Company</Button>}
        />
      )}

      {!isLoading && !isError && companies.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Legal Name</th>
                <th>Country</th>
                <th>State</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.publicId}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.legalName ?? '—'}</td>
                  <td>{c.country}</td>
                  <td>{c.state ?? '—'}</td>
                  <td>{c.currency}</td>
                  <td>
                    <Badge variant={c.isActive ? 'success' : 'default'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Edit"
                        onClick={() => openEdit(c)}
                      >
                        ✎
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title="Delete"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => setDeleteTarget(c)}
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
        title={editTarget ? 'Edit Company' : 'Add Company'}
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
          <input className="input" value={form.name} onChange={set('name')} placeholder="Acme Pvt Ltd" />
          {formErrors.name && <span className="form-error">{formErrors.name}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Legal Name</label>
          <input className="input" value={form.legalName} onChange={set('legalName')} placeholder="Acme Technologies Private Limited" />
        </div>
        <div className="form-group">
          <label className="form-label">Country</label>
          <input className="input" value={form.country} onChange={set('country')} placeholder="India" />
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <input className="input" value={form.state} onChange={set('state')} placeholder="Karnataka" />
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="select" value={form.currency} onChange={set('currency')}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Timezone</label>
            <select className="select" value={form.timezone} onChange={set('timezone')}>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Company"
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
