-- Ensure consumer_ownership has owner_identifier column to store a more unique credential
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='consumer_ownership' AND column_name='owner_identifier'
  ) THEN
    ALTER TABLE public.consumer_ownership ADD COLUMN owner_identifier character varying(128);
  END IF;

  -- Helpful index for current owner lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_consumer_ownership_serial_acquired'
  ) THEN
    CREATE INDEX idx_consumer_ownership_serial_acquired ON public.consumer_ownership (serial_number, acquired_at);
  END IF;
END $$;