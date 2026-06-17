import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsApi, type ReportTemplate, type ReportParamDef } from '@/lib/api/reports.api';
import { organizationApi } from '@/lib/api/organization.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getErrorMessage } from '@/lib/utils/errors';

const CATEGORY_LABELS: Record<string, string> = {
  hr: 'HR', leave: 'Leave', attendance: 'Attendance', payroll: 'Payroll', finance: 'Finance',
};
const CATEGORY_COLORS: Record<string, 'default' | 'info' | 'warning' | 'success' | 'teal'> = {
  hr: 'info', leave: 'warning', attendance: 'default', payroll: 'success', finance: 'teal',
};

function downloadCsv(filename: string, headers: string[], rows: Record<string, unknown>[]) {
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ParamInput({ param, value, onChange, companies }: {
  param: ReportParamDef;
  value: string;
  onChange: (v: string) => void;
  companies: Array<{ publicId: string; name: string }>;
}) {
  if (param.key === 'companyId') {
    return (
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select company…</option>
        {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
      </select>
    );
  }
  if (param.type === 'select' && param.options) {
    return (
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">All</option>
        {param.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (param.type === 'number') {
    return <input type="number" className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={param.label} />;
  }
  if (param.type === 'date') {
    return <input type="date" className="input" value={value} onChange={e => onChange(e.target.value)} />;
  }
  return <input type="text" className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={param.label} />;
}

function ReportCard({ template, companies }: { template: ReportTemplate; companies: Array<{ publicId: string; name: string }> }) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<{ headers: string[]; rows: Record<string, unknown>[]; rowCount: number } | null>(null);

  const genMutation = useMutation({
    mutationFn: () => reportsApi.generate({
      templateKey: template.key,
      params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '')),
    }),
    onSuccess: (data) => {
      setLastResult({ headers: data.headers, rows: data.rows, rowCount: data.rows.length });
    },
  });

  const setParam = (key: string, value: string) => setParams(p => ({ ...p, [key]: value }));

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{template.name}</h3>
        <Badge variant={CATEGORY_COLORS[template.category] ?? 'default'}>{CATEGORY_LABELS[template.category] ?? template.category}</Badge>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>{template.description}</p>

      {template.params.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 12 }}>
          {template.params.map(param => (
            <div key={param.key}>
              <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>
                {param.label}{param.required && ' *'}
              </label>
              <ParamInput param={param} value={params[param.key] ?? ''} onChange={v => setParam(param.key, v)} companies={companies} />
            </div>
          ))}
        </div>
      )}

      {genMutation.isError && (
        <div className="alert alert-danger" style={{ marginBottom: 8, fontSize: '0.8125rem' }}>
          {getErrorMessage(genMutation.error)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button onClick={() => genMutation.mutate()} loading={genMutation.isPending} variant="secondary">
          Generate
        </Button>
        {lastResult && (
          <>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>{lastResult.rowCount} rows</span>
            <Button onClick={() => downloadCsv(`${template.key}-${Date.now()}.csv`, lastResult.headers, lastResult.rows)}>
              ↓ CSV
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [category, setCategory] = useState('');

  const { data: templates, isLoading: tplLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: reportsApi.listTemplates,
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });
  const companies = companiesData?.data ?? [];

  const filtered = (templates ?? []).filter(t => !category || t.category === category);
  const categories = [...new Set((templates ?? []).map(t => t.category))];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and export HR reports as CSV</p>
        </div>
      </div>
      <SetupGuide content={SETUP['reports']} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${category === '' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setCategory('')}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            className={`btn btn-sm ${category === cat ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCategory(cat)}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {tplLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={160} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(tpl => <ReportCard key={tpl.key} template={tpl} companies={companies} />)}
        </div>
      )}
    </div>
  );
}
