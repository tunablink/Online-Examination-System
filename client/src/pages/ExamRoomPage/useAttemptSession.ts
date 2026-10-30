import { useEffect } from 'react';
import { useWebSocket } from '../../websocket/useWebSocket';

export function isAttemptSessionError(code: string | undefined): boolean {
  return code === 'ATTEMPT_IN_USE' || code === 'ATTEMPT_SESSION_REQUIRED';
}

export function useAttemptSession(attemptId: number | null, enabled: boolean,
  onConflict: (message: string) => void, onRestore: () => void) {
  const { status, sendMessage } = useWebSocket();
  // Release only when leaving this attempt, not when loading/reconnecting changes.
  // Otherwise a delayed cleanup can release the newly recovered socket's lease.
  useEffect(() => {
    if (attemptId === null) return;
    return () => { sendMessage('RELEASE_ATTEMPT', { attemptId }); };
  }, [attemptId, sendMessage]);
  useEffect(() => {
    if (attemptId === null || !enabled || status !== 'connected') return;
    let disposed = false;
    let pending = false;
    const heartbeat = () => {
      if (pending || disposed) return;
      pending = true;
      const request = sendMessage('HEARTBEAT_ATTEMPT', { attemptId }, (message) => {
        pending = false;
        if (!disposed && isAttemptSessionError(message.error?.code))
          onConflict(message.error?.message ?? 'This examination is already open in another tab/session.');
      });
      if (request === null) pending = false;
    };
    const release = () => { sendMessage('RELEASE_ATTEMPT', { attemptId }); };
    const pageHide = (event: PageTransitionEvent) => { if (!event.persisted) release(); };
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) onRestore(); };
    const timer = window.setInterval(heartbeat, 10_000);
    const first = window.setTimeout(heartbeat, 0);
    window.addEventListener('focus', heartbeat);
    window.addEventListener('pagehide', pageHide);
    window.addEventListener('pageshow', pageShow);
    return () => {
      disposed = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener('focus', heartbeat);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener('pageshow', pageShow);
      // A transport interruption retains the lease for safe reconnect.
    };
  }, [attemptId, enabled, status, sendMessage, onConflict, onRestore]);
}
