import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance.api';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

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

export default function AttendanceList() {
  const [page, setPage] = useState(1);
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today.toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-list', page, from, to],
    queryFn: () => attendanceApi.list({ page: String(page), from, to }),
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Attendance Logs</h1>
        <PermissionGuard permission="attendance.log.override">
          <button className="btn btn-secondary">Manual Override</button>
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
        <EmptyState title="No attendance records" description="No logs found for the selected date range." />
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
                    <td>{log.employeeId}</td>
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
    </div>
  );
}
