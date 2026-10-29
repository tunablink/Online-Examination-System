import { Link, NavLink } from "react-router";

import AccountMenu from "../common/AccountMenu";
import AppBrand from "../common/AppBrand";
import Icon from "../common/Icon";

interface StudentPortalHeaderProps {
  currentSection?: string;
  compact?: boolean;
  timerLabel?: string;
  onSubmit?: () => void;
  showNavigation?: boolean;
  prominentTitle?: boolean;
}

function StudentPortalHeader({
  compact = false,
  timerLabel,
  onSubmit,
  showNavigation = true,
}: StudentPortalHeaderProps) {
  return (
    <header className="border-b border-[#e3ebee] bg-white">
      <div
        className={`mx-auto flex w-full items-center justify-between gap-5 px-6 max-sm:px-4 ${compact ? "max-w-none min-h-[64px]" : "max-w-[1360px] min-h-[68px]"}`}
      >
        <div className="flex min-w-0 items-center gap-5">
          <Link
            aria-label="EZAM student home"
            className="flex shrink-0 items-center gap-2.5"
            to="/student/exams"
          >
            <AppBrand />
          </Link>
        </div>

        {!compact && showNavigation && (
          <nav
            className="flex rounded-lg bg-[#f3f6f7] p-1 max-md:hidden"
            aria-label="Student portal navigation"
          >
            <NavLink
              className={({ isActive }) =>
                `rounded-md px-4 py-2 text-sm font-semibold ${isActive ? "bg-white text-[#00778b] shadow-sm" : "text-[#68777d]"}`
              }
              to="/student/exams"
            >
              Examinations
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `rounded-md px-4 py-2 text-sm font-semibold ${isActive ? "bg-white text-[#00778b] shadow-sm" : "text-[#68777d]"}`
              }
              to="/student/history"
            >
              History
            </NavLink>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {timerLabel && (
            <div className="flex items-center gap-2 rounded-lg bg-[#f1f5f6] px-3 py-2 font-mono text-sm font-bold text-[#26343a]">
              <Icon className="text-[#9b6a00]" name="clock" size={15} />{" "}
              {timerLabel}
            </div>
          )}
          {onSubmit && (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#00778b] px-4 text-sm font-semibold text-white hover:bg-[#006273]"
              onClick={onSubmit}
              type="button"
            >
              Submit exam <Icon name="arrow-right" size={14} />
            </button>
          )}
          <span className="h-7 w-px bg-[#dfe7ea] max-sm:hidden" />
          <AccountMenu
            fallbackAccountLabel="Student account"
            fallbackName="Student"
            profilePath="/student/profile"
            showAccountLabel={false}
          />
        </div>
      </div>
    </header>
  );
}

export default StudentPortalHeader;
