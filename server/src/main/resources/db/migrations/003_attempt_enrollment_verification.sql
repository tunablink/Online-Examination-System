-- NULL legacy values are intentional: those attempts must verify the key once.
-- Does not remove answers or reset a deadline.
ALTER TABLE public.exam_attempts
    ADD COLUMN IF NOT EXISTS enrollment_verified_at TIMESTAMP WITH TIME ZONE;
