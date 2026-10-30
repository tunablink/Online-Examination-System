-- Manual breaking migration. Stop the old server and take a pg_dump backup first.
-- Requires 005 and at least one confirmed active teacher assignment.
-- Unassigned accounts retain their data but CANNOT log in until an ID is assigned.
-- Run with psql -v ON_ERROR_STOP=1; a failure rolls back all account/schema changes.
BEGIN;
LOCK TABLE users IN ACCESS EXCLUSIVE MODE;
DO $migration$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema=current_schema() AND table_name='users' AND column_name='username') THEN
        RAISE EXCEPTION 'Legacy username column is absent. Do not rerun migration 006.';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema=current_schema() AND table_name='users' AND column_name='institutional_id') THEN
        RAISE EXCEPTION 'Mixed identity schema found. Inspect before continuing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM account_id_assignments m JOIN users u ON u.id=m.user_id
                   WHERE m.confirmed AND u.role='TEACHER' AND u.active) THEN
        RAISE EXCEPTION 'Confirm at least one active teacher school ID before migration to avoid lockout.';
    END IF;
END
$migration$;

-- Archive identifiers only, never passwords. This table is not queried by login.
-- No FK: the audit copy remains independent of future account maintenance.
CREATE TABLE legacy_account_identifiers (
    user_id BIGINT PRIMARY KEY,
    legacy_login VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO legacy_account_identifiers(user_id,legacy_login,role)
    SELECT id,username,role FROM users;
ALTER TABLE users ADD COLUMN institutional_id VARCHAR(50);
UPDATE users u SET institutional_id=m.institutional_id
    FROM account_id_assignments m WHERE m.user_id=u.id AND m.confirmed;
ALTER TABLE users ADD CONSTRAINT ck_users_institutional_id_not_blank
    CHECK (institutional_id IS NULL OR institutional_id ~ '^[A-Za-z0-9._-]{3,50}$');
CREATE UNIQUE INDEX uq_users_institutional_id_lower ON users(LOWER(institutional_id));
-- RESTRICT is deliberate: unexpected dependent views must fail, not be cascaded away.
ALTER TABLE users DROP COLUMN username;
COMMIT;
