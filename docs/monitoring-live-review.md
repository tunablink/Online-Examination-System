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
