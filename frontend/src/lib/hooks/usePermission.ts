import { useAuthStore } from '../store/auth.store';

export function usePermission(permission: string): boolean {
  const { user } = useAuthStore();
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function useAnyPermission(...permissions: string[]): boolean {
  const { user } = useAuthStore();
  if (!user) return false;
  if (permissions.includes('*')) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

export function useAllPermissions(...permissions: string[]): boolean {
  const { user } = useAuthStore();
  if (!user) return false;
  return permissions.every((p) => user.permissions.includes(p));
}
