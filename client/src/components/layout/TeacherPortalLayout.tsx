import { NavLink, Outlet } from 'react-router';

import { useWebSocket } from '../../websocket/useWebSocket';
import AccountMenu from '../common/AccountMenu';
import AppLogo from '../common/AppLogo';
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
          <div className="flex h-[68px] items-center gap-3 border-b border-[#edf2f4] px-5">
            <AppLogo />
            <div>
              <p className="text-xl font-extrabold tracking-[-0.04em] text-[#172126]">EZAM</p>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7b8a90]">Online Examination</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 max-lg:flex max-lg:gap-5 max-lg:overflow-x-auto" aria-label="Teacher portal navigation">
            {NAVIGATION_GROUPS.map((group) => (
              <div className="mb-5 max-lg:mb-0 max-lg:flex max-lg:items-center" key={group.label}>
                <p className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.12em] text-[#89979d] max-lg:hidden">{group.label}</p>
                <div className="grid gap-1 max-lg:flex">
                  {group.items.map((item) => (
                    <NavLink
                      className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-lg border-l-2 px-3 text-base font-medium transition-colors max-lg:min-w-max ${isActive ? 'border-[#00849a] bg-[#eef5f7] text-[#00778b]' : 'border-transparent text-[#59686e] hover:bg-[#f5f8f9] hover:text-[#172126]'}`}
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
            <div className="flex h-[68px] items-center justify-between gap-6 px-7 max-sm:px-4">
              <label className="relative block w-full max-w-[440px] max-md:hidden">
                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#75858b]" name="search" size={16} />
                <input className="h-10 w-full rounded-lg border-0 bg-[#f1f5f6] pl-10 pr-4 text-sm text-[#2d3a3f] outline-none ring-[#00849a]/15 placeholder:text-[#8b989d] focus:ring-4" placeholder="Search courses, items, exams..." />
              </label>

              <div className="ml-auto flex items-center gap-4">
                <button className="relative grid h-9 w-9 place-items-center rounded-lg text-[#536268] hover:bg-[#f2f6f7]" type="button" aria-label="Notifications">
                  <Icon name="bell" size={18} />
                  <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-[#c82f36]" />
                </button>
                <span className="h-7 w-px bg-[#dfe7ea]" />
                <button className="flex items-center gap-2 text-sm text-[#536268]" type="button">
                  <Icon name="globe" size={16} /> En <Icon name="chevron-down" size={13} />
                </button>
                <span className="h-7 w-px bg-[#dfe7ea]" />
                <AccountMenu fallbackAccountLabel="Teacher account" fallbackName="Lecturer" profilePath="/teacher/profile" />
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1540px] px-7 py-6 max-sm:px-4">
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}

export default TeacherPortalLayout;
