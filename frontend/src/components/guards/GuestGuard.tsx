import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store/auth.store';
import { FullPageSpinner } from '@/components/ui/Spinner';

interface GuestGuardProps {
  children: React.ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
