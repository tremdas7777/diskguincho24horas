-- Analytics fields on app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS google_ads_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_id text,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_label text,
  ADD COLUMN IF NOT EXISTS meta_pixel_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_pixel_id text,
  ADD COLUMN IF NOT EXISTS utm_tracking_enabled boolean NOT NULL DEFAULT true;

-- Leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_key text NOT NULL UNIQUE,
  name text,
  phone text,
  origin_city text,
  origin_state text,
  dest_city text,
  dest_state text,
  current_step integer NOT NULL DEFAULT 0,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  pix_transaction_hash text,
  pix_status text,
  pix_amount_cents integer,
  paid_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_pix_tx_idx ON public.leads (pix_transaction_hash);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- No public policies: all access happens server-side via service role.

DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();