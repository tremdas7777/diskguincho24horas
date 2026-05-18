ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS utmify_notifications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS utmify_webhook_url text;