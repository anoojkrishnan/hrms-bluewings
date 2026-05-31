import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationApi } from '@/lib/api/organization.api';
import type { Department, CreateDepartmentDto } from '@/lib/api/organization.api';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface DeptForm {
  name: string;
  code: string;
  companyId: string;
  parentId: string;
}

const INITIAL_FORM: DeptForm = {
  name: '',
  code: '',
  companyId: '',
  parentId: '',
};

export default function DepartmentList() {
  const queryClient = useQueryClient();
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [form, setForm] = useState<DeptForm>(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Partial<DeptForm>>({});

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });
  const companies = companiesData?.data ?? [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['departments', filterCompanyId],
    queryFn: () =>
      organizationApi.listDepartments(
        filterCompanyId ? { companyId: filterCompanyId, limit: '100' } : { limit: '100' },
      ),
  });
  const departments = data?.data ?? [];

  const companyName = (companyId: string) =>
    companies.find((c) => c.publicId === companyId)?.name ?? companyId;

  const deptName = (deptId: string) =>
    departments.find((d) => d.publicId === deptId)?.name ?? deptId;

  const createMutation = useMutation({
    mutationFn: (dto: CreateDepartmentDto) => organizationApi.createDepartment(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ publicId, dto }: { publicId: string; dto: Partial<CreateDepartmentDto> }) =>
      organizationApi.updateDepartment(publicId, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => organizationApi.deleteDepartment(publicId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeleteTarget(null);
    },
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(INITIAL_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditTarget(dept);
    setForm({
      name: dept.name,
      code: dept.code,
      companyId: dept.companyId,
      parentId: dept.parentId ?? '',
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

  const set = (field: keyof DeptForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFormErrors((er) => ({ ...er, [field]: undefined }));
  };

  const validate = () => {
    const errs: Partial<DeptForm> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.code.trim()) errs.code = 'Code is required';
    if (!form.companyId) errs.companyId = 'Company is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const dto: CreateDepartmentDto = {
      name: form.name,
      code: form.code,
      companyId: form.companyId,
      parentId: form.parentId || undefined,
    };
    if (editTarget) {
      updateMutation.mutate({ publicId: editTarget.publicId, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.isError || updateMutation.isError;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Departments</h1>
        <div className="page-actions">
          <Button onClick={openAdd}>+ Add Department</Button>
        </div>
      </div>

      <div className="filters">
        <select
          className="select"
          style={{ width: 220 }}
          value={filterCompanyId}
          onChange={(e) => setFilterCompanyId(e.target.value)}
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.publicId} value={c.publicId}>{c.name}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}><Skeleton height={56} /></div>
          ))}
        </div>
      )}

      {isError && (
        <div className="alert alert-danger">Failed to load departments. Please try again.</div>
      )}

      {!isLoading && !isError && departments.length === 0 && (
        <EmptyState
          title="No departments yet"
          description="Add departments to structure your organisation."
          cta={<Button onClick={openAdd}>Add Department</Button>}
        />
      )}

      {!isLoading && !isError && departments.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Company</th>
                <th>Parent Dept</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.publicId}>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td><code>{d.code}</code></td>
                  <td>{companyName(d.companyId)}</td>
                  <td>{d.parentId ? deptName(d.parentId) : '—'}</td>
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
        title={editTarget ? 'Edit Department' : 'Add Department'}
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
          <input className="input" value={form.name} onChange={set('name')} placeholder="Engineering" />
          {formErrors.name && <span className="form-error">{formErrors.name}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Code *</label>
          <input className="input" value={form.code} onChange={set('code')} placeholder="ENG" />
          {formErrors.code && <span className="form-error">{formErrors.code}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Company *</label>
          <select className="select" value={form.companyId} onChange={set('companyId')}>
            <option value="">Select company…</option>
            {companies.map((c) => (
              <option key={c.publicId} value={c.publicId}>{c.name}</option>
            ))}
          </select>
          {formErrors.companyId && <span className="form-error">{formErrors.companyId}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Parent Department</label>
          <select className="select" value={form.parentId} onChange={set('parentId')}>
            <option value="">None</option>
            {departments
              .filter((d) => !editTarget || d.publicId !== editTarget.publicId)
              .map((d) => (
                <option key={d.publicId} value={d.publicId}>{d.name}</option>
              ))}
          </select>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Department"
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
