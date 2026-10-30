# Single-writer examination sessions

Each active attempt has one backend-owned writer lease tied to the authenticated student and WebSocket ID. This is not a browser-only flag. Different tabs may sign in, but only one socket may open and operate that attempt.

## Contract

- Successful `START_EXAM` / `GET_EXAM_ATTEMPT` claims an active attempt after normal ownership, course, key and schedule checks.
- Another live socket receives `ATTEMPT_IN_USE`: **This examination is already open in another tab/session.** It receives no active attempt details from that request.
- `SAVE_ANSWER`, active `SUBMIT_EXAM` and `REPORT_ACTIVITY` require the owning socket. Checking ownership and executing the mutation are serialized with lease takeover per attempt.
- `HEARTBEAT_ATTEMPT { attemptId }` returns `ATTEMPT_HEARTBEAT`; the room sends it every 10 seconds. A live lease may be taken over after 45 seconds without renewal.
- `RELEASE_ATTEMPT { attemptId }` returns `ATTEMPT_RELEASED`. Only the matching socket can release. Normal room navigation sends this best-effort; successful submit/logout also release ownership.
- A mutation without a claimed lease receives `ATTEMPT_SESSION_REQUIRED`. The UI hides the room and offers recovery instead of silently accepting local changes.
- Completed submission reads remain idempotent and do not need an active writer lease.

## Reconnect

When the server observes a socket close, it reserves the attempt for 30 seconds. A resumed connection with the same valid session credential may immediately reclaim it. A copied credential on another socket **cannot** take over while the original owner is still connected. A different credential waits for the reservation to expire, then retries opening the attempt.

If the network disappears without a close reaching the server, the 45-second live timeout bounds the wait. After takeover, late writes, releases or close events from the old socket cannot affect the new owner's lease. If the original session resumes before takeover, it can continue normally.

Recovery uses the existing database attempt, saved answers and original deadline. It never grants additional time or creates a replacement attempt. Unsaved answers are not promised to survive an interruption.

Room loading/reconnect state changes do not send RELEASE: that would risk releasing a lease just acquired by recovery. Release is tied to leaving the attempt or normal page exit, not to heartbeat effect cleanup.

## Verification

Automated registry tests cover competing/cloned credentials, disconnect grace, live timeout, renewal, stale writer fencing, delayed cleanup, failures, simultaneous claims and mutation/takeover serialization. WebSocket integration tests exercise production routing, database-backed attempts, blocked read/save/submit/activity, explicit handover, cloned-token reconnect, unchanged deadline, one attempt and repeated submit.

Manual browser acceptance (not replaced by automated tests):

1. Start backend and frontend, sign in as one student in browser A and open a published, accessible exam with its correct key.
2. Sign in as the same student in browser B or an incognito window and open the same exam. Expect the exact in-use message; no editable room.
3. Save an answer in A. Refresh A: it should recover its answer and original deadline. If the old socket is not yet detected as closed, retry after at most the live timeout.
4. Navigate away from the room in A; retry in B. B should acquire ownership. A cannot continue writing without reacquiring it.
5. Disconnect A's network while it owns an attempt, reconnect and verify recovery. Separately test closing/crashing A and retrying in B after the grace/TTL.
6. Submit from the owner and check persisted result/history; try another student's attempt URL to confirm access remains denied.

## Deployment limits

The lease registry is in memory and supports the project's **single Java server process**. Restart clears leases and resume credentials, so students must sign in again and reopen their persisted attempts. Running multiple Java replicas requires a shared lease/fencing mechanism (for example, database-backed leases or Redis); this implementation must not be described as a distributed lock.

No database migration is required for this feature. Tests run in a dedicated PostgreSQL schema, not the application's public data.
