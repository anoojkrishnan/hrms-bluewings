import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '@/lib/api/leave.api';
import type { LeaveBalance, LeaveType } from '@/lib/api/leave.api';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePermission } from '@/lib/hooks/usePermission';

// ── Helpers ────────────────────────────────────────────────────────────────

function leaveYear() {
  const now = new Date();
  // India FY: Apr–Mar. If month < 3 (Jan/Feb/Mar) the year started last year.
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

function BalanceBar({ taken, total }: { taken: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (taken / total) * 100) : 0;
  return (
    <div style={{ height: 4, borderRadius: 9999, background: 'var(--color-border)', marginTop: 10, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 9999,
        width: `${pct}%`,
        background: pct > 80 ? 'var(--color-red)' : pct > 50 ? 'var(--color-amber)' : 'var(--color-green)',
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function BalanceCard({ balance, typeName }: { balance: LeaveBalance; typeName: string }) {
  const available = balance.closingBalance;
  const total = balance.openingBalance + balance.accrued + balance.granted;

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '20px 22px',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {typeName}
        </span>
        <Badge variant={available > 0 ? 'success' : 'default'}>
          {available} day{available !== 1 ? 's' : ''} left
        </Badge>
      </div>

      <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1, letterSpacing: '-0.05em' }}>
        {available}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>days available</div>

      <BalanceBar taken={balance.taken} total={total || available + balance.taken} />

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '6px 0', marginTop: 12,
        fontSize: '0.8125rem',
      }}>
        {balance.openingBalance > 0 && <>
          <span style={{ color: 'var(--color-text-muted)' }}>Opening</span>
          <span style={{ textAlign: 'right', fontWeight: 600 }}>{balance.openingBalance}</span>
        </>}
        {balance.accrued > 0 && <>
          <span style={{ color: 'var(--color-text-muted)' }}>Accrued</span>
          <span style={{ textAlign: 'right', fontWeight: 600 }}>{balance.accrued}</span>
        </>}
        {balance.granted > 0 && <>
          <span style={{ color: 'var(--color-text-muted)' }}>Granted</span>
          <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-green)' }}>{balance.granted}</span>
        </>}
        <span style={{ color: 'var(--color-text-muted)' }}>Taken</span>
        <span style={{ textAlign: 'right', fontWeight: 600, color: balance.taken > 0 ? 'var(--color-red)' : undefined }}>
          {balance.taken}
        </span>
        {balance.encashed > 0 && <>
          <span style={{ color: 'var(--color-text-muted)' }}>Encashed</span>
          <span style={{ textAlign: 'right', fontWeight: 600 }}>{balance.encashed}</span>
        </>}
        {balance.lapsed > 0 && <>
          <span style={{ color: 'var(--color-text-muted)' }}>Lapsed</span>
          <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-text-muted)' }}>{balance.lapsed}</span>
        </>}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function LeaveBalance() {
  const qc = useQueryClient();
  const isAdmin = usePermission('leave.balance.adjust');
  const [initMsg, setInitMsg] = useState('');

  const { data: balances, isLoading, isError } = useQuery({
    queryKey: ['my-leave-balance'],
    queryFn: leaveApi.getMyBalance,
  });

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: leaveApi.listTypes,
  });

  const initMutation = useMutation({
    mutationFn: leaveApi.initAllBalances,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['my-leave-balance'] });
      setInitMsg(`Done — initialised ${result.created} balance record${result.created !== 1 ? 's' : ''}.`);
      setTimeout(() => setInitMsg(''), 4000);
    },
  });

  // Build a lookup map: leaveTypeId → LeaveType
  const typeMap = new Map<string, LeaveType>(
    (leaveTypes ?? []).map((lt) => [lt.publicId, lt]),
  );

  const fy = leaveYear();

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page-header"><h1 className="page-title">Leave Balances</h1></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={180} />)}
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
      <div className="page-header">
        <div>
          <h1 className="page-title">My Leave Balances</h1>
          <p className="page-subtitle">
            Financial Year {fy}–{fy + 1}
            {' · '}
            {balances?.length ?? 0} leave type{(balances?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {initMsg && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-green)', fontWeight: 600 }}>
                ✓ {initMsg}
              </span>
            )}
            <Button
              variant="secondary"
              onClick={() => initMutation.mutate()}
              loading={initMutation.isPending}
            >
              Initialise Balances
            </Button>
          </div>
        )}
      </div>

      {/* How balances work — info banner */}
      <div style={{
        background: 'var(--color-blue-bg)',
        border: '1px solid rgba(26,86,219,0.15)',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 24,
        fontSize: '0.875rem',
        color: 'var(--color-blue-text)',
        lineHeight: 1.6,
      }}>
        <strong>How leave balances work:</strong> Opening balances are set by HR at the start of the year.
        Accruals are added periodically. When you apply for leave, the days are deducted from your closing balance.
        Approved leave reduces your balance; rejected or cancelled leave restores it.
        {isAdmin && ' HR can adjust balances using the employee\'s leave settings or by pressing "Initialise Balances" to create missing records.'}
      </div>

      {balances && balances.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {balances.map((b) => {
            const lt = typeMap.get(b.leaveTypeId);
            const typeName = lt?.name ?? b.leaveTypeId;
            return (
              <BalanceCard
                key={`${b.leaveTypeId}-${b.leaveYear}`}
                balance={b}
                typeName={typeName}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No leave balances"
          description={
            isAdmin
              ? 'No balances found. Click "Initialise Balances" to create records for all active employees and leave types.'
              : 'No leave balances have been set up yet. Contact your HR administrator.'
          }
          cta={
            isAdmin ? (
              <Button onClick={() => initMutation.mutate()} loading={initMutation.isPending}>
                Initialise Balances
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
