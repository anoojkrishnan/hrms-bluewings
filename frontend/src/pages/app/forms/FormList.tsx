import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dynamicFormsApi } from '@/lib/api/dynamic-forms.api';
import type { DynamicForm } from '@/lib/api/dynamic-forms.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

interface CreateForm {
  name: string;
  module: string;
}

export default function FormList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: '', module: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['dynamic-forms', page],
    queryFn: () => dynamicFormsApi.listForms({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: () => dynamicFormsApi.createForm(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-forms'] });
      setShowCreate(false);
      setForm({ name: '', module: '' });
    },
  });

  const forms = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dynamic Forms</h1>
        <div className="page-actions">
          <Button onClick={() => setShowCreate(true)}>Create Form</Button>
        </div>
      </div>
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <Skeleton height={48} />
          </div>
        ))
      ) : forms.length === 0 ? (
        <SetupGuide content={SETUP['forms']} />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Module</th>
                  <th>Version</th>
                  <th>Active</th>
                  <th>Fields</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f: DynamicForm) => (
                  <tr key={f.publicId}>
                    <td style={{ fontWeight: 500 }}>{f.name}</td>
                    <td>
                      <Badge variant="info">{f.module}</Badge>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      v{f.version}
                    </td>
                    <td>
                      <Badge variant={f.isActive ? 'success' : 'default'}>
                        {f.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {f.fields?.length ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="pagination-info">Page {meta.page} of {meta.totalPages}</span>
              <button className="btn btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <Modal open title="Create Form" onClose={() => setShowCreate(false)}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              className="input"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Exit Interview Form"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Module *</label>
            <input
              className="input"
              type="text"
              value={form.module}
              onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
              placeholder="e.g. offboarding"
            />
          </div>
          {createMutation.isError && (
            <div className="alert alert-danger">Failed to create form. Please try again.</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name.trim() || !form.module.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
