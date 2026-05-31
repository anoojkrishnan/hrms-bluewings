import { useQuery } from '@tanstack/react-query';
import { leaveApi } from '@/lib/api/leave.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function LeaveBalance() {
  const { data: balances, isLoading, isError } = useQuery({
    queryKey: ['my-leave-balance'],
    queryFn: leaveApi.getMyBalance,
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Leave Balances</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginTop: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-container">
        <EmptyState title="Failed to load" description="Could not load leave balances." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">My Leave Balances</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        Financial year {new Date().getMonth() < 2 ? new Date().getFullYear() - 1 : new Date().getFullYear()}
        –{new Date().getMonth() < 2 ? new Date().getFullYear() : new Date().getFullYear() + 1}
      </p>

      {balances && balances.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {balances.map((b) => (
            <div key={`${b.leaveTypeId}-${b.leaveYear}`} className="card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                {b.leaveTypeId}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
                {b.closingBalance}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                days available
              </div>
              <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Opening</span>
                <span>{b.openingBalance}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Accrued</span>
                <span>{b.accrued}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Taken</span>
                <span style={{ color: b.taken > 0 ? 'var(--color-danger)' : undefined }}>{b.taken}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No leave balances" description="No leave balances found for this year." />
      )}
    </div>
  );
}
