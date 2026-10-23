import {
  useContext,
} from 'react';

import {
  WebSocketContext,
} from './webSocketContext';

export function useWebSocket() {
  const context =
    useContext(
      WebSocketContext,
    );

  if (context === null) {
    throw new Error(
      'useWebSocket must be used inside WebSocketProvider.',
    );
  }

  return context;
}