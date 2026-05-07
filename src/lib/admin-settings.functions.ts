import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("app_settings")
      .select("gateway_provider, beehive_public_key, beehive_secret_key, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      gatewayProvider: data?.gateway_provider ?? "beehive",
      beehivePublicKey: data?.beehive_public_key ?? "",
      hasBeehiveSecretKey: Boolean(data?.beehive_secret_key),
      updatedAt: data?.updated_at ?? null,
    };
  });

const SaveSchema = z.object({
  gatewayProvider: z.string().min(1).max(64),
  beehivePublicKey: z.string().max(512).optional().default(""),
  beehiveSecretKey: z.string().max(512).optional().default(""),
});

export const saveAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data }) => {
    const update: Record<string, unknown> = {
      gateway_provider: data.gatewayProvider.trim() || "beehive",
    };
    if (data.beehivePublicKey.trim()) update.beehive_public_key = data.beehivePublicKey.trim();
    if (data.beehiveSecretKey.trim()) update.beehive_secret_key = data.beehiveSecretKey.trim();

    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ id: 1, ...update }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
