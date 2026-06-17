import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi, WEBHOOK_EVENTS, type WebhookSubscription, type WebhookEvent } from '@/lib/api/integrations.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { getErrorMessage } from '@/lib/utils/errors';

export default function WebhookList() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deliveriesId, setDeliveriesId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] as WebhookEvent[] });

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: integrationsApi.listWebhooks,
  });

  const { data: deliveries } = useQuery({
    queryKey: ['webhook-deliveries', deliveriesId],
    queryFn: () => integrationsApi.listDeliveries(deliveriesId!),
    enabled: !!deliveriesId,
  });

  const createMutation = useMutation({
    mutationFn: () => integrationsApi.createWebhook({ name: form.name, url: form.url, secret: form.secret, events: form.events }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); setCreateOpen(false); setForm({ name: '', url: '', secret: '', events: [] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => integrationsApi.deleteWebhook(publicId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const testMutation = useMutation({
    mutationFn: (publicId: string) => integrationsApi.testWebhook(publicId),
  });

  const toggleEvent = (e: WebhookEvent) =>
    setForm(p => ({ ...p, events: p.events.includes(e) ? p.events.filter(x => x !== e) : [...p.events, e] }));

  const hookList = webhooks ?? [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Webhooks</h1>
          <p className="page-subtitle">Receive real-time event notifications at your endpoints</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Add Webhook</Button>
      </div>

      {isLoading ? <Skeleton height={200} /> : !hookList.length ? (
        <SetupGuide content={SETUP['webhooks']} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>URL</th><th>Events</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {hookList.map((wh: WebhookSubscription) => (
                <tr key={wh.publicId}>
                  <td style={{ fontWeight: 600 }}>{wh.name}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.url}</td>
                  <td style={{ fontSize: '0.75rem' }}>{wh.events.slice(0, 2).join(', ')}{wh.events.length > 2 ? ` +${wh.events.length - 2}` : ''}</td>
                  <td><Badge variant={wh.isActive ? 'success' : 'default'}>{wh.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeliveriesId(wh.publicId)}>Logs</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => testMutation.mutate(wh.publicId)} disabled={testMutation.isPending}>
                        {testMutation.isPending ? '…' : 'Test'}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)' }}
                        onClick={() => { if (confirm(`Delete "${wh.name}"?`)) deleteMutation.mutate(wh.publicId); }}>
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

      {testMutation.isSuccess && (
        <div className={`alert ${testMutation.data.success ? 'alert-success' : 'alert-danger'}`} style={{ marginTop: 12 }}>
          Test delivery: {testMutation.data.success ? `✅ HTTP ${testMutation.data.status}` : `❌ ${testMutation.data.error}`}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Webhook"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} disabled={!form.name || !form.url || !form.secret || !form.events.length} onClick={() => createMutation.mutate()}>
              Create
            </Button>
          </div>
        }
      >
        {createMutation.isError && <div className="alert alert-danger">{getErrorMessage(createMutation.error)}</div>}
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Slack Notifier" />
        </div>
        <div className="form-group">
          <label className="form-label">Endpoint URL *</label>
          <input className="input" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://your-service.com/webhook" />
        </div>
        <div className="form-group">
          <label className="form-label">Secret *</label>
          <input className="input" type="password" value={form.secret} onChange={e => setForm(p => ({ ...p, secret: e.target.value }))} placeholder="Min 8 chars — used to verify HMAC signature" />
        </div>
        <div className="form-group">
          <label className="form-label">Events * ({form.events.length} selected)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {WEBHOOK_EVENTS.map(evt => (
              <label key={evt} style={{
                display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.8125rem',
                padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border)',
                background: form.events.includes(evt) ? 'var(--color-primary)' : 'var(--color-surface)',
                color: form.events.includes(evt) ? '#fff' : 'var(--color-text-primary)',
              }}>
                <input type="checkbox" style={{ display: 'none' }} checked={form.events.includes(evt)} onChange={() => toggleEvent(evt)} />
                {evt}
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Deliveries Modal */}
      <Modal open={!!deliveriesId} onClose={() => setDeliveriesId(null)} title="Delivery Logs"
        footer={<Button onClick={() => setDeliveriesId(null)}>Close</Button>}
      >
        {deliveries && deliveries.length > 0 ? (
          <div className="table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>Event</th><th>Status</th><th>HTTP</th><th>Time</th></tr>
              </thead>
              <tbody>
                {deliveries.map((d: { publicId: string; event: string; success: boolean; responseStatus?: number; error?: string; deliveredAt: string }) => (
                  <tr key={d.publicId}>
                    <td style={{ fontSize: '0.8125rem' }}>{d.event}</td>
                    <td>{d.success ? <Badge variant="success">Success</Badge> : <Badge variant="danger">Failed</Badge>}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{d.responseStatus ?? d.error ?? '—'}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{new Date(d.deliveredAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 24 }}>No deliveries yet.</p>
        )}
      </Modal>
    </div>
  );
}
