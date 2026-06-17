import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '@/lib/api/workflow.api';
import type { Workflow } from '@/lib/api/workflow.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/utils/errors';

const MODULE_OPTIONS = [
  'leave', 'attendance', 'payroll', 'employee', 'expense',
  'claims', 'asset', 'document', 'onboarding', 'offboarding',
];

interface CreateForm {
  name: string;
  module: string;
  isActive: boolean;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        background: checked ? 'var(--color-success)' : 'var(--color-border)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
          display: 'block',
        }}
      />
    </button>
  );
}

export default function WorkflowList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: '', module: '', isActive: true });

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', page],
    queryFn: () => workflowApi.listWorkflows({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: () => workflowApi.createWorkflow({ ...form, triggerEvent: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowCreate(false);
      setForm({ name: '', module: '', isActive: true });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ publicId, isActive }: { publicId: string; isActive: boolean }) =>
      workflowApi.updateWorkflow(publicId, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  });

  const workflows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Workflows</h1>
        <div className="page-actions">
          <Button onClick={() => setShowCreate(true)}>Create Workflow</Button>
        </div>
      </div>
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <Skeleton height={48} />
          </div>
        ))
      ) : workflows.length === 0 ? (
        <SetupGuide content={SETUP['workflows']} />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Module</th>
                  <th>Active</th>
                  <th>Steps</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((wf: Workflow) => (
                  <tr key={wf.publicId}>
                    <td style={{ fontWeight: 500 }}>{wf.name}</td>
                    <td>
                      <Badge variant="info">{wf.module}</Badge>
                    </td>
                    <td>
                      <ToggleSwitch
                        checked={wf.isActive}
                        onChange={(val) =>
                          toggleActiveMutation.mutate({ publicId: wf.publicId, isActive: val })
                        }
                      />
                    </td>
                    <td>{wf.steps?.length ?? 0}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {new Date(wf.createdAt).toLocaleDateString()}
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
        <Modal open title="Create Workflow" onClose={() => setShowCreate(false)}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              className="input"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Leave Approval Workflow"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Module *</label>
            <select
              className="select"
              value={form.module}
              onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
            >
              <option value="">Select module</option>
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ToggleSwitch
              checked={form.isActive}
              onChange={(val) => setForm((f) => ({ ...f, isActive: val }))}
            />
            <label className="form-label" style={{ margin: 0 }}>Active</label>
          </div>
          {createMutation.isError && (
            <div className="alert alert-danger">{getErrorMessage(createMutation.error)}</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.name.trim() || !form.module || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
