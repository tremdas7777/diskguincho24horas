import { createFileRoute } from "@tanstack/react-router";

type Body = {
  title: string;
  amountCents: number;
};

/**
 * IronPay (API Pública) - gera link de pagamento PIX.
 *
 * Configuração via variáveis de ambiente:
 * - IRONPAY_API_TOKEN: token da API
 * - IRONPAY_OFFER_HASH: hash/id da oferta (ex: "tlvh7fvagm")
 * - IRONPAY_POSTBACK_URL: (opcional) URL para receber status
 */
export const Route = createFileRoute("/api/pay/ironpay/pix-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // IMPORTANTE: fallback hardcoded (não recomendado) solicitado pelo usuário.
        const apiToken =
          (process.env.IRONPAY_API_TOKEN ?? "").trim() ||
          "RUOkOpSr6bO7jIo6yAJkqKG7ASU2tXoEtpvJQnmaf8eX4uuEIK27vdOreVHv";
        const offerHash =
          (process.env.IRONPAY_OFFER_HASH ?? "").trim() || "tlvh7fvagm";
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

        const url = new URL(
          "https://api.ironpayapp.com.br/api/public/v1/transactions",
        );
        // Doc: autenticação via parâmetro api_token
        url.searchParams.set("api_token", apiToken);

        // A IronPay costuma exigir cart/customer e campos como product_hash/operation_type.
        const payload: Record<string, unknown> = {
          // compat: algumas contas usam product_hash em vez de offer_hash
          offer_hash: offerHash,
          product_hash: offerHash,
          operation_type: "sale",
          payment_method: "pix",
          amount: Math.round(amountCents),
          title,
          name: title,
          cart: [
            {
              offer_hash: offerHash,
              product_hash: offerHash,
              quantity: 1,
              price: Math.round(amountCents),
            },
          ],
          customer: {
            name: "Cliente Disk Guincho",
            email: "cliente@diskguincho.com.br",
          },
        };
        if (postbackUrl) payload.postback_url = postbackUrl;

        // IMPORTANT: A IronPay pode não aceitar JSON corretamente; enviar como form-urlencoded.
        const form = new URLSearchParams();
        for (const [k, v] of Object.entries(payload)) {
          if (v == null) continue;
          // nested objects/arrays handled below
          if (typeof v === "object") continue;
          form.set(k, String(v));
        }
        // cart[0][...]
        const cart0 = (payload.cart as any)?.[0] ?? {};
        form.set("cart[0][offer_hash]", String(cart0.offer_hash ?? offerHash));
        if (cart0.product_hash) form.set("cart[0][product_hash]", String(cart0.product_hash));
        form.set("cart[0][quantity]", String(cart0.quantity ?? 1));
        form.set("cart[0][price]", String(cart0.price ?? Math.round(amountCents)));
        // customer[...]
        const cust = (payload.customer as any) ?? {};
        form.set("customer[name]", String(cust.name ?? "Cliente"));
        form.set("customer[email]", String(cust.email ?? "cliente@diskguincho.com.br"));

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: form.toString(),
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

