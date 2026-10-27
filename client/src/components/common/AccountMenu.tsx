import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '../../auth/useAuth';
import Icon from './Icon';

interface AccountMenuProps {
  profilePath: string;
  fallbackName: string;
  fallbackAccountLabel: string;
}

function getInitials(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function AccountMenu({ profilePath, fallbackName, fallbackAccountLabel }: AccountMenuProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayName = user?.fullName ?? fallbackName;
  const accountLabel = user?.username ?? fallbackAccountLabel;

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const signOut = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return <div className="relative" ref={containerRef}>
    <button aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-3 rounded-lg p-1 text-left hover:bg-[#f2f6f7]" onClick={() => setOpen((current) => !current)} type="button">
      <span className="text-right max-sm:hidden"><span className="block max-w-[150px] truncate text-[11px] font-semibold text-[#263238]">{displayName}</span><span className="mt-0.5 block max-w-[150px] truncate text-[9px] text-[#78868b]">{accountLabel}</span></span>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#00778b] text-[10px] font-bold text-white">{getInitials(displayName)}</span>
      <Icon className={`text-[#718087] transition-transform ${open ? 'rotate-180' : ''}`} name="chevron-down" size={12} />
    </button>

    {open && <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-[#dce7ea] bg-white p-2 shadow-[0_18px_45px_rgba(15,42,51,.16)]" role="menu">
      <div className="border-b border-[#edf1f2] px-3 py-2.5"><p className="truncate text-[11px] font-bold text-[#27363b]">{displayName}</p><p className="mt-1 truncate text-[9px] text-[#7b898e]">{user?.email ?? accountLabel}</p></div>
      <Link className="mt-1 flex h-10 items-center gap-3 rounded-lg px-3 text-[10px] font-semibold text-[#405057] hover:bg-[#eef6f7] hover:text-[#00778b]" onClick={() => setOpen(false)} role="menuitem" to={profilePath}><Icon name="users" size={15} />My profile</Link>
      <button className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[10px] font-semibold text-[#a82b31] hover:bg-red-50" onClick={signOut} role="menuitem" type="button"><Icon name="logout" size={15} />Sign out</button>
    </div>}
  </div>;
}

export default AccountMenu;
