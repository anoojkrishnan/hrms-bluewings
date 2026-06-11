import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '@/lib/api/payroll.api';
import { organizationApi } from '@/lib/api/organization.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface MappingRow { componentCode: string; glAccount: string; glDescription: string; costCentre: string }

export default function AccountingMappings() {
  const qc = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState('');
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => organizationApi.listCompanies({ limit: '100' }),
  });
  const companies = companiesData?.data ?? [];

  const { data: components } = useQuery({
    queryKey: ['payroll-components'],
    queryFn: () => payrollApi.listComponents(),
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ['accounting-mappings', selectedCompany],
    queryFn: () => payrollApi.getAccountingMappings(selectedCompany),
    enabled: !!selectedCompany,
  });

  useEffect(() => {
    if (components && selectedCompany) {
      const existingMap = new Map<string, MappingRow>(
        ((existing as { mappings?: MappingRow[] } | null)?.mappings ?? []).map(m => [m.componentCode, m]),
      );
      const built = (components as Array<{ code: string; name: string }>).map(c => existingMap.get(c.code) ?? {
        componentCode: c.code,
        glAccount: '',
        glDescription: c.name,
        costCentre: '',
      });
      setRows(built);
      setDirty(false);
    }
  }, [components, existing, selectedCompany]);

  const saveMutation = useMutation({
    mutationFn: () => payrollApi.saveAccountingMappings({ companyId: selectedCompany, mappings: rows.filter(r => r.glAccount) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounting-mappings', selectedCompany] }); setDirty(false); },
  });

  const setRow = (idx: number, field: keyof MappingRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    setDirty(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Accounting Mappings</h1>
          <p className="page-subtitle">Map salary components to GL accounts for Journal Voucher export</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!selectedCompany || !dirty}>
          Save Mappings
        </Button>
      </div>
      <SetupGuide content={SETUP['accounting-mappings']} />

      <div className="form-group" style={{ maxWidth: 280, marginBottom: 24 }}>
        <label className="form-label">Company</label>
        <select className="select" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
          <option value="">Select company…</option>
          {companies.map(c => <option key={c.publicId} value={c.publicId}>{c.name}</option>)}
        </select>
      </div>

      {!selectedCompany ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Select a company to configure GL account mappings.</p>
      ) : isLoading ? (
        <Skeleton height={240} />
      ) : (
        <>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            Map each salary component to a GL account. Leave blank to exclude from export. The debit column charges the expense account; credits go to payable/tax liability accounts automatically.
          </p>
          {saveMutation.isSuccess && !dirty && (
            <div className="alert alert-success" style={{ marginBottom: 12 }}>Mappings saved.</div>
          )}
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Component Code</th>
                  <th style={{ width: 140 }}>GL Account</th>
                  <th>GL Description</th>
                  <th style={{ width: 120 }}>Cost Centre</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.componentCode}>
                    <td><code style={{ fontSize: '0.875rem' }}>{row.componentCode}</code></td>
                    <td>
                      <input className="input" style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                        value={row.glAccount} onChange={e => setRow(idx, 'glAccount', e.target.value)}
                        placeholder="e.g. 5001" />
                    </td>
                    <td>
                      <input className="input" style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                        value={row.glDescription} onChange={e => setRow(idx, 'glDescription', e.target.value)}
                        placeholder="e.g. Salaries Expense" />
                    </td>
                    <td>
                      <input className="input" style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                        value={row.costCentre} onChange={e => setRow(idx, 'costCentre', e.target.value)}
                        placeholder="Optional" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
