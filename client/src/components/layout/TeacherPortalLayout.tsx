import { NavLink, Outlet, useNavigate } from "react-router";

import ConnectionBadge from "../common/ConnectionBadge";
import { useAuth } from "../../auth/useAuth";
import { useWebSocket } from "../../websocket/useWebSocket";

interface NavigationItem {
  label: string;
  description: string;
  to: string;
  end?: boolean;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    label: "Dashboard",
    description: "System overview",
    to: "/teacher",
    end: true,
  },
  {
    label: "Examinations",
    description: "Manage exams",
    to: "/teacher/exams",
  },
  {
    label: "Student accounts",
    description: "Create student accounts",
    to: "/teacher/students/new",
  },
  {
    label: "Monitoring",
    description: "Live sessions",
    to: "/teacher/monitoring",
  },
  {
    label: "Activity reports",
    description: "Suspicious events",
    to: "/teacher/activities",
  },
];

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function TeacherPortalLayout() {
  const { status: connectionStatus } = useWebSocket();
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const displayName = user?.fullName ?? "Lecturer";
  const accountLabel = user?.username ?? "Unknown account";

  const handleSignOut = () => {
    /*
     * Sau này gửi LOGOUT trước khi điều hướng.
     * Server phải xóa authenticated session.
     */
    logout();
    navigate("/login", {
      replace: true,
    });
  };

  return (
    <main
      className="
        min-h-screen bg-[#f4f7fb]
        text-slate-950
      "
    >
      <div
        className="
          grid min-h-screen
          grid-cols-[260px_minmax(0,1fr)]
          max-lg:grid-cols-1
        "
      >
        <aside
          className="
            sticky top-0 flex h-screen
            flex-col border-r
            border-slate-800
            bg-slate-950 text-white
            max-lg:static max-lg:h-auto
            max-lg:border-b max-lg:border-r-0
          "
        >
          <div
            className="
              flex min-h-[76px]
              items-center gap-3
              border-b border-slate-800
              px-5
            "
          >
            <div
              className="
                grid h-10 w-10
                place-items-center
                rounded-lg bg-blue-600
                text-xs font-extrabold
                text-white
              "
              aria-hidden="true"
            >
              OE
            </div>

            <div>
              <p
                className="
                  text-[10px] font-bold
                  tracking-[0.14em]
                  text-blue-300
                "
              >
                LECTURER PORTAL
              </p>

              <p className="mt-1 text-sm font-semibold">Online Examination</p>
            </div>
          </div>

          <nav
            className="
              flex-1 space-y-1 p-4
              max-lg:flex max-lg:overflow-x-auto
            "
            aria-label="Teacher portal navigation"
          >
            {NAVIGATION_ITEMS.map((navigationItem) => (
              <NavLink
                key={navigationItem.to}
                className={({ isActive }) => `
                    block rounded-lg px-4 py-3
                    transition-colors
                    max-lg:min-w-[170px]
                    ${
                      isActive
                        ? `
                          bg-blue-600
                          text-white
                        `
                        : `
                          text-slate-300
                          hover:bg-slate-900
                          hover:text-white
                        `
                    }
                  `}
                to={navigationItem.to}
                end={navigationItem.end}
              >
                <p className="text-sm font-semibold">{navigationItem.label}</p>

                <p
                  className="
                      mt-1 text-[11px]
                      opacity-70
                    "
                >
                  {navigationItem.description}
                </p>
              </NavLink>
            ))}
          </nav>

          <div
            className="
              border-t border-slate-800
              p-4
              max-lg:hidden
            "
          >
            <div
              className="
                flex items-center gap-3
                rounded-lg bg-slate-900 p-3
              "
            >
              <div
                className="
                  grid h-9 w-9 shrink-0
                  place-items-center
                  rounded-full bg-slate-800
                  text-xs font-bold
                  text-white
                "
                aria-hidden="true"
              >
                {getInitials(displayName)}
              </div>

              <div className="min-w-0">
                <p
                  className="
                    truncate text-xs
                    font-semibold text-white
                  "
                >
                  {displayName}
                </p>

                <p
                  className="
                    mt-0.5 truncate
                    text-[10px]
                    text-slate-400
                  "
                >
                  {accountLabel}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header
            className="
              sticky top-0 z-30
              border-b border-slate-200
              bg-white/95 backdrop-blur
            "
          >
            <div
              className="
                flex min-h-[76px]
                items-center justify-between
                gap-5 px-8
                max-sm:px-4
              "
            >
              <div>
                <p
                  className="
                    text-[10px] font-bold uppercase
                    tracking-[0.14em]
                    text-slate-400
                  "
                >
                  Examination administration
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Lecturer workspace
                </p>
              </div>

              <div className="flex items-center gap-3">
                <ConnectionBadge status={connectionStatus} />

                <button
                  className="
                    rounded-md border
                    border-slate-300
                    bg-white px-3 py-2
                    text-xs font-semibold
                    text-slate-700
                    transition-colors
                    hover:border-red-300
                    hover:text-red-700
                  "
                  type="button"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <div
            className="
              mx-auto w-full max-w-[1400px]
              px-8 py-8
              max-sm:px-4 max-sm:py-6
            "
          >
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}

export default TeacherPortalLayout;
