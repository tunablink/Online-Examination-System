import type {ConnectionStatus} from '../../websocket/useExamWebSocket';

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

const CONNECTION_LABEL: Record<ConnectionStatus,string> = {
  connecting: 'Connecting...',
  connected: 'Server connected',
  disconnected: 'Disconnected',
  error: 'Connection error',
};

const STATUS_STYLES: Record<ConnectionStatus,
  {
    indicator: string;
    badge: string
}> = {
  connecting: {
    indicator: 'bg-amber-600',
    badge: 'border-amber-200 text-amber-800',
  },

  connected: {
    indicator: 'bg-emerald-600',
    badge: 'border-emerald-200 text-emerald-800',
  },

  disconnected: {
    indicator: 'bg-slate-500',
    badge: 'border-slate-300 text-slate-700',
  },

  error: {
    indicator: 'bg-red-600',
    badge: 'border-red-200 text-red-800',
  },
};

function ConnectionBadge({status}: ConnectionBadgeProps) {
  const statusStyle = STATUS_STYLES[status];

  return (
    <span
      className={`
        inline-flex min-h-8 items-center gap-2
        rounded border bg-white px-3 py-1.5
        text-xs font-semibold
        ${statusStyle.badge}
      `}
    >
      <span
        className={`
          h-2 w-2 rounded-full
          ${statusStyle.indicator}
        `}
        aria-hidden="true"
      />

      {CONNECTION_LABEL[status]}
    </span>
  );
}

export default ConnectionBadge;