-- Run manually while preparing the verified school-ID assignment.
-- Does not modify accounts or assign any ID automatically.
BEGIN;
CREATE TABLE IF NOT EXISTS account_id_assignments (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    institutional_id VARCHAR(50) NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_account_id_assignment_format
        CHECK (institutional_id ~ '^[A-Za-z0-9._-]{3,50}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_id_assignments_lower
    ON account_id_assignments (LOWER(institutional_id));
COMMIT;
