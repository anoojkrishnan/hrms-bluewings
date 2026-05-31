import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from './Auth.module.css';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.forgotPassword(data.email),
    onSuccess: () => setSent(true),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Reset your password</h1>
        {sent ? (
          <div>
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              If that email exists, a reset link has been sent. Check your inbox.
            </p>
            <p className={styles.footer}>
              <Link to="/login" className={styles.link}>Back to sign in</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className={styles.form} noValidate>
            <Input label="Work email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
            <Button type="submit" loading={mutation.isPending} style={{ width: '100%' }}>
              Send reset link
            </Button>
            <p className={styles.footer}>
              <Link to="/login" className={styles.link}>Back to sign in</Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
