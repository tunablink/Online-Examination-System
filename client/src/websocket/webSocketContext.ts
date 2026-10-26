import {
  createContext,
} from 'react';

import type {
  ClientMessageType,
  ServerMessage,
  ServerMessageType,
} from './protocol';

import type {
  ConnectionStatus,
  ServerMessageHandler,
  Unsubscribe,
} from './useExamWebSocket';

export interface WebSocketContextValue {
  status: ConnectionStatus;

  lastMessage:
    ServerMessage | null;

  sendMessage: (
    type: ClientMessageType,
    payload?: Record<
      string,
      unknown
    >,
    onResponse?:
      ServerMessageHandler,
  ) => string | null;

  subscribe: (
    type: ServerMessageType,
    handler:
      ServerMessageHandler,
  ) => Unsubscribe;
}

export const WebSocketContext =
  createContext<
    WebSocketContextValue | null
  >(null);