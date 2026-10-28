-- Run once as the table owner on existing development databases.
-- New databases already receive this partial index from schema.sql.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exam_attempts_active_student_exam
    ON public.exam_attempts (exam_id, student_id)
    WHERE status = 'IN_PROGRESS';

ALTER TABLE public.exam_attempts
    DROP CONSTRAINT IF EXISTS uq_exam_attempts_exam_student;

DROP INDEX IF EXISTS public.uq_exam_attempts_exam_student;

COMMIT;
