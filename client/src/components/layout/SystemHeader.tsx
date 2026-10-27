import { useEffect, useState } from 'react';
import type { ConnectionStatus } from '../../websocket/useExamWebSocket';
import ConnectionBadge from '../common/ConnectionBadge';
import Icon from '../common/Icon';

function SystemHeader({ connectionStatus }: { connectionStatus: ConnectionStatus }) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setTime(new Date()), 1000); return () => window.clearInterval(id); }, []);
  return <header className="mx-auto mb-4 flex min-h-10 w-full max-w-[1240px] items-center justify-between gap-4 max-sm:flex-col max-sm:items-start"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.11em] text-[#304047]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#00778b] text-white"><Icon name="document" size={14} /></span>Qorrect Assessment Suite</div><div className="flex items-center gap-3"><ConnectionBadge status={connectionStatus} /><span className="font-mono text-[9px] text-[#718087]">{time.toLocaleTimeString('en-GB')}</span></div></header>;
}

export default SystemHeader;
