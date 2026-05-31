import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth.api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from './Auth.module.css';

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.resetPassword(token, data.newPassword),
    onSuccess: () => navigate('/login'),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Set new password</h1>
        {mutation.error && (
          <div className={styles.errorBanner} role="alert">
            {(mutation.error as Error).message ?? 'Reset failed. The link may have expired.'}
          </div>
        )}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className={styles.form} noValidate>
          <Input label="New password" type="password" autoComplete="new-password" {...register('newPassword')} error={errors.newPassword?.message} />
          <Input label="Confirm password" type="password" autoComplete="new-password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
          <Button type="submit" loading={mutation.isPending} style={{ width: '100%' }}>
            Reset password
          </Button>
        </form>
        <p className={styles.footer}>
          <Link to="/login" className={styles.link}>Back to sign in</Link>
        </p>
      </Card>
    </div>
  );
}
