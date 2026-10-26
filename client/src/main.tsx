import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import AuthProvider from './auth/AuthProvider';

import App from './App';
import './index.css';
import WebSocketProvider from './websocket/WebSocketProvider';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  </StrictMode>,
);