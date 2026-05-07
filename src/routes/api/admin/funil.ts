import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminPasswordValid } from "@/server/adminAuth.server";

export const Route = createFileRoute("/api/admin/funil")({
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
          .select("current_step, pix_status, first_seen_at")
          .order("first_seen_at", { ascending: false })
          .limit(5000);
        if (fromIso) q.gte("first_seen_at", fromIso);
        if (toIso) q.lte("first_seen_at", toIso);

        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const rows = data ?? [];
        // Steps 0..5 represent the funnel stages (6 steps)
        const steps = new Array(6).fill(0) as number[];
        for (const r of rows) {
          const s = Number(r.current_step);
          if (Number.isFinite(s)) {
            const idx = Math.max(0, Math.min(5, Math.floor(s)));
            // Count as having reached each step up to current_step
            for (let i = 0; i <= idx; i++) steps[i] += 1;
          }
        }

        const paid = rows.filter((r: any) => r.pix_status === "paid").length;
        const total = rows.length;

        return Response.json({
          total,
          reached: steps, // reached[i] = reached step i
          paid,
        });
      },
    },
  },
});

