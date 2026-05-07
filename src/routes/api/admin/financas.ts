import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminPasswordValid } from "@/server/adminAuth.server";

export const Route = createFileRoute("/api/admin/financas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const pw = request.headers.get("x-admin-password");
        if (!isAdminPasswordValid(pw)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as any;
        const fromIso = String(body?.fromIso ?? "");
        const toIso = String(body?.toIso ?? "");

        const q = supabaseAdmin
          .from("leads")
          .select("pix_amount_cents, paid_at")
          .eq("pix_status", "paid")
          .order("paid_at", { ascending: false })
          .limit(500);
        if (fromIso) q.gte("paid_at", fromIso);
        if (toIso) q.lte("paid_at", toIso);

        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const rows = data ?? [];
        const count = rows.length;
        const totalCents = rows.reduce(
          (acc: number, r: any) => acc + (Number(r.pix_amount_cents) || 0),
          0,
        );
        const avgCents = count ? Math.round(totalCents / count) : 0;

        return Response.json({ count, totalCents, avgCents });
      },
    },
  },
});

