import { NavLink, Outlet, useLocation } from 'react-router';

import { useWebSocket } from '../../websocket/useWebSocket';
import AccountMenu from '../common/AccountMenu';
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
  const pathname = useLocation().pathname;
  const compactExams = pathname === '/teacher/exams';
  const examDetails = /^\/teacher\/exams\/\d+$/.test(pathname);

  return (
    <main className="min-h-screen bg-[#f5f9fb] text-[#172126]">
      <div className={`grid min-h-screen ${compactExams ? 'grid-cols-[162px_minmax(0,1fr)] max-md:grid-cols-1' : examDetails ? 'grid-cols-[255px_minmax(0,1fr)] max-md:grid-cols-1' : 'grid-cols-[218px_minmax(0,1fr)] max-lg:grid-cols-1'}`}>
        <aside className={`sticky top-0 z-40 flex h-screen flex-col border-r border-[#dfe8ec] bg-white ${compactExams || examDetails ? 'max-md:static max-md:h-auto max-md:border-b max-md:border-r-0' : 'max-lg:static max-lg:h-auto max-lg:border-b max-lg:border-r-0'}`}>
          <div className={`flex items-center border-b border-[#edf2f4] ${compactExams ? 'h-[50px] gap-2 px-3' : examDetails ? 'h-[84px] gap-3 px-6' : 'h-[68px] gap-3 px-5'}`}>
            <div className={`grid place-items-center rounded-lg bg-[#00778b] text-white shadow-[0_4px_12px_rgba(0,119,139,.18)] ${compactExams ? 'h-7 w-7' : 'h-9 w-9'}`}>
              <Icon name="document" size={compactExams ? 15 : 19} />
            </div>
            <div>
              <p className={`${compactExams ? 'text-[12px]' : 'text-[17px]'} font-extrabold tracking-[-0.04em] text-[#172126]`}>Qorrect</p>
              <p className={`${compactExams ? 'text-[6px]' : 'text-[9px]'} font-semibold uppercase tracking-[0.08em] text-[#7b8a90]`}>Assessment Suite</p>
            </div>
          </div>

          <nav className={`flex-1 overflow-y-auto ${compactExams ? 'px-2 py-4 max-md:flex max-md:gap-4 max-md:overflow-x-auto' : examDetails ? 'px-4 py-6 max-md:flex max-md:gap-4 max-md:overflow-x-auto' : 'px-3 py-4 max-lg:flex max-lg:gap-5 max-lg:overflow-x-auto'}`} aria-label="Teacher portal navigation">
            {NAVIGATION_GROUPS.map((group) => (
              <div className={`${compactExams ? 'mb-4 max-md:mb-0 max-md:flex max-md:items-center' : examDetails ? 'mb-7 max-md:mb-0 max-md:flex max-md:items-center' : 'mb-5 max-lg:mb-0 max-lg:flex max-lg:items-center'}`} key={group.label}>
                <p className={`${compactExams ? 'mb-2 px-2 text-[7px] max-md:hidden' : examDetails ? 'mb-3 px-2 text-[11px] max-md:hidden' : 'mb-2 px-2 text-[9px] max-lg:hidden'} font-bold uppercase tracking-[0.12em] text-[#89979d]`}>{group.label}</p>
                <div className={`grid ${compactExams ? 'gap-0.5 max-md:flex' : examDetails ? 'gap-1 max-md:flex' : 'gap-1 max-lg:flex'}`}>
                  {group.items.map((item) => (
                    <NavLink
                      className={({ isActive }) => `flex items-center font-medium transition-colors ${compactExams ? 'min-h-8 gap-2 rounded-lg border-l-2 px-2 text-[9px] max-md:min-w-max' : examDetails ? 'min-h-10 gap-3 rounded-full px-3 text-[13px] max-md:min-w-max' : 'min-h-10 gap-3 rounded-lg border-l-2 px-3 text-[12px] max-lg:min-w-max'} ${isActive ? examDetails ? 'bg-[#e0f2ff] text-[#00778b]' : 'border-[#00849a] bg-[#eef5f7] text-[#00778b]' : 'border-transparent text-[#59686e] hover:bg-[#f5f8f9] hover:text-[#172126]'}`}
                      end={item.end}
                      key={item.to}
                      to={item.to}
                    >
                      <Icon name={item.icon} size={compactExams ? 12 : examDetails ? 17 : 16} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className={`rounded-xl border border-[#e2eaed] bg-[#f6f9fa] ${compactExams ? 'm-2 p-2 max-md:hidden' : examDetails ? 'hidden' : 'm-3 p-3 max-lg:hidden'}`}>
            <div className={`flex items-center font-semibold text-[#405157] ${compactExams ? 'gap-1.5 text-[8px]' : 'gap-2 text-[11px]'}`}>
              <Icon className="text-[#00778b]" name="shield" size={compactExams ? 12 : 16} />
              Proctor Engine
            </div>
            <p className={`mt-1 font-semibold text-[#a05d00] ${compactExams ? 'pl-5 text-[7px]' : 'pl-6 text-[9px]'}`}>
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#d88a1d]" />
              {connectionStatus === 'connected' ? 'Operational' : 'Reconnecting'}
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#e4ecef] bg-white/95 backdrop-blur">
            <div className={`flex items-center justify-between ${compactExams ? 'h-[50px] gap-3 px-5 max-sm:px-3' : examDetails ? 'h-[64px] gap-6 px-8 max-sm:px-4' : 'h-[68px] gap-6 px-7 max-sm:px-4'}`}>
              <label className={`relative block w-full ${compactExams ? 'max-w-[290px] max-sm:hidden' : 'max-w-[440px] max-md:hidden'}`}>
                <Icon className={`absolute top-1/2 -translate-y-1/2 text-[#75858b] ${compactExams ? 'left-2.5' : 'left-3.5'}`} name="search" size={compactExams ? 12 : 16} />
                <input className={`w-full rounded-lg border-0 bg-[#f1f5f6] text-[#2d3a3f] outline-none ring-[#00849a]/15 placeholder:text-[#8b989d] focus:ring-4 ${compactExams ? 'h-7 pl-8 pr-3 text-[9px]' : 'h-10 pl-10 pr-4 text-xs'}`} placeholder="Search courses, items, exams..." />
              </label>

              <div className={`ml-auto flex items-center ${compactExams ? 'gap-2.5' : 'gap-4'}`}>
                <button className={`relative grid place-items-center rounded-lg text-[#536268] hover:bg-[#f2f6f7] ${compactExams ? 'h-7 w-7' : 'h-9 w-9'}`} type="button" aria-label="Notifications">
                  <Icon name="bell" size={compactExams ? 14 : 18} />
                  <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-[#c82f36]" />
                </button>
                <span className={`${compactExams ? 'h-5' : 'h-7'} w-px bg-[#dfe7ea]`} />
                <button className={`flex items-center gap-1 text-[#536268] ${compactExams ? 'text-[9px]' : 'text-xs'}`} type="button">
                  <Icon name="globe" size={compactExams ? 12 : 16} /> En <Icon name="chevron-down" size={compactExams ? 10 : 13} />
                </button>
                <span className={`${compactExams ? 'h-5' : 'h-7'} w-px bg-[#dfe7ea]`} />
                <AccountMenu compact={compactExams} fallbackAccountLabel="Teacher account" fallbackName="Lecturer" profilePath="/teacher/profile" />
              </div>
            </div>
          </header>

          <div className={`mx-auto w-full ${compactExams ? 'max-w-[1180px] px-5 py-5 max-sm:px-3' : examDetails ? 'max-w-[1320px] px-8 py-8 max-sm:px-4' : 'max-w-[1540px] px-7 py-6 max-sm:px-4'}`}>
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}

export default TeacherPortalLayout;
