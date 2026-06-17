import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi, type ApiClient } from '@/lib/api/integrations.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

export default function ApiClientList() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyInfo, setNewKeyInfo] = useState<{ name: string; rawKey: string } | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data: clients, isLoading } = useQuery({
    queryKey: ['api-clients'],
    queryFn: integrationsApi.listApiClients,
  });

  const createMutation = useMutation({
    mutationFn: () => integrationsApi.createApiClient({ name: form.name, description: form.description || undefined }),
    onSuccess: (client: ApiClient) => {
      qc.invalidateQueries({ queryKey: ['api-clients'] });
      setCreateOpen(false);
      if (client.rawKey) setNewKeyInfo({ name: client.name, rawKey: client.rawKey });
      setForm({ name: '', description: '' });
    },
  });

  const rotateMutation = useMutation({
    mutationFn: (publicId: string) => integrationsApi.rotateKey(publicId),
    onSuccess: (client: ApiClient) => {
      qc.invalidateQueries({ queryKey: ['api-clients'] });
      if (client.rawKey) setNewKeyInfo({ name: client.name, rawKey: client.rawKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => integrationsApi.deleteApiClient(publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-clients'] }),
  });

  const clientList = clients ?? [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">API Clients</h1>
          <p className="page-subtitle">Manage API keys for external integrations</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ New API Client</Button>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24, fontSize: '0.875rem' }}>
        API keys are shown only once when created or rotated. Store them securely — they cannot be retrieved after.
      </div>

      {isLoading ? <Skeleton height={200} /> : !clientList.length ? (
        <SetupGuide content={SETUP['api-clients']} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Key Prefix</th><th>Status</th><th>Last Used</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {clientList.map((client: ApiClient) => (
                <tr key={client.publicId}>
                  <td style={{ fontWeight: 600 }}>{client.name}</td>
                  <td><code style={{ fontSize: '0.8125rem' }}>{client.keyPrefix}••••••••</code></td>
                  <td><Badge variant={client.isActive ? 'success' : 'default'}>{client.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    {client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    {new Date(client.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => rotateMutation.mutate(client.publicId)}>Rotate Key</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)' }}
                        onClick={() => { if (confirm(`Delete "${client.name}"?`)) deleteMutation.mutate(client.publicId); }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create API Client" size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} disabled={!form.name} onClick={() => createMutation.mutate()}>Create</Button>
          </div>
        }
      >
        {createMutation.isError && <div className="alert alert-danger">{getErrorMessage(createMutation.error)}</div>}
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Payroll Export Bot" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What will this key be used for?" />
        </div>
      </Modal>

      {/* New Key Display Modal */}
      <Modal open={!!newKeyInfo} onClose={() => setNewKeyInfo(null)} title="API Key Created" size="sm"
        footer={<Button onClick={() => setNewKeyInfo(null)}>I've saved the key</Button>}
      >
        <div className="alert alert-warning" style={{ marginBottom: 16 }}>
          This is the only time this key will be shown. Copy it now.
        </div>
        <p style={{ marginBottom: 8, fontWeight: 600 }}>{newKeyInfo?.name}</p>
        <div style={{
          fontFamily: 'monospace', fontSize: '0.875rem', background: 'var(--color-background)',
          border: '1px solid var(--color-border)', borderRadius: 8, padding: 12,
          wordBreak: 'break-all', userSelect: 'all',
        }}>
          {newKeyInfo?.rawKey}
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => newKeyInfo && navigator.clipboard.writeText(newKeyInfo.rawKey).catch(() => {})}>
          📋 Copy to clipboard
        </button>
      </Modal>
    </div>
  );
}
