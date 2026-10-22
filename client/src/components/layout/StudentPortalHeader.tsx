import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../auth/useAuth';

interface StudentPortalHeaderProps {
  currentSection?: string;
}

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((namePart) => namePart.charAt(0))
    .join('')
    .toUpperCase();
}

function StudentPortalHeader({
  currentSection = 'Examinations',
}: StudentPortalHeaderProps) {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const displayName = user?.fullName ?? 'Student';

  const accountLabel = user?.username ?? 'Unknown account';

  const handleSignOut = () => {
    /*
     * Hiện tại frontend mới chỉ điều hướng về trang login.
     *
     * Sau này method này sẽ gửi message LOGOUT cho server,
     * xóa authenticated session và xóa user state ở client.
     */

    logout();

    navigate('/login', {
      replace: true,
    });
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div
        className="
          mx-auto flex min-h-16 w-full max-w-[1240px]
          items-center justify-between gap-6 px-6
          max-sm:px-4
        "
      >
        <Link
          className="flex items-center gap-3"
          to="/student/exams"
        >
          <span
            className="
              grid h-8 w-8 place-items-center
              rounded-md bg-blue-700
              text-[11px] font-extrabold
              tracking-wide text-white
            "
            aria-hidden="true"
          >
            OE
          </span>

          <div>
            <p
              className="
                text-[10px] font-bold
                tracking-[0.14em] text-slate-400
              "
            >
              STUDENT PORTAL
            </p>

            <p className="text-sm font-semibold text-slate-900">
              {currentSection}
            </p>
          </div>
        </Link>

        <nav
  className="
    flex items-center gap-1
    rounded-lg border border-slate-200
    bg-slate-50 p-1
    max-md:hidden
  "
  aria-label="Student portal navigation"
>
  <NavLink
    className={({ isActive }) => `
      rounded-md px-3 py-2
      text-xs font-semibold
      transition-colors
      ${
        isActive
          ? `
            bg-white text-blue-700
            shadow-sm
          `
          : `
            text-slate-600
            hover:text-slate-950
          `
      }
    `}
    to="/student/exams"
  >
    Examinations
  </NavLink>

  <NavLink
        className={({ isActive }) => `
          rounded-md px-3 py-2
          text-xs font-semibold
          transition-colors
          ${
            isActive
              ? `
                bg-white text-blue-700
                shadow-sm
              `
              : `
                text-slate-600
                hover:text-slate-950
              `
          }
        `}
        to="/student/history"
      >
        History
      </NavLink>
    </nav>

        <div className="flex items-center gap-4">
          <div className="text-right max-sm:hidden">
            <p className="text-xs font-semibold text-slate-900">
              {displayName}
            </p>

            <p className="mt-0.5 text-[11px] text-slate-500">
              {accountLabel}
            </p>
          </div>

          <div
            className="
              grid h-9 w-9 place-items-center
              rounded-full bg-slate-100
              text-xs font-bold text-slate-700
            "
            title={displayName}
            aria-hidden="true"
          >
            {getInitials(displayName)}
          </div>

          <button
            className="
              rounded-md border border-slate-300
              bg-white px-3 py-2
              text-xs font-semibold text-slate-700
              transition-colors
              hover:border-red-300 hover:text-red-700
            "
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default StudentPortalHeader;