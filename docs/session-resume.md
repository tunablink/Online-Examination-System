# Tab-scoped session recovery

`LOGIN` returns the existing safe user fields plus `sessionToken` and
`sessionExpiresAt`. `RESUME_SESSION { sessionToken }` returns `SESSION_RESUMED`
with the same shape. `LOGOUT {}` returns `LOGGED_OUT` and revokes the credential.
The server never accepts a user ID or role from a resume payload.

Credentials contain 32 cryptographically random bytes, encoded as URL-safe
Base64, and expire eight hours after login. The server retains only their SHA-256
digest, account ID, password-hash fingerprint and expiry. The in-memory store is
limited to 10,000 live credentials; expired entries are pruned when issuing a
credential. Disconnect detaches a socket without revoking its credential.

Resume re-reads the user from PostgreSQL and rejects inactive, missing,
password-changed, expired or unknown credentials. It restores the current server
role and profile. Successful logout revokes the credential across all sockets
sharing it; subsequent commands and monitoring delivery check credential validity.
The existing session registry still supplies identity to business handlers.

The browser stores the token in `sessionStorage` for the current tab, not in a
password field or persistent user/role object. Protected routes wait for server
verification on refresh. During reconnect, the WebSocket provider advertises a
non-ready connection until resume succeeds, preventing pages from sending
authenticated requests too early. A resumed exam reloads its authoritative
attempt/deadline/answers from the database. Logging in again can return a student
to the protected route they originally requested.

Limitations:

- Tokens are intentionally in memory on this single server. Restarting the Java
  process requires login again; persisted attempts and deadlines remain intact.
- Closing a tab normally ends its browser storage lifetime. Browser session
  restore or a duplicated tab may retain/copy storage, so explicit sign-out on
  shared devices is required. Server expiry remains authoritative.
- `sessionStorage` is accessible to scripts running in the same origin. This is
  a development-project recovery mechanism, not an HttpOnly-cookie production
  authentication stack. Production requires HTTPS/WSS and XSS protection.
- Offline sign-out clears local credentials, but cannot contact the server to
  revoke them. They remain bounded by the original expiry.
- Account disable/password changes are checked on resume. Revoking every active
  socket immediately on account changes is not implemented.

Manual checks:

1. Log in, start an exam, save an answer, and refresh the room URL. The page should
   wait for resume and then show the same attempt, order, deadline and answer.
2. Interrupt the connection briefly. On restoration the client should resume
   before issuing exam requests; no password should be requested.
3. Sign out, then revisit a protected URL. It must redirect to login.
4. Restart the Java server while a student is signed in. The old token should be
   rejected and cleared, with a sign-in notice. Login again and recover the saved
   attempt via the original room URL or exam flow.

Automated tests cover token generation, expiry, disconnect/resume, revocation,
disabled/password-changed accounts, and login → disconnect → resume → logout
routing against the real Spring context and PostgreSQL (mock socket transport).
