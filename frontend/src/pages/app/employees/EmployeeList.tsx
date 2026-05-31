import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { employeeApi } from '@/lib/api/employee.api';
import { PermissionGuard } from '@/components/guards/PermissionGuard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ROUTES } from '@/router/routes';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  probation: 'warning',
  notice_period: 'warning',
  suspended: 'danger',
  separated: 'danger',
  onboarding: 'info',
  pre_onboarding: 'info',
};

export default function EmployeeList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', page, status],
    queryFn: () => employeeApi.list({ page: String(page), ...(status && { status }) }),
  });

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Employees</h1>
        </div>
        <div className="table-skeleton">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 8 }}><Skeleton height={48} /></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="page-container">
        <EmptyState
          title="Failed to load employees"
          description="Something went wrong. Please try again."
        />
      </div>
    );
  }

  const employees = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Employees</h1>
        <div className="page-actions">
          <PermissionGuard permission="employee.profile.create">
            <Button onClick={() => navigate(ROUTES.EMPLOYEE_CREATE)}>
              + Add Employee
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <select
          className="select"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
          <option value="notice_period">Notice Period</option>
          <option value="onboarding">Onboarding</option>
          <option value="separated">Separated</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Add your first employee to get started."
          cta={
            <PermissionGuard permission="employee.profile.create">
              <Button onClick={() => navigate(ROUTES.EMPLOYEE_CREATE)}>
                Add Employee
              </Button>
            </PermissionGuard>
          }
        />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee Code</th>
                  <th>Status</th>
                  <th>Employment Type</th>
                  <th>Joining Date</th>
                  <th>ESS</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.publicId}>
                    <td>
                      <Link
                        to={ROUTES.EMPLOYEE_DETAIL.replace(':employeeCode', emp.employeeCode)}
                        className="link"
                      >
                        {emp.employeeCode}
                      </Link>
                    </td>
                    <td>
                      <Badge variant={STATUS_COLORS[emp.status] ?? 'default'}>
                        {emp.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td>{emp.employmentType.replace(/_/g, ' ')}</td>
                    <td>{new Date(emp.joiningDate).toLocaleDateString()}</td>
                    <td>
                      <Badge variant={emp.essEnabled ? 'success' : 'default'}>
                        {emp.essEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                disabled={!meta.hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                className="btn btn-ghost"
                disabled={!meta.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
