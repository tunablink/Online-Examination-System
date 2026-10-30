import { useCallback, useEffect, type ReactNode } from "react";

import { useAuth } from "../auth/useAuth";

import { useExamWebSocket } from "./useExamWebSocket";

import { WebSocketContext } from "./webSocketContext";
import { readSessionToken } from '../auth/sessionToken';

interface WebSocketProviderProps {
  children: ReactNode;
}

function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { logout, login, recovering, beginRecovery, finishRecovery } = useAuth();

  const handleConnectionLost = useCallback(() => {
    if (readSessionToken() !== null) beginRecovery();
    else logout('The connection was lost. Please sign in again.');
  }, [beginRecovery, logout]);

  const webSocket = useExamWebSocket({
    onConnectionLost: handleConnectionLost,
  });

  const { status, sendMessage, subscribe } = webSocket;
  useEffect(() => subscribe('ERROR', (message) => {
    if (message.error?.code === 'SESSION_INVALID') logout(message.error.message);
  }), [subscribe, logout]);
  useEffect(() => {
    if (status !== 'connected') return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      const token = readSessionToken();
      if (token === null) { finishRecovery(); return; }
      beginRecovery();
      const request = sendMessage('RESUME_SESSION', { sessionToken: token }, (message) => {
        if (disposed) return;
        const data = message.data;
        if (message.type === 'SESSION_RESUMED' && data && Number.isSafeInteger(data.id)
          && typeof data.id === 'number' && data.id > 0 && typeof data.institutionalId === 'string'
          && typeof data.fullName === 'string' && typeof data.email === 'string'
          && (data.role === 'STUDENT' || data.role === 'TEACHER') && typeof data.sessionToken === 'string') {
          login({ id: data.id, institutionalId: data.institutionalId, fullName: data.fullName, email: data.email, role: data.role }, data.sessionToken);
        } else if (message.error?.code !== 'CONNECTION_CLOSED') {
          logout(message.error?.message ?? 'Your session could not be restored. Please sign in again.');
        }
      });
      if (request === null) logout('Your session could not be restored. Please sign in again.');
    }, 0);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [status, sendMessage, login, logout, beginRecovery, finishRecovery]);

  return (
    <WebSocketContext.Provider value={{ ...webSocket, status: recovering && status === 'connected' ? 'connecting' : status }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export default WebSocketProvider;
