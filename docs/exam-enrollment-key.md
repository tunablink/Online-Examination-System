# Exam enrollment keys

Each exam has its own key. The key is an additional entry check, not a replacement
for student authentication or course membership.

## Teacher

- `/teacher/exams/new` requires an enrollment key. `CREATE_EXAM` validates it on
  the server as well as in the form. A key needs at least 8 characters and no more
  than 72 UTF-8 bytes. It is case-sensitive; whitespace is not silently trimmed.
- The key is stored as a BCrypt hash in `exams.enrollment_key_hash`, in the same
  transaction as draft/question creation. It is never returned by exam/catalog/
  attempt projections. Retain a secure copy to share outside this application.
- A draft's Edit form can replace the key using `UPDATE_EXAM.enrollmentKey`.
  Omitting the field or sending an empty string keeps the existing hash. Invalid
  non-empty values are rejected. Other teachers and non-draft exams cannot set it.
- Show/Hide is only for the currently typed value, not retrieval of a saved key.

## Student and server validation

`START_EXAM` accepts `{ examId, enrollmentKey }`. The server checks the published
exam, membership in its course and opening time. Before `scheduledAt`,
`EXAM_NOT_OPEN` is returned. The attempt repository reads the actual `scheduled_at`
column; it must not substitute NULL for it.

A successful key check stores `exam_attempts.enrollment_verified_at` in the same
transaction as attempt creation. Only an already-verified in-progress attempt can
resume without its key. A legacy attempt with a NULL marker must verify the key
once through `START_EXAM`; this preserves its ID, saved answers and deadline.
Otherwise valid content and a matching key are required before inserting any
attempt. A completed attempt does not exempt a new attempt.

For an already-verified attempt, only an omitted key or empty string requests a
keyless resume. If a key is supplied (including whitespace), the server validates
it rather than silently recovering the existing attempt. A wrong key returns
`INVALID_ENROLLMENT_KEY`; whitespace returns `ENROLLMENT_KEY_REQUIRED`. The entry
popup therefore cannot appear to accept a wrong key just because the student
previously started this exam. A successful resume preserves the same attempt,
answers, question order and deadline.

Direct `GET_EXAM_ATTEMPT` checks opening time, including terminal room snapshots.
Active room recovery, `SAVE_ANSWER` and manual `SUBMIT_EXAM` check opening time
and verification. Copying a room URL is not a bypass. Historical terminal results
remain available to their owner through the result/history endpoints. The trusted
deadline worker can still finalize overdue legacy attempts without authorizing
students to view/save an unverified active attempt.

The student page disables new entry without a key and before opening. A separate
Resume existing attempt button requests keyless recovery; it cannot create an
attempt or validate a legacy attempt on its own. Client clocks only improve UX;
server checks remain authoritative.

Errors: `ENROLLMENT_KEY_REQUIRED`, `INVALID_ENROLLMENT_KEY`,
`ENROLLMENT_KEY_NOT_CONFIGURED`. Missing course membership still returns
`EXAM_NOT_AVAILABLE`, even with the correct key. Recovery also requires ownership.

## Admission window versus attempt duration

Teacher creation requires `scheduledAt`, `entryClosesAt`, and `durationMinutes`.
The closing time must be later than the opening time; draft Edit updates the two
times explicitly. Both times are stored as timestamp-with-time-zone values and
returned in teacher and student exam projections. The frontend converts local
date/time input to ISO instants; the server's clock controls access.

New admission is allowed in the half-open interval
`scheduledAt <= serverNow < entryClosesAt`. At or after closing, `START_EXAM`
rejects new attempts with `EXAM_ENTRY_CLOSED`, including requests with a correct
key. The closing check is repeated after BCrypt verification, before insertion.

At closing, the student dashboard catalog excludes the exam (NULL legacy closing
times remain visible). The client also schedules a check at the nearest closing
boundary and rechecks when returning to the tab, so a displayed card disappears
without a reload. Search and Upcoming use the same filtered list. This does not
delete an exam or close its status: direct details and verified room recovery
remain available, while a new start is still rejected by the server.

An attempt's deadline remains `startedAt + durationMinutes`, never the minimum of
that value and the entry closing time. For an entry window of 09:00–10:00 and a
60-minute duration, starting at 09:50 gives a deadline of 10:50. Closing admission
does not set the exam status to CLOSED or truncate existing deadlines. A verified
in-progress attempt may still resume, save, and submit after entry closes, subject
to its own deadline and the existing ownership/course checks. A legacy attempt
without a verification marker cannot first verify its key after closing.

The student details page shows both times, disables new entry outside the window,
and leaves verified-attempt Resume separate. Browser controls are not the access
boundary: the backend enforces the same rule for direct WebSocket commands.

## Existing databases and exams

Startup schema initialization adds the nullable column without changing any
existing key or answer. A manual alternative is
`server/src/main/resources/db/migrations/002_exam_enrollment_key.sql`, followed by
`003_attempt_enrollment_verification.sql`. Startup schema initialization includes
both additions. Legacy verification markers deliberately remain NULL.
Migration `004_exam_entry_window.sql` adds nullable `exams.entry_closes_at`, also
included in startup schema initialization. Legacy NULL closing times remain
unbounded for compatibility; no end time is invented from opening plus duration.
Edit a draft or create a new scheduled exam to configure an explicit window.
Existing answers and attempt deadlines are not rewritten.

Existing exams with NULL keys reject **new** attempts; no shared/default key is
invented. Existing in-progress attempts must have a verified marker or verify a
configured key once before recovering. For a legacy draft,
set a key in Edit before publication. A legacy published exam without a key
cannot gain one through draft editing: close it and prepare a new keyed draft.
This deliberately avoids changing entry conditions on a live exam.

Internal legacy draft-creation methods may still build an unconfigured draft for
maintenance/tests; they do not bypass the new-attempt key check. Published state
alone is not proof that an old exam has a configured key.

## Verification

Verified on 2026-10-29: full backend suite **302 tests, zero failures/errors/skips**;
frontend ESLint and production build passed. The frontend key-validation helper
was also exercised with eight blank/ASCII/UTF-8 boundary cases. This is automated
verification, not a claim that browser acceptance has been completed.

Run `mvn "-Dtest=ExamEnrollmentKeyIntegrationTests,AttemptServiceIntegrationTests,AttemptMessageHandlerTests" test`
inside `server` with local database credentials. New integration fixtures use
transaction rollback. Test missing/wrong/case-changed keys, successful entry,
course membership, keyless recovery, draft replacement/ownership/status, and
the absence of raw keys/hashes from server responses. The enrollment integration
class now has 19 tests, including pre-opening access, direct room/save/submit
bypasses, one-time legacy verification, trusted deadline finalization, window
persistence/validation, rejection after closing, full duration for late entrants,
and verified resume/save/submit after admission closes. Regression coverage also
rejects a supplied wrong/case-changed/whitespace key on an already-verified
attempt, exercises wrong-key rejection through the WebSocket router, and checks
that correct-key and keyless recovery preserve the existing ID and deadline.

Manual acceptance: create a keyed exam in a course, add a student, publish; check
missing/wrong/correct keys in another browser profile. Refresh the room and verify
the same attempt/deadline/answers. Also try a different student not in the course.
Set opening and closing a few minutes apart, enter shortly before closing, and
verify that the room retains the full duration after entry closes. A different
student without an existing attempt must be rejected after that closing time.
Browser acceptance and key-guessing/load measurements are not claimed complete.

This key is not a full anti-cheating mechanism. Guess throttling/rate limiting,
HTTPS/WSS deployment and secure out-of-band sharing remain operational concerns.
