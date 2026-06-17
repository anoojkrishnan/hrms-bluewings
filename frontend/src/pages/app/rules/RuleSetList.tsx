import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ruleEngineApi } from '@/lib/api/rule-engine.api';
import type { RuleSet } from '@/lib/api/rule-engine.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { SetupGuide } from '@/components/ui/SetupGuide';
import { SETUP } from '@/lib/help/helpContent';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { getErrorMessage } from '@/lib/utils/errors';

const RULE_TYPE_OPTIONS = [
  'leave_accrual',
  'leave_eligibility',
  'attendance_late',
  'attendance_overtime',
  'payroll_earnings',
  'payroll_deductions',
];

const MODULE_OPTIONS = [
  'leave', 'attendance', 'payroll', 'employee', 'statutory',
];

interface CreateForm {
  name: string;
  module: string;
  ruleType: string;
  effectiveFrom: string;
}

export default function RuleSetList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>({ name: '', module: '', ruleType: '', effectiveFrom: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['rule-sets', page],
    queryFn: () => ruleEngineApi.listRuleSets({ page, limit: 20 }),
  });

  const createMutation = useMutation({
    mutationFn: () => ruleEngineApi.createRuleSet({
      ...form,
      effectiveFrom: form.effectiveFrom ? new Date(form.effectiveFrom).toISOString() : form.effectiveFrom,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rule-sets'] });
      setShowCreate(false);
      setForm({ name: '', module: '', ruleType: '', effectiveFrom: '' });
    },
  });

  const ruleSets = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Rule Sets</h1>
        <div className="page-actions">
          <Button onClick={() => setShowCreate(true)}>Create Rule Set</Button>
        </div>
      </div>
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <Skeleton height={48} />
          </div>
        ))
      ) : ruleSets.length === 0 ? (
        <SetupGuide content={SETUP['rule-sets']} />
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Module</th>
                  <th>Rule Type</th>
                  <th>Active</th>
                  <th>Effective From</th>
                </tr>
              </thead>
              <tbody>
                {ruleSets.map((rs: RuleSet) => (
                  <tr
                    key={rs.publicId}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // Rule set detail page not built in this iteration
                    }}
                  >
                    <td style={{ fontWeight: 500 }}>{rs.name}</td>
                    <td>
                      <Badge variant="info">{rs.module}</Badge>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {rs.ruleType.replace(/_/g, ' ')}
                    </td>
                    <td>
                      <Badge variant={rs.isActive ? 'success' : 'default'}>
                        {rs.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      {new Date(rs.effectiveFrom).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={!meta.hasPrev} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="pagination-info">Page {meta.page} of {meta.totalPages}</span>
              <button className="btn btn-ghost" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <Modal open title="Create Rule Set" onClose={() => setShowCreate(false)}>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              className="input"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Leave Accrual Rules"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Module *</label>
            <select
              className="select"
              value={form.module}
              onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))}
            >
              <option value="">Select module</option>
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Rule Type *</label>
            <select
              className="select"
              value={form.ruleType}
              onChange={(e) => setForm((f) => ({ ...f, ruleType: e.target.value }))}
            >
              <option value="">Select rule type</option>
              {RULE_TYPE_OPTIONS.map((rt) => (
                <option key={rt} value={rt}>{rt.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Effective From *</label>
            <input
              className="input"
              type="date"
              value={form.effectiveFrom}
              onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
            />
          </div>
          {createMutation.isError && (
            <div className="alert alert-danger">{getErrorMessage(createMutation.error)}</div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !form.name.trim() || !form.module || !form.ruleType || !form.effectiveFrom || createMutation.isPending
              }
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
