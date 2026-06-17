import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import styles from './Auth.module.css';
import { getErrorMessage } from '@/lib/utils/errors';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { loginAsync, isLoggingIn, loginError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('from') ?? '/dashboard';
  const justSignedUp = searchParams.get('verified') === 'email';
  const justVerified = searchParams.get('activated') === 'true';

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await loginAsync(data);
      navigate(redirectTo, { replace: true });
    } catch {
      // error displayed from loginError
    }
  };

  const errorMessage = (() => {
    const msg = getErrorMessage(loginError, '');
    if (!msg) return '';
    if (msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('not verified')) {
      return 'Your email is not yet verified. Check your inbox and click the verification link.';
    }
    return msg;
  })();

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.heading}>Sign in to HRMS</h1>
        {justSignedUp && !loginError && (
          <div className={styles.infoBanner} role="status">
            Account created! Check your inbox and click the verification link to activate your account.
          </div>
        )}
        {justVerified && !loginError && (
          <div className={styles.infoBanner} role="status">
            Email verified! You can now sign in.
          </div>
        )}
        {loginError && (
          <div className={styles.errorBanner} role="alert">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <Input
            label="Work email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <div className={styles.forgotRow}>
            <Link to="/forgot-password" className={styles.link}>Forgot password?</Link>
          </div>
          <Button type="submit" loading={isLoggingIn} style={{ width: '100%' }}>
            Sign in
          </Button>
        </form>
        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className={styles.link}>Sign up free</Link>
        </p>
      </Card>
    </div>
  );
}
