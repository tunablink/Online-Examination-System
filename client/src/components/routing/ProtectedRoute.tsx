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
  const { user, recovering } = useAuth();

  const location =
    useLocation();

  if (recovering && user === null) return <main className="grid min-h-screen place-items-center bg-[#f5f9fb] p-6" role="status"><p className="text-base text-[#607178]">Restoring your examination session…</p></main>;

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
