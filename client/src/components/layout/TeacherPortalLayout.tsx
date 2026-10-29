import { Link, NavLink, Outlet } from 'react-router';

import { useWebSocket } from '../../websocket/useWebSocket';
import AccountMenu from '../common/AccountMenu';
import AppBrand from '../common/AppBrand';
import Icon, { type IconName } from '../common/Icon';

interface NavigationItem {
  label: string;
  to: string;
  icon: IconName;
  end?: boolean;
}

const NAVIGATION_GROUPS: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', to: '/teacher', icon: 'dashboard', end: true },
      { label: 'Examinations', to: '/teacher/exams', icon: 'document' },
      { label: 'Courses', to: '/teacher/courses', icon: 'book' },
      { label: 'Live monitoring', to: '/teacher/monitoring', icon: 'monitor' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Students', to: '/teacher/students/new', icon: 'users' },
      { label: 'Integrity reports', to: '/teacher/activities', icon: 'shield' },
    ],
  },
];

function TeacherPortalLayout() {
  const { status: connectionStatus } = useWebSocket();

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <div className="grid min-h-screen grid-cols-[248px_minmax(0,1fr)] max-lg:grid-cols-1">
        <aside className="sticky top-0 z-40 flex h-screen flex-col border-r border-[#dfe8ec] bg-white max-lg:static max-lg:h-auto max-lg:border-b max-lg:border-r-0">
          <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-[#edf2f4] px-5">
            <Link aria-label="EZAM teacher home" className="inline-flex shrink-0 items-center" to="/teacher">
              <AppBrand />
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 max-lg:flex max-lg:gap-5 max-lg:overflow-x-auto" aria-label="Teacher portal navigation">
            {NAVIGATION_GROUPS.map((group) => (
              <div className="mb-5 max-lg:mb-0 max-lg:flex max-lg:items-center" key={group.label}>
                <p className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.12em] text-[#89979d] max-lg:hidden">{group.label}</p>
                <div className="grid gap-1 max-lg:flex">
                  {group.items.map((item) => (
                    <NavLink
                      className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors max-lg:min-w-max ${isActive ? 'border-[#00849a] bg-[#eef5f7] text-[#00778b]' : 'border-transparent text-[#59686e] hover:bg-[#f5f8f9] hover:text-[#172126]'}`}
                      end={item.end}
                      key={item.to}
                      to={item.to}
                    >
                      <Icon name={item.icon} size={16} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="m-3 rounded-xl border border-[#e2eaed] bg-[#f6f9fa] p-3 max-lg:hidden">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#405157]">
              <Icon className="text-[#00778b]" name="shield" size={16} />
              Proctor Engine
            </div>
            <p className="mt-1 pl-6 text-xs font-semibold text-[#a05d00]">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#d88a1d]" />
              {connectionStatus === 'connected' ? 'Operational' : 'Reconnecting'}
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#e4ecef] bg-white/95 backdrop-blur">
            <div className="flex min-h-[68px] items-center justify-between gap-6 px-7 max-sm:px-4">
              <div className="ml-auto flex items-center gap-3">
                <AccountMenu fallbackAccountLabel="Teacher account" fallbackName="Lecturer" profilePath="/teacher/profile" showAccountLabel={false} />
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1540px] px-7 py-7 max-sm:px-4">
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}

export default TeacherPortalLayout;
