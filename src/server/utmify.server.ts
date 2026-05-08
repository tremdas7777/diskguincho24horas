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

/**
 * Envia evento para UTMify via webhook (não expõe token no client).
 *
 * Env:
 * - UTMIFY_TOKEN (Bearer)
 * - UTMIFY_WEBHOOK_URL (URL completa)
 */
export async function utmifyNotify(event: UTMifyEvent): Promise<void> {
  const token = getEnv("UTMIFY_TOKEN");
  const url = getEnv("UTMIFY_WEBHOOK_URL");
  if (!token || !url) return; // noop se não configurado

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

