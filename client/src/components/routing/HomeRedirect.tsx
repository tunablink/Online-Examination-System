import {
  Navigate,
} from 'react-router';

import {
  useAuth,
} from '../../auth/useAuth';

function HomeRedirect() {
  const { user } = useAuth();

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