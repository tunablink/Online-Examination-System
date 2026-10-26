import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ClientMessage,
  ClientMessageType,
  ServerMessage,
} from "./protocol";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type ServerMessageHandler = (message: ServerMessage) => void;
export type SendExamMessage = (
  type: ClientMessageType,
  payload?: Record<string, unknown>,
  onResponse?: ServerMessageHandler,
) => string | null;

interface PendingRequest {
  handler: ServerMessageHandler;
  timeoutId: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 10_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 10_000;

const WEBSOCKET_URL = "ws://localhost:8081/ws";

function createConnectionErrorMessage(): ServerMessage {
  return {
    requestId: null,
    type: "ERROR",
    data: null,
    error: {
      code: "CONNECTION_CLOSED",
      message: "The connection to the examination server was lost.",
    },
  };
}

function createRequestTimeoutMessage(requestId: string): ServerMessage {
  return {
    requestId,
    type: "ERROR",
    data: null,
    error: {
      code: "REQUEST_TIMEOUT",
      message: "The examination server did not respond in time.",
    },
  };
}

export function useExamWebSocket() {
  const socketRef = useRef<WebSocket | null>(null);

  const responseHandlersRef = useRef<Map<string, PendingRequest>>(new Map());

  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null);

  useEffect(() => {
    let disposed = false;

    let reconnectAttempt = 0;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const responseHandlers = responseHandlersRef.current;

    const rejectPendingRequests = () => {
      const connectionError = createConnectionErrorMessage();

      const pendingRequests = Array.from(responseHandlers.values());

      responseHandlers.clear();

      pendingRequests.forEach(({ handler, timeoutId }) => {
        clearTimeout(timeoutId);
        handler(connectionError);
      });
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) {
        return;
      }

      const reconnectDelay = Math.min(
        RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
        RECONNECT_MAX_DELAY_MS,
      );

      reconnectAttempt += 1;

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;

        if (disposed) {
          return;
        }

        setStatus("connecting");
        connect();
      }, reconnectDelay);
    };

    const connect = () => {
      if (disposed) {
        return;
      }

      const currentSocket = socketRef.current;

      if (
        currentSocket !== null &&
        (currentSocket.readyState === WebSocket.OPEN ||
          currentSocket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const socket = new WebSocket(WEBSOCKET_URL);

      socketRef.current = socket;

      socket.onopen = () => {
        if (disposed || socketRef.current !== socket) {
          return;
        }

        reconnectAttempt = 0;
        setStatus("connected");
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        if (disposed || socketRef.current !== socket) {
          return;
        }

        try {
          const message = JSON.parse(event.data) as ServerMessage;

          setLastMessage(message);

          if (message.requestId === null) {
            return;
          }

          const pendingRequest = responseHandlers.get(message.requestId);

          if (pendingRequest === undefined) {
            return;
          }

          responseHandlers.delete(message.requestId);

          clearTimeout(pendingRequest.timeoutId);

          pendingRequest.handler(message);
        } catch (error) {
          console.error("The server returned invalid JSON:", error);
        }
      };

      socket.onerror = () => {
        if (disposed || socketRef.current !== socket) {
          return;
        }

        setStatus("error");
        rejectPendingRequests();
      };

      socket.onclose = () => {
        if (disposed || socketRef.current !== socket) {
          return;
        }

        socketRef.current = null;

        setStatus("disconnected");
        rejectPendingRequests();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;

      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      responseHandlers.forEach(({ timeoutId }) => {
        clearTimeout(timeoutId);
      });

      responseHandlers.clear();

      const activeSocket = socketRef.current;

      socketRef.current = null;

      if (
        activeSocket !== null &&
        (activeSocket.readyState === WebSocket.OPEN ||
          activeSocket.readyState === WebSocket.CONNECTING)
      ) {
        activeSocket.close();
      }
    };
  }, []);

  const sendMessage = useCallback(
    (
      type: ClientMessageType,
      payload: Record<string, unknown> = {},
      onResponse?: ServerMessageHandler,
    ): string | null => {
      const socket = socketRef.current;

      if (socket === null || socket.readyState !== WebSocket.OPEN) {
        return null;
      }

      const requestId = crypto.randomUUID();

      const message: ClientMessage = {
        requestId,
        type,
        payload,
      };

      try {
        if (onResponse !== undefined) {
          const timeoutId = setTimeout(() => {
            const pendingRequest = responseHandlersRef.current.get(requestId);

            if (pendingRequest === undefined) {
              return;
            }

            responseHandlersRef.current.delete(requestId);

            pendingRequest.handler(createRequestTimeoutMessage(requestId));
          }, REQUEST_TIMEOUT_MS);

          responseHandlersRef.current.set(requestId, {
            handler: onResponse,
            timeoutId,
          });
        }

        socket.send(JSON.stringify(message));

        return requestId;
      } catch (error) {
        const pendingRequest = responseHandlersRef.current.get(requestId);

        if (pendingRequest !== undefined) {
          clearTimeout(pendingRequest.timeoutId);

          responseHandlersRef.current.delete(requestId);
        }

        console.error("The WebSocket message could not be sent:", error);

        return null;
      }
    },
    [],
  );

  return {
    status,
    lastMessage,
    sendMessage,
  };
}
