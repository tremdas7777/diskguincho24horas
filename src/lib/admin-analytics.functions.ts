import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select(
        [
          "google_ads_enabled",
          "google_ads_conversion_id",
          "google_ads_conversion_label",
          "meta_pixel_enabled",
          "meta_pixel_id",
          "utm_tracking_enabled",
          "updated_at",
        ].join(","),
      )
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      googleAdsEnabled: Boolean(data?.google_ads_enabled),
      googleAdsConversionId: (data?.google_ads_conversion_id as string | null) ?? "",
      googleAdsConversionLabel: (data?.google_ads_conversion_label as string | null) ?? "",
      metaPixelEnabled: Boolean(data?.meta_pixel_enabled),
      metaPixelId: (data?.meta_pixel_id as string | null) ?? "",
      utmTrackingEnabled: data?.utm_tracking_enabled == null ? true : Boolean(data.utm_tracking_enabled),
      updatedAt: (data?.updated_at as string | null) ?? null,
    };
  });

const SaveSchema = z.object({
  googleAdsEnabled: z.boolean().default(false),
  googleAdsConversionId: z.string().max(64).optional().default(""),
  googleAdsConversionLabel: z.string().max(128).optional().default(""),
  metaPixelEnabled: z.boolean().default(false),
  metaPixelId: z.string().max(64).optional().default(""),
  utmTrackingEnabled: z.boolean().default(true),
});

export const saveAdminAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data }) => {
    const update: Record<string, unknown> = {
      google_ads_enabled: data.googleAdsEnabled,
      google_ads_conversion_id: data.googleAdsConversionId.trim() || null,
      google_ads_conversion_label: data.googleAdsConversionLabel.trim() || null,
      meta_pixel_enabled: data.metaPixelEnabled,
      meta_pixel_id: data.metaPixelId.trim() || null,
      utm_tracking_enabled: data.utmTrackingEnabled,
    };
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ id: 1, ...update }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

