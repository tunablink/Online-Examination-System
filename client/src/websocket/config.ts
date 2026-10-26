const DEFAULT_WEBSOCKET_URL =
  'ws://localhost:8081/ws';

function resolveWebSocketUrl():
  string {
  const configuredUrl =
    import.meta.env
      .VITE_WEBSOCKET_URL
      ?.trim();

  if (
    configuredUrl === undefined ||
    configuredUrl.length === 0
  ) {
    return DEFAULT_WEBSOCKET_URL;
  }

  let parsedUrl: URL;

  try {
    parsedUrl =
      new URL(configuredUrl);
  } catch {
    throw new Error(
      'VITE_WEBSOCKET_URL must be a valid URL.',
    );
  }

  if (
    parsedUrl.protocol !== 'ws:' &&
    parsedUrl.protocol !== 'wss:'
  ) {
    throw new Error(
      'VITE_WEBSOCKET_URL must use the ws: or wss: protocol.',
    );
  }

  return configuredUrl;
}

export const WEBSOCKET_URL =
  resolveWebSocketUrl();