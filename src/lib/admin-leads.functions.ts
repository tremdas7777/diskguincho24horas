import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  fromIso: z.string().optional().default(""),
  toIso: z.string().optional().default(""),
  limit: z.number().int().min(10).max(500).optional().default(200),
});

export const getAdminLeadsNotPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
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
      .limit(data.limit);

    if (data.fromIso) q.gte("last_seen_at", data.fromIso);
    if (data.toIso) q.lte("last_seen_at", data.toIso);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

