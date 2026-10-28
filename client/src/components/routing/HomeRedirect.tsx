import {
  Navigate,
} from 'react-router';

import {
  useAuth,
} from '../../auth/useAuth';

function HomeRedirect() {
  const { user, recovering } = useAuth();

  if (recovering) return <p className="p-8 text-center" role="status">Restoring your session…</p>;

  if (user === null) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <Navigate
      to={
        user.role === 'TEACHER'
          ? '/teacher'
          : '/student/exams'
      }
      replace
    />
  );
}

export default HomeRedirect;
