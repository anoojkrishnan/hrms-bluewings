import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { post } from '@/lib/api/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from './Auth.module.css';

const schema = z.object({
  tenantName: z.string().min(2, 'Company name required'),
  slug: z.string().min(2, 'Slug required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function Signup() {
  const navigate = useNavigate();

  const signupMutation = useMutation({
    mutationFn: (data: FormData) => post('/public/signup', data),
    onSuccess: () => navigate('/login?verified=email'),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Create your HRMS account</h1>
        {signupMutation.error && (
          <div className={styles.errorBanner} role="alert">
            {(signupMutation.error as Error).message ?? 'Signup failed. Please try again.'}
          </div>
        )}
        <form onSubmit={handleSubmit((d) => signupMutation.mutate(d))} className={styles.form} noValidate>
          <Input label="Company name" {...register('tenantName')} error={errors.tenantName?.message} />
          <Input label="Company slug" {...register('slug')} hint="e.g. acme-india" error={errors.slug?.message} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="First name" {...register('firstName')} error={errors.firstName?.message} />
            <Input label="Last name" {...register('lastName')} error={errors.lastName?.message} />
          </div>
          <Input label="Work email" type="email" autoComplete="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" autoComplete="new-password" {...register('password')} error={errors.password?.message} />
          <Button type="submit" loading={signupMutation.isPending} style={{ width: '100%' }}>
            Create account
          </Button>
        </form>
        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
