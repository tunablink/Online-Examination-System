-- Optional manual migration for deployments where schema.sql is not run automatically.
-- Run as the table owner against the application database. Does not invent keys
-- for existing exams: NULL means new attempts are denied until configured.
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS enrollment_key_hash VARCHAR(255);
