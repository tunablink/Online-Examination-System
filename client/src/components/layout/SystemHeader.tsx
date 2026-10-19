import { useEffect, useState } from 'react';

import type { ConnectionStatus } from '../../websocket/useExamWebSocket';
import ConnectionBadge from '../common/ConnectionBadge';

interface SystemHeaderProps {
  connectionStatus: ConnectionStatus;
}

function SystemHeader({ connectionStatus }: SystemHeaderProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const formattedTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(currentTime);

  return (
    <header className="mx-auto mb-5 flex min-h-10 w-full max-w-[1240px] items-center justify-between gap-5 max-md:flex-col max-md:items-start">
      <div className="flex items-center gap-3 text-xs font-bold tracking-[0.14em] text-slate-900">
        <span
          className="grid h-6 w-6 place-items-center rounded bg-blue-700 text-[10px] tracking-normal text-white"
          aria-hidden="true"
        >
          OE
        </span>
        <span>ONLINE EXAMINATION SYSTEM</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 max-sm:w-full max-sm:flex-wrap">
        <ConnectionBadge status={connectionStatus} />
        <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
        <span className="tabular-nums">Local time {formattedTime}</span>
      </div>
    </header>
  );
}

export default SystemHeader;
