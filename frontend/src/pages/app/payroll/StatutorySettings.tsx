import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, type StatutorySettings, type PTSlab } from '@/lib/api/payroll.api';
import { organizationApi } from '@/lib/api/organization.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{sub}</div>}
      </div>
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
        <span style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.15s', left: checked ? 19 : 3, display: 'block' }} />
      </button>
    </div>
  );
}

export default function StatutorySettingsPage() {
  const qc = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [settings, setSettings] = useState<Partial<StatutorySettings>>({
    pfEnabled: true, pfEmployeeRate: 12, pfEmployerRate: 12, pfWageCeiling: 15000,
    esiEnabled: true, esiEmployeeRate: 0.75, esiEmployerRate: 3.25, esiWageCeiling: 21000,
    ptEnabled: false, ptState: '', ptSlabs: [],
    tdsEnabled: false, tdsDefaultRate: 0,
  });
  const [saveMsg, setSaveMsg] = useState('');

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['statutory-settings', selectedCompanyId],
    queryFn: () => payrollApi.getStatutorySettings(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    if (existing) setSettings(existing);
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: () => payrollApi.upsertStatutorySettings(selectedCompanyId, settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statutory-settings', selectedCompanyId] });
      setSaveMsg('Settings saved successfully.');
      setTimeout(() => setSaveMsg(''), 3000);
    },
  });

  const companies = companiesData?.data ?? [];

  function addSlab() {
    setSettings(p => ({ ...p, ptSlabs: [...(p.ptSlabs ?? []), { upTo: 0, amount: 0 }] }));
  }

  function removeSlab(i: number) {
    setSettings(p => ({ ...p, ptSlabs: (p.ptSlabs ?? []).filter((_, idx) => idx !== i) }));
  }

  function updateSlab(i: number, field: keyof PTSlab, value: number) {
    setSettings(p => ({
      ...p,
      ptSlabs: (p.ptSlabs ?? []).map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }));
  }

  const n = (v: string) => Number(v);
  const s = (k: keyof StatutorySettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings(p => ({ ...p, [k]: n(e.target.value) }));

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Statutory Settings</h1>
          <p className="page-subtitle">Configure PF, ESI, PT, and TDS per company</p>
        </div>
      </div>
      <SetupGuide content={SETUP['statutory-settings']} />

      <div className="form-group" style={{ maxWidth: 280, marginBottom: 24 }}>
        <label className="form-label">Select Company</label>
        <select className="select" value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)}>
          <option value="">Select a company…</option>
          {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
        </select>
      </div>

      {!selectedCompanyId ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Select a company to configure statutory settings.</div>
      ) : isLoading ? (
        <Skeleton height={300} />
      ) : (
        <div>
          {saveMsg && <div className="alert alert-success">{saveMsg}</div>}

          {/* PF */}
          <div className="section-card">
            <h3 style={{ marginBottom: 8 }}>Provident Fund (PF)</h3>
            <Toggle label="PF Enabled" sub="Applies PF deductions during payroll calculation" checked={!!settings.pfEnabled} onChange={v => setSettings(p => ({ ...p, pfEnabled: v }))} />
            {settings.pfEnabled && (
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Employee Rate (%)</label>
                  <input className="input" type="number" step={0.01} value={settings.pfEmployeeRate ?? 12} onChange={s('pfEmployeeRate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Employer Rate (%)</label>
                  <input className="input" type="number" step={0.01} value={settings.pfEmployerRate ?? 12} onChange={s('pfEmployerRate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Wage Ceiling (₹)</label>
                  <input className="input" type="number" value={settings.pfWageCeiling ?? 15000} onChange={s('pfWageCeiling')} />
                  <span className="form-hint">PF calculated on min(basic, ceiling)</span>
                </div>
              </div>
            )}
          </div>

          {/* ESI */}
          <div className="section-card">
            <h3 style={{ marginBottom: 8 }}>ESI (Employee State Insurance)</h3>
            <Toggle label="ESI Enabled" sub="Applies ESI when gross ≤ wage ceiling" checked={!!settings.esiEnabled} onChange={v => setSettings(p => ({ ...p, esiEnabled: v }))} />
            {settings.esiEnabled && (
              <div className="form-grid" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Employee Rate (%)</label>
                  <input className="input" type="number" step={0.01} value={settings.esiEmployeeRate ?? 0.75} onChange={s('esiEmployeeRate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Employer Rate (%)</label>
                  <input className="input" type="number" step={0.01} value={settings.esiEmployerRate ?? 3.25} onChange={s('esiEmployerRate')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gross Wage Ceiling (₹)</label>
                  <input className="input" type="number" value={settings.esiWageCeiling ?? 21000} onChange={s('esiWageCeiling')} />
                </div>
              </div>
            )}
          </div>

          {/* PT */}
          <div className="section-card">
            <h3 style={{ marginBottom: 8 }}>Professional Tax (PT)</h3>
            <Toggle label="PT Enabled" sub="Slab-based deduction based on gross pay" checked={!!settings.ptEnabled} onChange={v => setSettings(p => ({ ...p, ptEnabled: v }))} />
            {settings.ptEnabled && (
              <div style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">State Code</label>
                  <input className="input" style={{ maxWidth: 120 }} value={settings.ptState ?? ''} onChange={e => setSettings(p => ({ ...p, ptState: e.target.value.toUpperCase() }))} placeholder="KA" maxLength={3} />
                </div>
                <label className="form-label">PT Slabs</label>
                <div style={{ marginTop: 8 }}>
                  {(settings.ptSlabs ?? []).map((slab, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Up To (₹) — 0 = unlimited</label>
                        <input className="input" type="number" value={slab.upTo} onChange={e => updateSlab(i, 'upTo', Number(e.target.value))} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PT Amount (₹/month)</label>
                        <input className="input" type="number" value={slab.amount} onChange={e => updateSlab(i, 'amount', Number(e.target.value))} />
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-red)', marginTop: 16 }} onClick={() => removeSlab(i)}>✕</button>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={addSlab} style={{ marginTop: 4 }}>+ Add Slab</button>
                </div>
              </div>
            )}
          </div>

          {/* TDS */}
          <div className="section-card">
            <h3 style={{ marginBottom: 8 }}>TDS (Tax Deducted at Source)</h3>
            <Toggle label="TDS Enabled" sub="Phase 4: flat annual rate applied monthly" checked={!!settings.tdsEnabled} onChange={v => setSettings(p => ({ ...p, tdsEnabled: v }))} />
            {settings.tdsEnabled && (
              <div className="form-group" style={{ marginTop: 12, maxWidth: 200 }}>
                <label className="form-label">Annual Rate (%)</label>
                <input className="input" type="number" step={0.01} value={settings.tdsDefaultRate ?? 0} onChange={s('tdsDefaultRate')} />
                <span className="form-hint">Monthly TDS = gross × 12 × rate / 12</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>Save Settings</Button>
          </div>
        </div>
      )}
    </div>
  );
}
