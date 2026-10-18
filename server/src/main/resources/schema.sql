CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY,

    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,

    role VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_users
        PRIMARY KEY (id),

    CONSTRAINT ck_users_username_not_blank
        CHECK (BTRIM(username) <> ''),

    CONSTRAINT ck_users_password_hash_not_blank
        CHECK (BTRIM(password_hash) <> ''),

    CONSTRAINT ck_users_full_name_not_blank
        CHECK (BTRIM(full_name) <> ''),

    CONSTRAINT ck_users_email_not_blank
        CHECK (BTRIM(email) <> ''),

    CONSTRAINT ck_users_role
        CHECK (role IN ('STUDENT', 'TEACHER'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_lower
    ON users (LOWER(username));

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
    ON users (LOWER(email));