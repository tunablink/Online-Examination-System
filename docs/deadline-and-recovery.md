# Deadline finalization and exam-room reliability

## Behavior

The Java server owns the deadline and grades only server-saved answers. Closing
the browser does not prevent finalization. `AttemptDeadlineWorker` queries up to
100 overdue `IN_PROGRESS` attempts per pass, ordered by deadline and ID.

Each call to `ExamAttemptService.expireAttempt` has its own transaction. It locks
the attempt row, rechecks status and deadline, and uses the same grading path as
`submitExam`. A competing manual submit waits for that lock and returns the stored
result. A failed attempt is logged and retried on later passes; the rest of the
batch continues. The worker does not change the original deadline.

The worker queries PostgreSQL on each pass, so overdue attempts are discovered
again after a server restart. It does not need an in-memory timer per student.
This is bounded periodic processing, not a guarantee of finalization at the exact
deadline: a backlog or database failure can delay result availability. Saving an
answer is still rejected after the deadline, even before finalization runs.

Configuration:

```properties
exam.deadline.enabled=true
exam.deadline.interval-ms=5000
```

Both values are optional; these are the defaults. Set `exam.deadline.enabled=false`
to disable scheduled execution in isolated tests. The deadline worker remains a
bean for explicit testing, but no scheduled trigger is registered by the deadline
scheduling configuration.

The React room sends one answer save at a time, disables answer selection while
waiting, and prevents submission while that save is pending. Manual submission
opens `/student/attempts/:attemptId/result` only after a valid server response.
At zero remaining time, the room locks answers and requests attempt details every
two seconds until a terminal result arrives. These requests do not grade the exam;
the server worker does. This narrow result check is not server-push monitoring.

## Existing database upgrade

Some older databases contain `UNIQUE (exam_id, student_id)` under the name
`uq_exam_attempts_exam_student`. The current policy permits completed historical
attempts but only one `IN_PROGRESS` attempt per student/exam.

In pgAdmin, connect to the actual application database (normally `online_exam`),
check its constraints/indexes, and execute:

`server/src/main/resources/db/migrations/001_attempt_active_uniqueness.sql`

Run as the table owner. This script replaces the old uniqueness rule and does not
delete rows. It is a manual migration, not an automatically applied Flyway script.
Run only for an existing database with the known old constraint/index. Current
`schema.sql` creates the partial uniqueness and active-deadline lookup indexes on
startup; it intentionally does not drop old constraints using the application role.

## Verification

```powershell
cd server
# Set DB_PASSWORD in this terminal before running database tests.
mvn "-Dtest=AttemptServiceIntegrationTests,AttemptDeadlineWorkerTests" test
mvn test
```

The tests cover saved-answer grading after expiration, a repeated finalization,
a manual submit racing the deadline on two real database transactions, future and
already-terminal attempts, result recovery, and continuing a batch after failure.
The concurrency test commits its own fixtures so both threads can see them and
deletes only those fixtures after the threads finish. Other integration fixtures
are rolled back by Spring.

Browser checks still required:

1. Save an answer; wait for `Answer saved to server`; confirm submission. The
   result page should show the server score without a document reload.
2. Let a short exam expire. The room should disable answers and display its
   finalized result after the next worker pass and result refresh.
3. Start an exam, save an answer, and close the browser. After its deadline, sign
   in again and verify the `EXPIRED` result in student history and teacher review.
4. Stop the server before a deadline and restart after it. Verify the overdue
   attempt is finalized, retaining its original deadline and saved answers.

## Remaining scope

Tab-scoped authentication recovery after refresh/disconnect is implemented through
an opaque credential verified by the server. Java server restart still requires
sign-in again. See `session-resume.md` for credential lifetime and limitations.

Teacher submission review is integrated. Exam monitoring, teacher dashboard
metrics and activity reports use server data and receive after-commit snapshot
updates; see `monitoring-live-review.md` for subscription behavior and limitations.
Camera and microphone proctoring are outside the agreed scope. A full load
benchmark and demo verification remain separate from the focused two-transaction
concurrency regression test.
