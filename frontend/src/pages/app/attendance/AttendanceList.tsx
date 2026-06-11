import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance.api';
import { employeeApi } from '@/lib/api/employee.api';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { Skeleton } from '@/components/ui/Skeleton';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  present: 'success',
  absent: 'danger',
  half_day: 'warning',
  on_leave: 'info',
  holiday: 'info',
  weekend: 'default',
  work_from_home: 'success',
};

const STATUSES = ['present', 'absent', 'half_day', 'on_leave', 'holiday', 'weekend', 'work_from_home'];

interface OverrideForm {
  employeeCode: string;
  date: string;
  firstInTime: string;
  lastOutTime: string;
  status: string;
  remarks: string;
}

const EMPTY_OVERRIDE: OverrideForm = {
  employeeCode: '',
  date: '',
  firstInTime: '',
  lastOutTime: '',
  status: 'present',
  remarks: '',
};

export default function AttendanceList() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today.toISOString().split('T')[0]);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState<OverrideForm>(EMPTY_OVERRIDE);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-list', page, from, to],
    queryFn: () => attendanceApi.list({ page: String(page), from, to }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeApi.list({ limit: '200', status: 'active' }),
  });
  const employees = employeesData?.data ?? [];

  const overrideMutation = useMutation({
    mutationFn: () => attendanceApi.override({
      employeeCode: overrideForm.employeeCode,
      date: overrideForm.date,
      inTime: overrideForm.firstInTime ? new Date(`${overrideForm.date}T${overrideForm.firstInTime}`).toISOString() : undefined,
      outTime: overrideForm.lastOutTime ? new Date(`${overrideForm.date}T${overrideForm.lastOutTime}`).toISOString() : undefined,
      status: overrideForm.status,
      reason: overrideForm.remarks || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-list'] });
      setOverrideOpen(false);
      setOverrideForm(EMPTY_OVERRIDE);
    },
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;
  const set = (k: keyof OverrideForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setOverrideForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Attendance Logs</h1>
        <PermissionGuard permission="attendance.log.override">
          <Button variant="secondary" onClick={() => { setOverrideForm(EMPTY_OVERRIDE); setOverrideOpen(true); }}>
            Manual Override
          </Button>
        </PermissionGuard>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>From</label>
          <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="form-label" style={{ fontSize: 12 }}>To</label>
          <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
      </div>
      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ marginBottom: 8 }}><Skeleton height={48} /></div>)
      ) : logs.length === 0 ? (
        <SetupGuide content={SETUP['attendance-logs']} />
) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.publicId}>
                    <td>{employees.find(e => e.publicId === log.employeeId)?.employeeCode ?? log.employeeId}</td>
                    <td>{new Date(log.date).toLocaleDateString()}</td>
                    <td>{formatTime(log.firstInTime)}</td>
                    <td>{formatTime(log.lastOutTime)}</td>
                    <td>{log.totalHours != null ? `${log.totalHours.toFixed(1)}h` : '—'}</td>
                    <td>
                      <Badge variant={STATUS_VARIANTS[log.status] ?? 'default'}>
                        {log.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td>
                      {log.isLate ? (
                        <Badge variant="warning">{log.lateByMinutes}m</Badge>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="pagination-info">Page {meta.page} of {meta.totalPages}</span>
              <button className="btn btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      <Modal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title="Manual Attendance Override"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button
              loading={overrideMutation.isPending}
              disabled={!overrideForm.employeeCode || !overrideForm.date}
              onClick={() => overrideMutation.mutate()}
            >
              Save Override
            </Button>
          </div>
        }
      >
        {overrideMutation.isError && (
          <div className="alert alert-danger">
            {(overrideMutation.error as { message?: string }).message ?? 'Failed to save override'}
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Employee *</label>
          <select className="select" value={overrideForm.employeeCode} onChange={set('employeeCode')}>
            <option value="">Select employee…</option>
            {employees.map(e => (
              <option key={e.publicId} value={e.employeeCode}>{e.employeeCode}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date *</label>
          <input type="date" className="input" value={overrideForm.date} onChange={set('date')} />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Check In Time</label>
            <input type="time" className="input" value={overrideForm.firstInTime} onChange={set('firstInTime')} />
          </div>
          <div className="form-group">
            <label className="form-label">Check Out Time</label>
            <input type="time" className="input" value={overrideForm.lastOutTime} onChange={set('lastOutTime')} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="select" value={overrideForm.status} onChange={set('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Remarks</label>
          <textarea className="input" rows={2} value={overrideForm.remarks} onChange={set('remarks')} placeholder="Reason for override…" />
        </div>
      </Modal>
    </div>
  );
}
