-- Existing username-based databases must run manual identity migration 005/006
-- before this schema is initialized. Never copy legacy logins into school IDs.
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY,

    institutional_id VARCHAR(50), -- NULL only for legacy accounts awaiting an assigned school ID
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    department VARCHAR(120),

    role VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_users
        PRIMARY KEY (id),

    CONSTRAINT ck_users_institutional_id_not_blank
        CHECK (BTRIM(institutional_id) <> ''),

    CONSTRAINT ck_users_password_hash_not_blank
        CHECK (BTRIM(password_hash) <> ''),

    CONSTRAINT ck_users_full_name_not_blank
        CHECK (BTRIM(full_name) <> ''),

    CONSTRAINT ck_users_email_not_blank
        CHECK (BTRIM(email) <> ''),

    CONSTRAINT ck_users_role
        CHECK (role IN ('STUDENT', 'TEACHER'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_institutional_id_lower
    ON users (LOWER(institutional_id));

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower
    ON users (LOWER(email));

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS department VARCHAR(120);

CREATE TABLE IF NOT EXISTS courses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES users(id),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_courses_code_not_blank CHECK (BTRIM(code) <> ''),
    CONSTRAINT ck_courses_name_not_blank CHECK (BTRIM(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_teacher_code
    ON courses (teacher_id, LOWER(code));

ALTER TABLE courses ADD COLUMN IF NOT EXISTS subject VARCHAR(120);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS department VARCHAR(120);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS academic_year VARCHAR(9);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS semester VARCHAR(20);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS course_students (
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id),
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_students_student_id ON course_students (student_id);

-- ============================================================
-- Bảng exams
-- ============================================================
CREATE TABLE IF NOT EXISTS exams (
    id               BIGINT GENERATED ALWAYS AS IDENTITY,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    assessment_type  VARCHAR(60) NOT NULL DEFAULT 'Examination',
    duration_minutes INT          NOT NULL,
    scheduled_at     TIMESTAMP WITH TIME ZONE,
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

-- Existing exams remain unconfigured until their owning teacher sets a draft key.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS enrollment_key_hash VARCHAR(255);
-- Admission window only; individual attempt deadlines may extend beyond this.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS entry_closes_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_exams_created_by
    ON exams (created_by);

ALTER TABLE exams ADD COLUMN IF NOT EXISTS course_id BIGINT REFERENCES courses(id);
CREATE INDEX IF NOT EXISTS idx_exams_course_id ON exams (course_id);

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(60) NOT NULL DEFAULT 'Examination';

CREATE INDEX IF NOT EXISTS idx_exams_status_scheduled_at
    ON exams (status, scheduled_at);

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

-- ============================================================
-- Exam attempts and their stable randomized question snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_attempts (
    id          BIGINT GENERATED ALWAYS AS IDENTITY,
    exam_id     BIGINT                   NOT NULL,
    student_id  BIGINT                   NOT NULL,
    status      VARCHAR(20)              NOT NULL DEFAULT 'IN_PROGRESS',
    started_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    deadline_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    score       INT,
    max_score   INT,
    correct_answers INT,
    total_questions INT,

    CONSTRAINT pk_exam_attempts
        PRIMARY KEY (id),

    CONSTRAINT fk_exam_attempts_exam_id
        FOREIGN KEY (exam_id) REFERENCES exams(id),

    CONSTRAINT fk_exam_attempts_student_id
        FOREIGN KEY (student_id) REFERENCES users(id),

    CONSTRAINT ck_exam_attempts_status
        CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')),

    CONSTRAINT ck_exam_attempts_deadline_after_start
        CHECK (deadline_at > started_at),

    CONSTRAINT ck_exam_attempts_score_non_negative
        CHECK (score IS NULL OR score >= 0),

    CONSTRAINT ck_exam_attempts_max_score_non_negative
        CHECK (max_score IS NULL OR max_score >= 0)
);

-- Keep existing development databases compatible with the current schema.
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE;
UPDATE exam_attempts SET deadline_at = (to_jsonb(exam_attempts)->>'deadline')::timestamptz
    WHERE deadline_at IS NULL;
ALTER TABLE exam_attempts ALTER COLUMN deadline_at SET NOT NULL;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE exam_attempts ALTER COLUMN deadline DROP NOT NULL;

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS score INT;

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS max_score INT;

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS correct_answers INT;

ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS total_questions INT;

-- Never mark legacy attempts as verified without a successful key check.
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS enrollment_verified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id
    ON exam_attempts (exam_id);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_id
    ON exam_attempts (student_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_attempts_active_student_exam
    ON exam_attempts (exam_id, student_id)
    WHERE status = 'IN_PROGRESS';

CREATE INDEX IF NOT EXISTS idx_exam_attempts_active_deadline
    ON exam_attempts (deadline_at, id)
    WHERE status = 'IN_PROGRESS';

CREATE TABLE IF NOT EXISTS attempt_questions (
    attempt_id     BIGINT NOT NULL,
    question_id    BIGINT NOT NULL,
    display_order  INT    NOT NULL,
    points_snapshot INT   NOT NULL,

    CONSTRAINT pk_attempt_questions
        PRIMARY KEY (attempt_id, question_id),

    CONSTRAINT fk_attempt_questions_attempt_id
        FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,

    CONSTRAINT fk_attempt_questions_question_id
        FOREIGN KEY (question_id) REFERENCES questions(id),

    CONSTRAINT uq_attempt_questions_order
        UNIQUE (attempt_id, display_order),

    CONSTRAINT ck_attempt_questions_order_non_negative
        CHECK (display_order >= 0),

    CONSTRAINT ck_attempt_questions_points_positive
        CHECK (points_snapshot > 0)
);

ALTER TABLE attempt_questions ADD COLUMN IF NOT EXISTS points_snapshot INT;
UPDATE attempt_questions aq SET points_snapshot = q.points
    FROM questions q WHERE aq.question_id = q.id AND aq.points_snapshot IS NULL;
ALTER TABLE attempt_questions ALTER COLUMN points_snapshot SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_attempt_questions_question_id
    ON attempt_questions (question_id);

CREATE TABLE IF NOT EXISTS attempt_choices (
    attempt_id    BIGINT NOT NULL,
    question_id   BIGINT NOT NULL,
    choice_id     BIGINT NOT NULL,
    display_order INT    NOT NULL,

    CONSTRAINT pk_attempt_choices
        PRIMARY KEY (attempt_id, choice_id),

    CONSTRAINT fk_attempt_choices_attempt_question
        FOREIGN KEY (attempt_id, question_id)
        REFERENCES attempt_questions(attempt_id, question_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attempt_choices_choice_id
        FOREIGN KEY (choice_id) REFERENCES choices(id),

    CONSTRAINT uq_attempt_choices_order
        UNIQUE (attempt_id, question_id, display_order),

    CONSTRAINT ck_attempt_choices_order_non_negative
        CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_attempt_choices_choice_id
    ON attempt_choices (choice_id);

CREATE TABLE IF NOT EXISTS attempt_answers (
    attempt_id BIGINT                   NOT NULL,
    question_id BIGINT                  NOT NULL,
    choice_id  BIGINT                   NOT NULL,
    saved_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_attempt_answers
        PRIMARY KEY (attempt_id, question_id),

    CONSTRAINT fk_attempt_answers_attempt_question
        FOREIGN KEY (attempt_id, question_id)
        REFERENCES attempt_questions(attempt_id, question_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attempt_answers_choice
        FOREIGN KEY (choice_id) REFERENCES choices(id)
);

CREATE INDEX IF NOT EXISTS idx_attempt_answers_choice_id
    ON attempt_answers (choice_id);

-- ============================================================
-- Explainable monitoring signals for teacher review
-- ============================================================
CREATE TABLE IF NOT EXISTS suspicious_activities (
    id          BIGINT GENERATED ALWAYS AS IDENTITY,
    attempt_id  BIGINT                   NOT NULL,
    rule_code   VARCHAR(50)              NOT NULL,
    severity    VARCHAR(20)              NOT NULL,
    description VARCHAR(500)             NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_suspicious_activities
        PRIMARY KEY (id),

    CONSTRAINT fk_suspicious_activities_attempt
        FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,

    CONSTRAINT ck_suspicious_activities_rule
        CHECK (rule_code IN (
            'TAB_HIDDEN',
            'WINDOW_BLUR',
            'DISCONNECTED',
            'RECONNECTED',
            'MULTIPLE_WARNING_THRESHOLD'
        )),

    CONSTRAINT ck_suspicious_activities_severity
        CHECK (severity IN ('INFO', 'WARNING')),

    CONSTRAINT ck_suspicious_activities_description_not_blank
        CHECK (BTRIM(description) <> '')
);

CREATE INDEX IF NOT EXISTS idx_suspicious_activities_attempt_time
    ON suspicious_activities (attempt_id, occurred_at DESC, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_suspicious_activities_threshold
    ON suspicious_activities (attempt_id, rule_code)
    WHERE rule_code = 'MULTIPLE_WARNING_THRESHOLD';
