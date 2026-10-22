import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router';

import {
  useAuth,
} from '../../auth/useAuth';

import type {
  UserRole,
} from '../../websocket/protocol';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const { user } = useAuth();

  const location =
    useLocation();

  if (user === null) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (
    !allowedRoles.includes(
      user.role,
    )
  ) {
    const safeDestination =
      user.role === 'TEACHER'
        ? '/teacher'
        : '/student/exams';

    return (
      <Navigate
        to={safeDestination}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;