import { createFileRoute } from "@tanstack/react-router";

type Body = {
  title: string;
  amountCents: number;
  /** opt_fast | opt_premium | opt_economy */
  dispatchOption?: string;
  customerName?: string;
  customerEmail?: string;
};

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

        const custName =
          (body.customerName ?? "").trim() || "Cliente Disk Guincho";
        const custEmail =
          (body.customerEmail ?? "").trim() || "cliente@diskguincho.com.br";

        const url = new URL(
          "https://api.ironpayapp.com.br/api/public/v1/transactions",
        );
        url.searchParams.set("api_token", apiToken);

        const amount = Math.round(amountCents);
        const payload: Record<string, unknown> = {
          offer_hash: offerHash,
          amount,
          payment_method: "pix",
          installments: 1,
          customer: {
            name: custName,
            email: custEmail,
            document: "12345678909",
            phone_number: "11999999999",
          },
          cart: [
            {
              product_hash: offerHash,
              title,
              price: amount,
              quantity: 1,
              operation_type: 1,
              tangible: false,
            },
          ],
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

        // IronPay retorna o BR Code Pix em pix.pix_qr_code (string copia-e-cola).
        const pix = (json?.pix ?? {}) as Record<string, unknown>;
        const pixCode =
          (pix.pix_qr_code as string | undefined) ||
          (pix.qr_code as string | undefined) ||
          "";
        const pixUrl =
          (pix.pix_url as string | undefined) ||
          (pix.qr_code_base64 as string | undefined) ||
          pixCode;
        const transactionHash =
          (json?.hash as string | undefined) ||
          (json?.transaction as string | undefined) ||
          "";

        if (!pixCode) {
          return Response.json(
            { error: "IronPay response missing Pix code", details: json },
            { status: 502 },
          );
        }

        return Response.json({
          transactionHash,
          url: pixUrl || pixCode,
          copyText: pixCode,
        });
      },
    },
  },
});

