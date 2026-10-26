import type { ConnectionStatus } from '../../websocket/useExamWebSocket';

interface ConnectionBadgeProps { status: ConnectionStatus; }

const labels: Record<ConnectionStatus, string> = { connecting: 'Connecting…', connected: 'Server connected', disconnected: 'Disconnected', error: 'Connection error' };
const styles: Record<ConnectionStatus, string> = {
  connecting: 'border-[#ead9bc] bg-[#fff8ed] text-[#986313]',
  connected: 'border-[#b7dce2] bg-[#eff9fa] text-[#00778b]',
  disconnected: 'border-[#d8e0e3] bg-[#f2f5f6] text-[#617177]',
  error: 'border-[#edc9cc] bg-[#fff3f3] text-[#b32c33]',
};

function ConnectionBadge({ status }: ConnectionBadgeProps) {
  return <span className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold ${styles[status]}`}><span className={`h-1.5 w-1.5 rounded-full ${status === 'connected' ? 'bg-[#00849a]' : status === 'connecting' ? 'bg-[#c68624]' : 'bg-[#bd2f35]'}`} />{labels[status]}</span>;
}

export default ConnectionBadge;
