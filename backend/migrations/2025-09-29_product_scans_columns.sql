-- Ensure product_scans has required columns and indexes for verification module
DO $$ BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='product_scans' AND column_name='is_suspicious'
  ) THEN
    ALTER TABLE public.product_scans ADD COLUMN is_suspicious boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='product_scans' AND column_name='suspicion_reason'
  ) THEN
    ALTER TABLE public.product_scans ADD COLUMN suspicion_reason text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='product_scans' AND column_name='scan_time'
  ) THEN
    ALTER TABLE public.product_scans ADD COLUMN scan_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='product_scans' AND column_name='ip_address'
  ) THEN
    ALTER TABLE public.product_scans ADD COLUMN ip_address character varying(64);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='product_scans' AND column_name='user_agent'
  ) THEN
    ALTER TABLE public.product_scans ADD COLUMN user_agent character varying(255);
  END IF;

  -- Create helpful indexes if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_product_scans_serial_time'
  ) THEN
    CREATE INDEX idx_product_scans_serial_time ON public.product_scans (serial_number, scan_time);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_product_scans_serial_ip_time'
  ) THEN
    CREATE INDEX idx_product_scans_serial_ip_time ON public.product_scans (serial_number, ip_address, scan_time);
  END IF;
END $$;