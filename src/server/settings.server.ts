import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getAppSettings() {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return data ?? null;
}

export async function getBeehiveSecretKey(): Promise<string | null> {
  const s = await getAppSettings();
  const fromDb = s?.beehive_secret_key?.trim();
  if (fromDb) return fromDb;
  const fromEnv = (process.env.BEEHIVE_SECRET_KEY ?? "").trim();
  return fromEnv || null;
}