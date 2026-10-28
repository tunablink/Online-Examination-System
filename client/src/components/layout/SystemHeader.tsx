import { useEffect, useState } from 'react';
import type { ConnectionStatus } from '../../websocket/useExamWebSocket';
import ConnectionBadge from '../common/ConnectionBadge';
import AppLogo from '../common/AppLogo';

function SystemHeader({ connectionStatus }: { connectionStatus: ConnectionStatus }) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setTime(new Date()), 1000); return () => window.clearInterval(id); }, []);
  return <header className="mx-auto mb-4 flex min-h-10 w-full max-w-[1240px] items-center justify-between gap-4 max-sm:flex-col max-sm:items-start"><div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[.11em] text-[#304047]"><AppLogo className="h-7 w-7" />EZAM</div><div className="flex items-center gap-3"><ConnectionBadge status={connectionStatus} /><span className="font-mono text-xs text-[#718087]">{time.toLocaleTimeString('en-GB')}</span></div></header>;
}

export default SystemHeader;
