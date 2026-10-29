-- No invented closing times for legacy exams. New exam UI/API requires one.
-- This field controls admission, not the deadline of an existing attempt.
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS entry_closes_at TIMESTAMP WITH TIME ZONE;
