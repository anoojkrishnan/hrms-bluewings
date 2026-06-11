import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '@/lib/api/payroll.api';
import { employeeApi } from '@/lib/api/employee.api';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface InputRow {
  employeeCode: string;
  employeeName: string;
  lopDays: string;
  bonusAmount: string;
  notes: string;
}

export default function PayrollInputsPage() {
  const { publicId: runPublicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [rows, setRows] = useState<InputRow[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data: run, isLoading: runLoading } = useQuery({
    queryKey: ['payroll-run', runPublicId],
    queryFn: () => payrollApi.getRun(runPublicId!),
    enabled: !!runPublicId,
  });

  const { data: existingInputs, isLoading: inputsLoading } = useQuery({
    queryKey: ['payroll-inputs', runPublicId],
    queryFn: () => payrollApi.getInputs(runPublicId!),
    enabled: !!runPublicId,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list-active'],
    queryFn: () => employeeApi.list({ limit: '500', status: 'active' }),
  });

  // Build rows from employees + existing inputs
  useEffect(() => {
    const employees = employeesData?.data ?? [];
    if (!employees.length) return;
    const inputMap = new Map((existingInputs ?? []).map(i => [i.employeeId, i]));
    const built: InputRow[] = employees.map(emp => {
      const existing = inputMap.get(emp.publicId);
      return {
        employeeCode: emp.employeeCode,
        employeeName: '',
        lopDays: existing?.lopDays != null ? String(existing.lopDays) : '',
        bonusAmount: existing?.bonusAmount != null ? String(existing.bonusAmount) : '',
        notes: existing?.notes ?? '',
      };
    });
    setRows(built);
    setDirty(false);
  }, [employeesData, existingInputs]);

  const saveMutation = useMutation({
    mutationFn: () => payrollApi.upsertInputs(runPublicId!, {
      inputs: rows
        .filter(r => r.lopDays || r.bonusAmount || r.notes)
        .map(r => ({
          employeeCode: r.employeeCode,
          lopDays: r.lopDays ? Number(r.lopDays) : undefined,
          bonusAmount: r.bonusAmount ? Number(r.bonusAmount) : undefined,
          notes: r.notes || undefined,
        })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-inputs', runPublicId] });
      qc.invalidateQueries({ queryKey: ['payroll-run', runPublicId] });
      setDirty(false);
    },
  });

  const setRow = (idx: number, field: keyof InputRow, value: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    setDirty(true);
  };

  const isLoading = runLoading || inputsLoading;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
            ← Back to Run
          </button>
          <h1 className="page-title">Payroll Inputs</h1>
          {run && (
            <p className="page-subtitle">
              {new Date(0, run.month - 1).toLocaleString('default', { month: 'long' })} {run.year}
            </p>
          )}
        </div>
        <div className="page-actions">
          <Button
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!dirty}
          >
            Save All Inputs
          </Button>
        </div>
      </div>
      <SetupGuide content={SETUP['payroll-inputs']} />
      {isLoading ? (
        <Skeleton height={320} />
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th style={{ width: 120 }}>LOP Days</th>
                <th style={{ width: 160 }}>Bonus (₹)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.employeeCode}>
                  <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {row.employeeCode}
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                      value={row.lopDays}
                      onChange={e => setRow(idx, 'lopDays', e.target.value)}
                      min={0}
                      max={31}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input"
                      style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                      value={row.bonusAmount}
                      onChange={e => setRow(idx, 'bonusAmount', e.target.value)}
                      min={0}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input"
                      style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                      value={row.notes}
                      onChange={e => setRow(idx, 'notes', e.target.value)}
                      placeholder="Optional note"
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
                    No active employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
