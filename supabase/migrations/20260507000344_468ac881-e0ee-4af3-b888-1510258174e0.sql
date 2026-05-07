
-- App settings table to store gateway provider config (single row, id=1)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  gateway_provider TEXT NOT NULL DEFAULT 'beehive',
  beehive_public_key TEXT,
  beehive_secret_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- No public policies: only the service role (server-side admin client) can read/write.
-- Without any policies, anon/authenticated users get zero access.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed singleton row
INSERT INTO public.app_settings (id, gateway_provider) VALUES (1, 'beehive')
ON CONFLICT (id) DO NOTHING;
