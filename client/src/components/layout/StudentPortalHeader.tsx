import { Link, NavLink } from 'react-router';

import AccountMenu from '../common/AccountMenu';
import Icon from '../common/Icon';

interface StudentPortalHeaderProps {
  currentSection?: string;
  compact?: boolean;
  timerLabel?: string;
  onSubmit?: () => void;
  showNavigation?: boolean;
  prominentTitle?: boolean;
}

function StudentPortalHeader({
  currentSection = 'Examinations',
  compact = false,
  timerLabel,
  onSubmit,
  showNavigation = true,
  prominentTitle = false,
}: StudentPortalHeaderProps) {
  return (
    <header className="border-b border-[#e3ebee] bg-white">
      <div className={`mx-auto flex w-full items-center justify-between gap-5 px-6 max-sm:px-4 ${compact ? 'max-w-none min-h-[64px]' : 'max-w-[1360px] min-h-[68px]'}`}>
        <div className="flex min-w-0 items-center gap-5">
          <Link className="flex shrink-0 items-center gap-2.5" to="/student/exams">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#00778b] text-white"><Icon name="document" size={18} /></span>
            <span className="text-[17px] font-extrabold tracking-[-0.04em] text-[#172126] max-sm:hidden">Qorrect</span>
          </Link>
          <span className="h-7 w-px bg-[#dfe7ea] max-md:hidden" />
          <div className="min-w-0 max-md:hidden">
            <p className={`truncate text-[#263238] ${prominentTitle ? 'text-[17px] font-extrabold tracking-[-.04em]' : 'text-[11px] font-semibold'}`}>{currentSection}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-[#718087]"><Icon className="text-[#00778b]" name="shield" size={11} /> Proctored Secure Environment</p>
          </div>
        </div>

        {!compact && showNavigation && (
          <nav className="flex rounded-lg bg-[#f3f6f7] p-1 max-md:hidden" aria-label="Student portal navigation">
            <NavLink className={({ isActive }) => `rounded-md px-4 py-2 text-[11px] font-semibold ${isActive ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#68777d]'}`} to="/student/exams">Examinations</NavLink>
            <NavLink className={({ isActive }) => `rounded-md px-4 py-2 text-[11px] font-semibold ${isActive ? 'bg-white text-[#00778b] shadow-sm' : 'text-[#68777d]'}`} to="/student/history">History</NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {timerLabel && (
            <div className="flex items-center gap-2 rounded-lg bg-[#f1f5f6] px-3 py-2 font-mono text-xs font-bold text-[#26343a]">
              <Icon className="text-[#9b6a00]" name="clock" size={15} /> {timerLabel}
            </div>
          )}
          {onSubmit && <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-xs font-semibold text-white hover:bg-[#006273]" onClick={onSubmit} type="button">Submit exam <Icon name="arrow-right" size={14} /></button>}
          <span className="h-7 w-px bg-[#dfe7ea] max-sm:hidden" />
          <AccountMenu fallbackAccountLabel="Student account" fallbackName="Student" profilePath="/student/profile" />
        </div>
      </div>
    </header>
  );
}

export default StudentPortalHeader;
