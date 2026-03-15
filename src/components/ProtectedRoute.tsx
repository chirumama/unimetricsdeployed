import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/types';
import { getDefaultRouteForRole, getStoredUser } from '@/lib/auth';

type ProtectedRouteProps = {
  allowedRoles: Role[];
};

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return <Outlet />;
}
