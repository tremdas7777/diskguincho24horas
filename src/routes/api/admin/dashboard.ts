import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminPasswordValid } from "@/server/adminAuth.server";

export const Route = createFileRoute("/api/admin/dashboard")({
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

        // Pull up to 2k rows for aggregation in-app (keeps implementation simple).
        const q = supabaseAdmin
          .from("leads")
          .select("pix_status, pix_amount_cents, paid_at, first_seen_at")
          .order("first_seen_at", { ascending: false })
          .limit(2000);
        if (fromIso) q.gte("first_seen_at", fromIso);
        if (toIso) q.lte("first_seen_at", toIso);

        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const rows = data ?? [];
        const totalPedidos = rows.length;

        const approved = rows.filter((r: any) => r.pix_status === "paid");
        const pending = rows.filter(
          (r: any) => r.pix_status === "created" || r.pix_status === "pending",
        );
        const cancelled = rows.filter((r: any) => r.pix_status === "failed");

        const receitaAprovadaCents = approved.reduce(
          (acc: number, r: any) => acc + (Number(r.pix_amount_cents) || 0),
          0,
        );
        const ticketMedioCents = approved.length
          ? Math.round(receitaAprovadaCents / approved.length)
          : 0;
        const denom = approved.length + cancelled.length;
        const taxaAprovacao = denom ? approved.length / denom : 0;

        // Sales per hour (paid)
        const byHour = new Array(24).fill(0) as number[];
        for (const r of approved) {
          if (!r.paid_at) continue;
          const d = new Date(String(r.paid_at));
          const h = d.getHours();
          if (Number.isFinite(h) && h >= 0 && h <= 23) byHour[h] += 1;
        }

        return Response.json({
          totalPedidos,
          receitaAprovadaCents,
          ticketMedioCents,
          taxaAprovacao,
          aprovados: approved.length,
          pendentes: pending.length,
          cancelados: cancelled.length,
          vendasPorHora: byHour,
        });
      },
    },
  },
});

