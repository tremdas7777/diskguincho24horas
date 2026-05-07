-- Leads + Finanças + Analytics settings

-- Leads (entrada no funil, abandono, pagamento)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_key TEXT UNIQUE, -- client-generated stable id (localStorage)

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_step INT NOT NULL DEFAULT 0,

  name TEXT,
  phone TEXT,

  origin_city TEXT,
  origin_state TEXT,

  dest_city TEXT,
  dest_state TEXT,

  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  pix_transaction_hash TEXT,
  pix_status TEXT NOT NULL DEFAULT 'none', -- none|created|pending|paid|failed
  pix_amount_cents INT,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_pix_status ON public.leads (pix_status);
CREATE INDEX IF NOT EXISTS idx_leads_last_seen_at ON public.leads (last_seen_at);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_pix_transaction_hash ON public.leads (pix_transaction_hash);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
-- Sem policies públicas: leitura/escrita via service role (server-side).

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Analytics + Ads settings (salvas no singleton app_settings)
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS google_ads_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_label TEXT,
  ADD COLUMN IF NOT EXISTS meta_pixel_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS utm_tracking_enabled BOOLEAN NOT NULL DEFAULT true;

