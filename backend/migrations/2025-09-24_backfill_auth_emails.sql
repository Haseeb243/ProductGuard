BEGIN;

-- Backfill missing emails in auth table using username-based placeholders
-- Safe because username is unique; email unique index is partial (only when not null)
UPDATE public.auth
SET email = username || '@example.com'
WHERE email IS NULL AND username IS NOT NULL;

COMMIT;
