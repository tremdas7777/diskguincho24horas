import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminPasswordValid } from "@/server/adminAuth.server";

export const Route = createFileRoute("/api/admin/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const pw = request.headers.get("x-admin-password");
        if (!isAdminPasswordValid(pw)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

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
        if (error) return Response.json({ error: error.message }, { status: 500 });
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
          updatedAt: (data?.updated_at as string | null) ?? null,
        });
      },
      POST: async ({ request }) => {
        const pw = request.headers.get("x-admin-password");
        if (!isAdminPasswordValid(pw)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as any;
        const update: Record<string, unknown> = {
          google_ads_enabled: Boolean(body?.googleAdsEnabled),
          google_ads_conversion_id: String(body?.googleAdsConversionId ?? "").trim() || null,
          google_ads_conversion_label:
            String(body?.googleAdsConversionLabel ?? "").trim() || null,
          meta_pixel_enabled: Boolean(body?.metaPixelEnabled),
          meta_pixel_id: String(body?.metaPixelId ?? "").trim() || null,
          utm_tracking_enabled: body?.utmTrackingEnabled == null ? true : Boolean(body.utmTrackingEnabled),
        };

        const { error } = await supabaseAdmin
          .from("app_settings")
          .upsert({ id: 1, ...update }, { onConflict: "id" });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});

