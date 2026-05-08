import { createFileRoute } from "@tanstack/react-router";

type Body = {
  title: string;
  amountCents: number;
  /** opt_fast | opt_premium | opt_economy */
  dispatchOption?: string;
  customerName?: string;
  customerEmail?: string;
};

function resolveProductHash(
  dispatchOption: string | undefined,
  offerFallback: string,
): string {
  const key = ((dispatchOption ?? "").trim() || "opt_fast").toLowerCase();
  const fast = (process.env.IRONPAY_PRODUCT_HASH_FAST ?? "").trim();
  const premium = (process.env.IRONPAY_PRODUCT_HASH_PREMIUM ?? "").trim();
  const economy = (process.env.IRONPAY_PRODUCT_HASH_ECONOMY ?? "").trim();
  const single = (process.env.IRONPAY_PRODUCT_HASH ?? "").trim();

  let tier = "";
  if (key === "opt_premium") tier = premium;
  else if (key === "opt_economy") tier = economy;
  else if (key === "opt_fast") tier = fast;

  return tier || single || offerFallback || "";
}

/**
 * IronPay (API Pública) - gera link de pagamento PIX.
 *
 * Env (Lovable / servidor) — obrigatórios:
 * - IRONPAY_API_TOKEN
 * - IRONPAY_OFFER_HASH
 *
 * Opcionais:
 * - IRONPAY_POSTBACK_URL
 * - IRONPAY_PRODUCT_HASH (ou _FAST/_PREMIUM/_ECONOMY) — se ausente, usa o offer_hash
 * - IRONPAY_OPERATION_TYPE (default "sale")
 */
export const Route = createFileRoute("/api/pay/ironpay/pix-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiToken = (process.env.IRONPAY_API_TOKEN ?? "").trim();
        const offerHash = (process.env.IRONPAY_OFFER_HASH ?? "").trim();
        const postbackUrl = (process.env.IRONPAY_POSTBACK_URL ?? "").trim();
        const operationType =
          (process.env.IRONPAY_OPERATION_TYPE ?? "").trim() || "sale";

        if (!apiToken) {
          return Response.json(
            { error: "Missing IRONPAY_API_TOKEN" },
            { status: 500 },
          );
        }
        if (!offerHash) {
          return Response.json(
            { error: "Missing IRONPAY_OFFER_HASH" },
            { status: 500 },
          );
        }

        const body = (await request.json()) as Partial<Body>;
        const title = (body.title ?? "").trim();
        const amountCents = Number(body.amountCents);
        // IronPay exige mínimo de R$ 5,00 (500 centavos)
        if (!title || !Number.isFinite(amountCents) || amountCents < 500) {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Se não houver product_hash configurado, reutiliza o offer_hash.
        const productHash = resolveProductHash(body.dispatchOption, offerHash);

        const custName =
          (body.customerName ?? "").trim() || "Cliente Disk Guincho";
        const custEmail =
          (body.customerEmail ?? "").trim() || "cliente@diskguincho.com.br";

        const url = new URL(
          "https://api.ironpayapp.com.br/api/public/v1/transactions",
        );
        // Doc: autenticação via parâmetro api_token
        url.searchParams.set("api_token", apiToken);

        // A IronPay costuma exigir cart/customer e campos como product_hash/operation_type.
        const payload: Record<string, unknown> = {
          offer_hash: offerHash,
          product_hash: productHash,
          operation_type: operationType,
          payment_method: "pix",
          amount: Math.round(amountCents),
          title,
          name: title,
          cart: [
            {
              offer_hash: offerHash,
              product_hash: productHash,
              quantity: 1,
              price: Math.round(amountCents),
            },
          ],
          customer: {
            name: custName,
            email: custEmail,
          },
        };
        if (postbackUrl) payload.postback_url = postbackUrl;

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          return Response.json(
            { error: "IronPay API error", details: json },
            { status: 502 },
          );
        }

        // Tentamos extrair um link de pagamento em campos comuns.
        const link =
          (json?.url as string | undefined) ||
          (json?.payment_url as string | undefined) ||
          (json?.link as string | undefined) ||
          (json?.data?.url as string | undefined) ||
          (json?.data?.payment_url as string | undefined) ||
          "";

        const transactionHash =
          (json?.transaction_hash as string | undefined) ||
          (json?.hash as string | undefined) ||
          (json?.data?.transaction_hash as string | undefined) ||
          "";

        if (!link) {
          return Response.json(
            {
              error: "IronPay response missing payment link",
              details: json,
            },
            { status: 502 },
          );
        }

        return Response.json({ transactionHash, url: link, raw: json });
      },
    },
  },
});

