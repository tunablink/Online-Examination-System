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

-- ============================================================
-- Bảng exams
-- ============================================================
CREATE TABLE IF NOT EXISTS exams (
    id               BIGINT GENERATED ALWAYS AS IDENTITY,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    duration_minutes INT          NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    created_by       BIGINT       NOT NULL,

    created_at       TIMESTAMP WITH TIME ZONE
                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE
                         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_exams
        PRIMARY KEY (id),

    CONSTRAINT fk_exams_created_by
        FOREIGN KEY (created_by) REFERENCES users(id),

    CONSTRAINT ck_exams_title_not_blank
        CHECK (BTRIM(title) <> ''),

    CONSTRAINT ck_exams_duration_positive
        CHECK (duration_minutes > 0),

    CONSTRAINT ck_exams_status
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED'))
);

CREATE INDEX IF NOT EXISTS idx_exams_created_by
    ON exams (created_by);

-- ============================================================
-- Bảng questions
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY,
    exam_id       BIGINT  NOT NULL,
    content       TEXT    NOT NULL,
    points        INT     NOT NULL,
    display_order INT     NOT NULL DEFAULT 0,

    created_at    TIMESTAMP WITH TIME ZONE
                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE
                      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_questions
        PRIMARY KEY (id),

    CONSTRAINT fk_questions_exam_id
        FOREIGN KEY (exam_id) REFERENCES exams(id),

    CONSTRAINT ck_questions_content_not_blank
        CHECK (BTRIM(content) <> ''),

    CONSTRAINT ck_questions_points_positive
        CHECK (points > 0),

    CONSTRAINT ck_questions_display_order_non_negative
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_questions_exam_id
    ON questions (exam_id);

-- ============================================================
-- Bảng choices
-- ============================================================
CREATE TABLE IF NOT EXISTS choices (
    id            BIGINT   GENERATED ALWAYS AS IDENTITY,
    question_id   BIGINT   NOT NULL,
    content       TEXT     NOT NULL,
    correct       BOOLEAN  NOT NULL DEFAULT FALSE,
    display_order INT      NOT NULL DEFAULT 0,

    CONSTRAINT pk_choices
        PRIMARY KEY (id),

    CONSTRAINT fk_choices_question_id
        FOREIGN KEY (question_id) REFERENCES questions(id),

    CONSTRAINT ck_choices_content_not_blank
        CHECK (BTRIM(content) <> ''),

    CONSTRAINT ck_choices_display_order_non_negative
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_choices_question_id
    ON choices (question_id);