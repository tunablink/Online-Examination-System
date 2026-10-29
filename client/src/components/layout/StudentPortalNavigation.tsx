import { Link, useLocation } from 'react-router';

function StudentPortalNavigation() {
  const { pathname } = useLocation();
  const isResultPage = /^\/student\/attempts\/[^/]+\/result\/?$/.test(pathname);
  return (
    <nav aria-label="Student portal navigation" className="flex w-fit shrink-0 rounded-xl bg-[#e9eff1] p-1.5">
      {[
        { to: '/student/exams', label: 'Examinations' },
        { to: '/student/history', label: 'History' },
      ].map(({ to, label }) => {
        const isActive = pathname === to || pathname.startsWith(`${to}/`)
          || (to === '/student/history' && isResultPage);
        return <Link
          aria-current={isActive ? 'page' : undefined}
          className={`rounded-lg px-6 py-1.75 text-base font-semibold ${isActive ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#68777d]'}`}
          key={to}
          to={to}
        >
          {label}
        </Link>;
      })}
    </nav>
  );
}

export default StudentPortalNavigation;
