# Live teacher monitoring and integrity reports

## Protocol and ownership

- `GET_EXAM_MONITORING { examId, live: true }` returns the initial
  `EXAM_MONITORING` response and subscribes this WebSocket to that exam.
- `GET_TEACHER_MONITORING { live: true }` returns `TEACHER_MONITORING` with
  aggregate attempt counts, the total warning-signal count and the latest 500
  activity records across the authenticated teacher's exams.
- Sending the same command with `live: false` stops the matching subscription
  and returns a one-time snapshot. Omitting `live` requests a one-time snapshot.
- Each socket holds at most one monitoring subscription. Closing the socket
  removes it; React pages stop their subscription when leaving the page.
- Server-push snapshots have `requestId: null`; request responses retain their
  request ID. The client registers its listener before requesting the snapshot.

Teacher IDs are obtained from the authenticated session, never from the payload.
SQL projections filter by `exams.created_by`, and exam ownership is checked before
registering a subscription and before delivering each update. Student sessions
cannot read the teacher overview. An identity change or disconnect invalidates
the previous subscription.

## Commit boundary

Starting an attempt, recording an activity, and finalizing an attempt publish a
`MonitoringChanged` application event within the business transaction.
`MonitoringPushHub` listens with `@TransactionalEventListener` (after commit).
Rolled-back operations do not produce dashboard updates. The listener queries the
latest persisted snapshot rather than transmitting client-supplied event content.

Messages to the same socket are serialized, including normal responses and
pushes. One socket's send failure is logged without preventing delivery to others.
The current implementation sends bounded snapshots synchronously after commit;
it has not been load-benchmarked and is intended for the project's single-server
deployment. It is not a distributed message broker or durable event log.

## UI data

`/teacher/monitoring` loads the authenticated teacher's exam list using
`GET_TEACHER_EXAMS`. Its picker shows only PUBLISHED exams whose entry closing
time has not been reached, including upcoming exams. Draft, CLOSED and expired
exams are omitted before searching by title/course/ID. Closing is exclusive: at
exactly entryClosesAt the card disappears, with an expiry timer and focus/visibility
checks so a manual refresh is not required. Legacy exams without entryClosesAt
retain the existing no-configured-expiry policy. Published is not an online indicator.
Direct per-exam monitoring remains accessible to the owning teacher for review
and for attempts whose personal deadlines extend beyond the entry window.

`/teacher/monitoring/:examId` fetches exam metadata and the owned exam snapshot.
It subscribes before loading, accepts server pushes and reconciles every 30
seconds and on window focus. Reconnect registers a new subscription. Request
callbacks are ignored after leaving the route; switching exams remounts detail
state so another exam's rows cannot leak into the new view. A valid push received
while a request is pending takes precedence over that request's late response.
The screen shows connection state and the local time the snapshot was received,
not a fabricated server heartbeat or student-online indicator.

Attempt search covers full name, school-issued student ID and attempt ID. Status
and warning filters use the server snapshot. Active attempts sort first, then
warning count, and the table paginates locally in groups of 10. Missing school IDs
on legacy accounts remain supported. No attempts is a real empty state; malformed
responses, foreign exams, invalid URLs, disconnects and request failures have
explicit states. Sync data and retry use the same guarded request lifecycle.

Run `npm run test:monitoring` in `client` for 11 automated helper tests covering
snapshot validation, wrong-exam data, duplicate attempts, activity identities,
legacy IDs, search, sorting and filters. These are not browser end-to-end tests.

Teacher Dashboard uses real active/completed attempt counts and warning counts.
Activity Reports uses server records, student/exam identity and server timestamps.
Search, exam and severity filters apply to the latest loaded 500 records. A visible
notice explains when older records are omitted. The warning total excludes the
derived `MULTIPLE_WARNING_THRESHOLD` event to avoid counting it twice.

Severities are `INFO` and `WARNING`, matching the existing server rules. Signals
require human review; they do not establish that a student cheated. No camera or
microphone capture is used.

## Manual check with two browser sessions

1. Restart the Java server and Vite after updating source.
2. Sign in as the owning teacher in one browser profile. Open an exam's monitoring
   page and leave it open.
3. Sign in as a student in a different profile/incognito session. Start that exam.
   Its attempt should appear in the teacher view without pressing Sync.
4. Switch away from the student's examination tab, then return. Verify the warning
   count and latest signal change in the teacher view without refreshing.
5. Open Activity Reports as the teacher. Verify the same persisted signal appears;
   search/filter and inspect its description and server time.
6. Submit the student attempt or let it expire. Verify the teacher's status/count
   changes after commit.
7. Sign in as a different teacher and request the same exam. Access must be denied.
8. Leave the monitoring page, then inspect WS frames: further events must not be
   delivered for its former subscription. Request/response frames may still be
   present for the final `live: false` cleanup request.

Automated coverage checks direction contracts, routing, student/anonymous denial,
owner-only delivery, unsubscribe/identity cleanup, and actual commit versus
rollback behavior against PostgreSQL. Browser checks are still a separate gate.
