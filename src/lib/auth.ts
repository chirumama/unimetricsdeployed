import type { Role } from '@/types';
import type { AuthUser } from '@/lib/api';

const AUTH_STORAGE_KEY = 'unimetric.auth.user';

export function getStoredUser(): AuthUser | null {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredUser(user: AuthUser) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getDefaultRouteForRole(role: Role) {
  if (role === 'admin') return '/admin';
  if (role === 'faculty') return '/faculty';
  return '/student';
}
