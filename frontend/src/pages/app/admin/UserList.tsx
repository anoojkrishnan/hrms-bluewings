import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/lib/api/user.api';
import type { User } from '@/lib/api/user.api';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getErrorMessage } from '@/lib/utils/errors';

type StatusFilter = '' | 'active' | 'suspended' | 'pending_verification';

function statusBadge(status: User['status']) {
  switch (status) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'suspended':
      return <Badge variant="danger">Suspended</Badge>;
    case 'pending_verification':
      return <Badge variant="warning">Pending</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function UserList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', statusFilter],
    queryFn: () =>
      userApi.list(statusFilter ? { status: statusFilter, limit: '100' } : { limit: '100' }),
  });
  const users = data?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'suspended' }) =>
      userApi.updateStatus(userId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const toggleStatus = (user: User) => {
    const next = user.status === 'active' ? 'suspended' : 'active';
    statusMutation.mutate({ userId: user.publicId, status: next });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
      </div>

      <div className="filters">
        <select
          className="select"
          style={{ width: 200 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending_verification">Pending Verification</option>
        </select>
      </div>

      {isLoading && (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}><Skeleton height={56} /></div>
          ))}
        </div>
      )}

      {isError && (
        <div className="alert alert-danger">{getErrorMessage(error, 'Failed to load users.')}</div>
      )}

      {!isLoading && !isError && users.length === 0 && (
        <EmptyState
          title="No users found"
          description={statusFilter ? 'No users match the selected filter.' : 'No users have been added yet.'}
        />
      )}

      {!isLoading && !isError && users.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Email Verified</th>
                <th>Last Login</th>
                <th>MFA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.publicId}>
                  <td style={{ fontWeight: 500 }}>{u.email}</td>
                  <td>{u.name.first} {u.name.last}</td>
                  <td>{statusBadge(u.status)}</td>
                  <td>
                    {u.emailVerifiedAt ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Not verified</Badge>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleString()
                      : '—'}
                  </td>
                  <td>
                    <Badge variant={u.mfaEnabled ? 'success' : 'default'}>
                      {u.mfaEnabled ? 'On' : 'Off'}
                    </Badge>
                  </td>
                  <td>
                    {u.status !== 'pending_verification' && (
                      <button
                        className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => toggleStatus(u)}
                        disabled={statusMutation.isPending}
                        style={{ minWidth: 80 }}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
