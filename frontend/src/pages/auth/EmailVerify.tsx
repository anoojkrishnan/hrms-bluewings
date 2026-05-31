import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth.api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import styles from './Auth.module.css';

export default function EmailVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const didRun = useRef(false);

  const mutation = useMutation({
    mutationFn: () => authApi.verifyEmail(token),
    onSuccess: () => {
      setTimeout(() => navigate('/login?activated=true', { replace: true }), 2000);
    },
  });

  useEffect(() => {
    if (token && !didRun.current) {
      didRun.current = true;
      mutation.mutate();
    }
  }, [token]); // eslint-disable-line

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Email Verification</h1>
        {mutation.isPending && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
            <Spinner />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Verifying your email…</p>
          </div>
        )}
        {mutation.isSuccess && (
          <div className={styles.infoBanner} role="status">
            Email verified! Redirecting you to sign in…
          </div>
        )}
        {mutation.isError && (
          <div className={styles.errorBanner} role="alert">
            {(mutation.error as Error)?.message || 'Verification failed. The link may have expired.'}{' '}
            <Link to="/login" className={styles.link}>Go to sign in</Link>
          </div>
        )}
        {!token && (
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            No verification token found.{' '}
            <Link to="/login" className={styles.link}>Go to sign in</Link>
          </p>
        )}
      </Card>
    </div>
  );
}
