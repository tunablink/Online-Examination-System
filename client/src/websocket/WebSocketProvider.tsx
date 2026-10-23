import { useCallback, type ReactNode } from "react";

import { useAuth } from "../auth/useAuth";

import { useExamWebSocket } from "./useExamWebSocket";

import { WebSocketContext } from "./webSocketContext";

interface WebSocketProviderProps {
  children: ReactNode;
}

function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { logout } = useAuth();

  const handleConnectionLost = useCallback(() => {
    logout(
      "Your session ended because the connection to the examination server was lost. Please sign in again after the connection is restored.",
    );
  }, [logout]);

  const webSocket = useExamWebSocket({
    onConnectionLost: handleConnectionLost,
  });

  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  );
}

export default WebSocketProvider;
