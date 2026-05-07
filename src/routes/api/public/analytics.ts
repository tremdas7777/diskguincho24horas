import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/analytics")({
  server: {
    handlers: {
      GET: async () => {
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
            ].join(","),
          )
          .eq("id", 1)
          .maybeSingle();

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({
          googleAdsEnabled: Boolean(data?.google_ads_enabled),
          googleAdsConversionId: (data?.google_ads_conversion_id as string | null) ?? "",
          googleAdsConversionLabel:
            (data?.google_ads_conversion_label as string | null) ?? "",
          metaPixelEnabled: Boolean(data?.meta_pixel_enabled),
          metaPixelId: (data?.meta_pixel_id as string | null) ?? "",
          utmTrackingEnabled:
            data?.utm_tracking_enabled == null
              ? true
              : Boolean(data.utm_tracking_enabled),
        });
      },
    },
  },
});

