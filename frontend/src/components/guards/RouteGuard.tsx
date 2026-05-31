import { usePermission, useAnyPermission } from '@/lib/hooks/usePermission';

interface RouteGuardProps {
  /** Single permission required */
  permission?: string;
  /** Any one of these permissions is sufficient */
  anyOf?: string[];
  children: React.ReactNode;
}

export function RouteGuard({ permission, anyOf, children }: RouteGuardProps) {
  const single = usePermission(permission ?? '');
  const any    = useAnyPermission(...(anyOf ?? []));

  const allowed = (permission ? single : true) && (anyOf ? any : true);

  if (!allowed) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 12,
        textAlign: 'center',
        padding: 32,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'var(--color-red-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', marginBottom: 4,
        }}>
          🔒
        </div>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Access Restricted
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', maxWidth: 340, lineHeight: 1.6, margin: 0 }}>
          You don&apos;t have permission to view this page. Contact your administrator if you need access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
