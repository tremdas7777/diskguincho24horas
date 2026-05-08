import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminPasswordValid } from "@/server/adminAuth.server";

export const Route = createFileRoute("/api/admin/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const pw = request.headers.get("x-admin-password");
        if (!isAdminPasswordValid(pw)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        try {
          const body = (await request.json().catch(() => null)) as any;
          const fromIso = String(body?.fromIso ?? "");
          const toIso = String(body?.toIso ?? "");
          const limit = Math.max(
            10,
            Math.min(500, Number(body?.limit ?? 200) || 200),
          );

          const q = supabaseAdmin
            .from("leads")
            .select(
              [
                "id",
                "lead_key",
                "first_seen_at",
                "last_seen_at",
                "current_step",
                "name",
                "phone",
                "origin_city",
                "origin_state",
                "dest_city",
                "dest_state",
                "utm_source",
                "utm_campaign",
                "pix_status",
                "pix_amount_cents",
                "created_at",
                "updated_at",
              ].join(","),
            )
            .neq("pix_status", "paid")
            .not("phone", "is", null)
            .order("last_seen_at", { ascending: false })
            .limit(limit);

          if (fromIso) q.gte("last_seen_at", fromIso);
          if (toIso) q.lte("last_seen_at", toIso);

          const { data, error } = await q;
          if (error) return Response.json({ error: error.message }, { status: 500 });
          return Response.json({ rows: data ?? [] });
        } catch (e: any) {
          return Response.json(
            { error: e?.message ?? "Falha no servidor (admin/leads)" },
            { status: 500 },
          );
        }
      },
    },
  },
});

