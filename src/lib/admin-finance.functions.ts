import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  fromIso: z.string().optional().default(""),
  toIso: z.string().optional().default(""),
});

export const getAdminFinanceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const q = supabaseAdmin
      .from("leads")
      .select("pix_amount_cents, paid_at, last_seen_at, utm_source, utm_campaign")
      .eq("pix_status", "paid")
      .order("paid_at", { ascending: false })
      .limit(500);

    if (data.fromIso) q.gte("paid_at", data.fromIso);
    if (data.toIso) q.lte("paid_at", data.toIso);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const list = rows ?? [];
    const count = list.length;
    const totalCents = list.reduce((acc, r: any) => acc + (Number(r.pix_amount_cents) || 0), 0);
    const avgCents = count ? Math.round(totalCents / count) : 0;

    return {
      count,
      totalCents,
      avgCents,
      rows: list,
    };
  });

