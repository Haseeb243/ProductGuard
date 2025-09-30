-- Add geo location columns to product_scans for analytics
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='product_scans' AND column_name='geo_country'
  ) THEN
    ALTER TABLE public.product_scans ADD COLUMN geo_country character varying(2);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='product_scans' AND column_name='geo_city'
  ) THEN
    ALTER TABLE public.product_scans ADD COLUMN geo_city character varying(120);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_product_scans_geo_country_city'
  ) THEN
    CREATE INDEX idx_product_scans_geo_country_city ON public.product_scans (
      geo_country,
      geo_city,
      scan_time
    );
  END IF;
END $$;
