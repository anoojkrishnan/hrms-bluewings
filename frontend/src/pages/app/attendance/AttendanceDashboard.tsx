import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '@/lib/api/attendance.api';
import { useAuthStore } from '@/lib/store/auth.store';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatHours(h?: number) {
  if (h === undefined || h === null) return '—';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

export default function AttendanceDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [punchError, setPunchError] = useState('');

  const employeeCode = user?.employeePublicId ?? '';

  const { data: todayLog, isLoading } = useQuery({
    queryKey: ['attendance-today', employeeCode, today],
    queryFn: () => attendanceApi.getLog(employeeCode, today),
    enabled: !!employeeCode,
    retry: false,
  });

  const punchMutation = useMutation({
    mutationFn: (swipeType: 'in' | 'out') => attendanceApi.punch({ swipeType }),
    onSuccess: () => {
      setPunchError('');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
    },
    onError: () => setPunchError('Could not record punch. Please try again.'),
  });

  const isCheckedIn = !!todayLog?.firstInTime;
  const isCheckedOut = !!todayLog?.lastOutTime;

  const canPunchIn = !isCheckedIn;
  const canPunchOut = isCheckedIn && !isCheckedOut;

  return (
    <div className="page-container">
      <h1 className="page-title">Attendance</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Skeleton height={160} />
          <Skeleton height={160} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {/* Today's status card */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Today</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Check In</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatTime(todayLog?.firstInTime)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Check Out</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatTime(todayLog?.lastOutTime)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Hours</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatHours(todayLog?.totalHours)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Status</div>
                <div>
                  {todayLog ? (
                    <Badge variant={todayLog.status === 'present' ? 'success' : 'default'}>
                      {todayLog.status.replace(/_/g, ' ')}
                    </Badge>
                  ) : (
                    <Badge variant="default">Not marked</Badge>
                  )}
                </div>
              </div>
            </div>
            {punchError && (
              <div className="alert alert-danger" style={{ marginBottom: 12, fontSize: 13 }}>
                {punchError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <Button
                style={{ flex: 1 }}
                disabled={!canPunchIn || punchMutation.isPending || !employeeCode}
                onClick={() => punchMutation.mutate('in')}
              >
                {punchMutation.isPending && punchMutation.variables === 'in' ? 'Punching...' : 'Punch In'}
              </Button>
              <Button
                style={{ flex: 1 }}
                variant="secondary"
                disabled={!canPunchOut || punchMutation.isPending || !employeeCode}
                onClick={() => punchMutation.mutate('out')}
              >
                {punchMutation.isPending && punchMutation.variables === 'out' ? 'Punching...' : 'Punch Out'}
              </Button>
            </div>

            {!employeeCode && (
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                ESS access required to punch attendance.
              </p>
            )}
            {todayLog?.isLate && (
              <div style={{ marginTop: 12, fontSize: 13, color: 'var(--color-warning)' }}>
                Late by {todayLog.lateByMinutes} min
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
