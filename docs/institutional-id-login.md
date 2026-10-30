# School-issued IDs only

Student ID and Teacher ID mean school-issued account codes, not the numeric
`users.id` primary key. `users.institutional_id` stores the code, unique across
accounts case-insensitively. The API field is `institutionalId`; username is not
an alternate credential. Roles are determined by the server after authentication.

```json
{"requestId":"login-1","type":"LOGIN","payload":{"institutionalId":"TC4305","password":"<existing account password>"}}
```

User, registration, profile, directory, submission and monitoring projections no
longer contain username. The browser's standard `autocomplete="username"` token
and the PostgreSQL datasource's `DB_USERNAME` setting are unrelated technical
settings, not application account fields.

## Pending legacy accounts

An unassigned legacy account has NULL institutional_id. This is deliberately
allowed during migration, but cannot authenticate or issue/resume a session.
New registration requires a valid, nonblank Student ID. The teacher directory
shows unassigned accounts and its Edit action can assign the actual school code;
leaving password fields empty preserves the existing password hash. Existing
enrollments and results remain associated with the unchanged internal user ID.

Student IDs must be supplied/verified by the institution; syntax validation alone
does not prove an ID was officially issued. No old login is silently promoted to
a school ID, even if the old value happens to look numeric.

## Existing database migration

Stop old backend instances first and create a private `pg_dump -n public -F c`
backup outside the repository. Do not commit database dumps or passwords.

1. Run `server/src/main/resources/db/migrations/005_prepare_institutional_ids.sql`.
2. Insert explicitly verified assignments into `account_id_assignments`, using
   the existing numeric `user_id`, actual `institutional_id`, and `confirmed=TRUE`.
   Do not infer codes from names or primary keys. Confirm at least one active
   teacher assignment to avoid administrator lockout.
3. Run `006_apply_institutional_ids.sql` with `psql -v ON_ERROR_STOP=1`.
4. Compare account counts, password/role/active integrity, enrollment, exam,
   attempt and answer counts against the backup. Verify the teacher's ID before
   restarting the new backend and refreshing the new frontend.

Migration 006 takes a users table lock and runs in one transaction. It archives
all original identifiers in `legacy_account_identifiers`, assigns only confirmed
codes, creates the unique ID index, then drops `users.username` with RESTRICT.
Unexpected dependent views fail and roll back rather than being cascaded away.
Missing confirmed teacher mappings also fail before changing accounts. Never
run the old server or username-based tests against the migrated database.

The archive is retained for recovery/audit only; login never queries it. Do not
delete it or the private backup until deployment and ID assignments are verified.
Changing code back to an older Git commit does not roll back the database schema.

## Local application on 2026-10-30

Approved mapping: user 95 (`teacher.demo`) to Teacher ID `TC4305`. All other
accounts remain unassigned, per the owner's decision. No passwords, roles, active
flags, internal IDs or related records were changed. The schema-only account
change preserved 40 users, 4 memberships, 11 exams, 12 attempts and 18 answers.
The pre-migration dump was written to the operator's private Windows Temp folder,
not this repository; its path was supplied in the implementation handoff.

## Verification

- Full backend: 312 tests, zero failures/errors/skips, using the isolated schema
  `ezam_id_test_20261030` rather than production/public account tables.
- New regression tests reject username-only login/registration payloads, exercise
  ID login over the WebSocket router, ensure no username in responses, and verify
  an unassigned student cannot log in until assigned an ID without changing its
  password hash.
- A separate synthetic migration schema verified missing-map refusal/rollback,
  confirmed teacher assignment, NULL pending students, retained hashes/references,
  and removal of the username column.
- Frontend lint and production build passed. The new backend successfully started
  on port 8081 against the migrated local database, then the smoke-test process was
  stopped. Full browser login acceptance still requires the owner's password.

Set `DB_URL` explicitly to an isolated test schema/database before running the
integration suite. Do not run old fixtures containing username against this schema.
The two task-created test schemas were removed after verification; create a new
empty isolated schema before reusing a test-schema URL. Public data and the
pre-migration backup were retained.
