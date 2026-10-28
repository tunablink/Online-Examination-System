import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '../../auth/useAuth';
import Icon from './Icon';
import { useWebSocket } from '../../websocket/useWebSocket';

interface AccountMenuProps {
  profilePath: string;
  fallbackName: string;
  fallbackAccountLabel: string;
  compact?: boolean;
}

function getInitials(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function AccountMenu({ profilePath, fallbackName, fallbackAccountLabel, compact = false }: AccountMenuProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sendMessage } = useWebSocket();
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
    sendMessage('LOGOUT');
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return <div className="relative" ref={containerRef}>
    <button aria-expanded={open} aria-haspopup="menu" className={`flex items-center rounded-lg p-1 text-left hover:bg-[#f2f6f7] ${compact ? 'gap-2' : 'gap-3'}`} onClick={() => setOpen((current) => !current)} type="button">
      <span className="text-right max-sm:hidden"><span className={`block truncate font-semibold text-[#263238] ${compact ? 'max-w-[105px] text-[9px]' : 'max-w-[150px] text-sm'}`}>{displayName}</span><span className={`block truncate text-[#78868b] ${compact ? 'max-w-[105px] text-[7px]' : 'mt-0.5 max-w-[150px] text-xs'}`}>{accountLabel}</span></span>
      <span className={`grid place-items-center rounded-full bg-[#00778b] font-bold text-white ${compact ? 'h-7 w-7 text-[8px]' : 'h-9 w-9 text-sm'}`}>{getInitials(displayName)}</span>
      <Icon className={`text-[#718087] transition-transform ${open ? 'rotate-180' : ''}`} name="chevron-down" size={compact ? 10 : 12} />
    </button>

    {open && <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-xl border border-[#dce7ea] bg-white p-2 shadow-[0_18px_45px_rgba(15,42,51,.16)]" role="menu">
      <div className="border-b border-[#edf1f2] px-3 py-2.5"><p className="truncate text-[11px] font-bold text-[#27363b]">{displayName}</p><p className="mt-1 truncate text-[9px] text-[#7b898e]">{user?.email ?? accountLabel}</p></div>
      <Link className="mt-1 flex h-10 items-center gap-3 rounded-lg px-3 text-[10px] font-semibold text-[#405057] hover:bg-[#eef6f7] hover:text-[#00778b]" onClick={() => setOpen(false)} role="menuitem" to={profilePath}><Icon name="users" size={15} />My profile</Link>
      <button className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[10px] font-semibold text-[#a82b31] hover:bg-red-50" onClick={signOut} role="menuitem" type="button"><Icon name="logout" size={15} />Sign out</button>
    </div>}
  </div>;
}

export default AccountMenu;
