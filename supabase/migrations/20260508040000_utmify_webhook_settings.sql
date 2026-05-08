-- Add notification webhook settings (UTMify) to app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS utmify_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS utmify_notifications_enabled BOOLEAN NOT NULL DEFAULT false;

