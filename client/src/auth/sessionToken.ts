const KEY = 'exam.session.token';
let memoryToken: string | null = null;

export function readSessionToken(): string | null {
  try { return window.sessionStorage.getItem(KEY) ?? memoryToken; }
  catch { return memoryToken; }
}
export function storeSessionToken(token: string | null) {
  memoryToken = token;
  try {
    if (token === null) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, token);
  } catch { /* Storage may be disabled; this tab can still sign in normally. */ }
}
