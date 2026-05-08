type UTMifyEvent =
  | {
      type: "pix_created";
      transactionHash: string;
      amountCents: number;
      title: string;
      offerHash: string;
      productHash: string;
      customerEmail: string;
      customerPhone: string;
      at: string;
    }
  | {
      type: "pix_paid";
      transactionHash: string;
      status: string;
      amountCents?: number;
      paidAt?: string | null;
      at: string;
    };

function getEnv(name: string) {
  return (process.env[name] ?? "").trim();
}

let _cache: { at: number; enabled: boolean; url: string } | null = null;

async function getWebhookConfig(): Promise<{ enabled: boolean; url: string }> {
  const envUrl = getEnv("UTMIFY_WEBHOOK_URL");
  const envEnabled = getEnv("UTMIFY_NOTIFICATIONS_ENABLED");
  if (envUrl) {
    return {
      enabled: envEnabled ? envEnabled !== "0" && envEnabled !== "false" : true,
      url: envUrl,
    };
  }

  // Fallback: lê do banco (app_settings) — cache curto para não bater no DB toda hora.
  if (_cache && Date.now() - _cache.at < 60_000) {
    return { enabled: _cache.enabled, url: _cache.url };
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("utmify_webhook_url, utmify_notifications_enabled")
      .eq("id", 1)
      .maybeSingle();
    const url = String((data as any)?.utmify_webhook_url ?? "").trim();
    const enabled = Boolean((data as any)?.utmify_notifications_enabled);
    _cache = { at: Date.now(), enabled, url };
    return { enabled, url };
  } catch {
    _cache = { at: Date.now(), enabled: false, url: "" };
    return { enabled: false, url: "" };
  }
}

/**
 * Envia evento para UTMify via webhook (não expõe token no client).
 *
 * Env:
 * - UTMIFY_TOKEN (Bearer)
 * - UTMIFY_WEBHOOK_URL (URL completa)
 */
export async function utmifyNotify(event: UTMifyEvent): Promise<void> {
  const token = getEnv("UTMIFY_TOKEN");
  const { enabled, url } = await getWebhookConfig();
  if (!token || !url || !enabled) return; // noop se não configurado

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    });
  } catch {
    // ignore: não queremos quebrar o Pix por falha de notificação
  }
}

