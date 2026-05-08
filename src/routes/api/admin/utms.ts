import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminPasswordValid } from "@/server/adminAuth.server";

type Body = {
  fromIso?: string;
  toIso?: string;
  limit?: number;
};

export const Route = createFileRoute("/api/admin/utms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const pw = request.headers.get("x-admin-password");
        if (!isAdminPasswordValid(pw)) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as Body | null;
        const fromIso = String(body?.fromIso ?? "");
        const toIso = String(body?.toIso ?? "");
        const limit = Math.max(200, Math.min(5000, Number(body?.limit ?? 2000) || 2000));

        const q = supabaseAdmin
          .from("leads")
          .select(
            [
              "id",
              "first_seen_at",
              "utm_source",
              "utm_medium",
              "utm_campaign",
              "utm_content",
              "utm_term",
              "pix_status",
              "pix_amount_cents",
            ].join(","),
          )
          .order("first_seen_at", { ascending: false })
          .limit(limit);
        if (fromIso) q.gte("first_seen_at", fromIso);
        if (toIso) q.lte("first_seen_at", toIso);

        const { data, error } = await q;
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const rows = (data ?? []) as Array<any>;

        const keyOf = (r: any) => {
          const src = String(r.utm_source ?? "").trim() || "(direct)";
          const camp = String(r.utm_campaign ?? "").trim() || "(none)";
          const med = String(r.utm_medium ?? "").trim() || "(none)";
          return `${src}|||${med}|||${camp}`;
        };

        const agg = new Map<
          string,
          {
            utm_source: string;
            utm_medium: string;
            utm_campaign: string;
            leads: number;
            paid: number;
            revenueCents: number;
          }
        >();

        for (const r of rows) {
          const src = String(r.utm_source ?? "").trim() || "(direct)";
          const med = String(r.utm_medium ?? "").trim() || "(none)";
          const camp = String(r.utm_campaign ?? "").trim() || "(none)";
          const k = `${src}|||${med}|||${camp}`;
          const cur =
            agg.get(k) ??
            ({
              utm_source: src,
              utm_medium: med,
              utm_campaign: camp,
              leads: 0,
              paid: 0,
              revenueCents: 0,
            } as const);
          const isPaid = String(r.pix_status ?? "") === "paid";
          const amount = Number(r.pix_amount_cents) || 0;
          agg.set(k, {
            ...cur,
            leads: cur.leads + 1,
            paid: cur.paid + (isPaid ? 1 : 0),
            revenueCents: cur.revenueCents + (isPaid ? amount : 0),
          });
        }

        const items = Array.from(agg.values())
          .map((x) => ({
            ...x,
            conversionRate: x.leads ? x.paid / x.leads : 0,
            ticketMedioCents: x.paid ? Math.round(x.revenueCents / x.paid) : 0,
          }))
          .sort((a, b) => b.revenueCents - a.revenueCents);

        return Response.json({ items, totalRows: rows.length });
      },
    },
  },
});

