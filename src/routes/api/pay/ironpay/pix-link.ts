import { createFileRoute } from "@tanstack/react-router";

type Body = {
  title: string;
  amountCents: number;
  /** opt_fast | opt_premium | opt_economy */
  dispatchOption?: string;
  customerName?: string;
  customerEmail?: string;
  /** Somente dígitos; usado em customer.phone_number */
  customerPhone?: string;
};

function resolveProductHash(
  dispatchOption: string | undefined,
  offerHash: string,
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

  return tier || single || offerHash;
}

/**
 * IronPay (API Pública) - gera Pix (copia-e-cola em pix.pix_qr_code).
 *
 * Env (Lovable / servidor):
 * - IRONPAY_API_TOKEN, IRONPAY_OFFER_HASH (obrigatórios)
 * - IRONPAY_PRODUCT_HASH[_FAST|_PREMIUM|_ECONOMY] (opcional; fallback = offer)
 * - IRONPAY_POSTBACK_URL, IRONPAY_OPERATION_TYPE (cart, default 1), IRONPAY_PLACEHOLDER_CPF
 */
export const Route = createFileRoute("/api/pay/ironpay/pix-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiToken = (process.env.IRONPAY_API_TOKEN ?? "").trim();
        const offerHash = (process.env.IRONPAY_OFFER_HASH ?? "").trim();
        const postbackUrl = (process.env.IRONPAY_POSTBACK_URL ?? "").trim();
        const placeholderCpf =
          (process.env.IRONPAY_PLACEHOLDER_CPF ?? "").replace(/\D/g, "") ||
          "12345678909";
        const cartOperationType = (() => {
          const raw = (process.env.IRONPAY_OPERATION_TYPE ?? "1").trim();
          const n = Number(raw);
          return Number.isFinite(n) ? n : 1;
        })();

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
        if (!title || !Number.isFinite(amountCents) || amountCents < 500) {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        const productHash = resolveProductHash(body.dispatchOption, offerHash);
        const custName =
          (body.customerName ?? "").trim() || "Cliente Disk Guincho";
        const custEmail =
          (body.customerEmail ?? "").trim() || "cliente@diskguincho.com.br";
        const phoneDigits =
          (body.customerPhone ?? "").replace(/\D/g, "") || "11999999999";
        const phoneBr =
          phoneDigits.replace(/^\+?55/, "").slice(-11) || "11999999999";

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
            document: placeholderCpf,
            phone_number: phoneBr,
          },
          cart: [
            {
              product_hash: productHash,
              title,
              price: amount,
              quantity: 1,
              operation_type: cartOperationType,
              tangible: false,
            },
          ],
        };
        if (postbackUrl) payload.postback_url = postbackUrl;

        function formBodyFromPayload(): string {
          const form = new URLSearchParams();
          for (const [k, v] of Object.entries(payload)) {
            if (v == null) continue;
            if (typeof v === "object") continue;
            form.set(k, String(v));
          }
          const cart0 = (payload.cart as Record<string, unknown>[])?.[0] ?? {};
          form.set(
            "cart[0][product_hash]",
            String(cart0.product_hash ?? productHash),
          );
          form.set("cart[0][title]", String(cart0.title ?? title));
          form.set(
            "cart[0][price]",
            String(cart0.price ?? amount),
          );
          form.set("cart[0][quantity]", String(cart0.quantity ?? 1));
          form.set(
            "cart[0][operation_type]",
            String(cart0.operation_type ?? cartOperationType),
          );
          form.set(
            "cart[0][tangible]",
            String(Boolean(cart0.tangible)),
          );
          const cust = (payload.customer as Record<string, string>) ?? {};
          form.set("customer[name]", String(cust.name ?? custName));
          form.set("customer[email]", String(cust.email ?? custEmail));
          form.set("customer[document]", String(cust.document ?? placeholderCpf));
          form.set(
            "customer[phone_number]",
            String(cust.phone_number ?? phoneBr),
          );
          return form.toString();
        }

        // Doc IronPay: JSON. Fallback form em 400/415/422.
        let res = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        let json = await res.json().catch(() => null);
        const retryWithForm =
          !res.ok &&
          (res.status === 400 || res.status === 415 || res.status === 422);

        if (retryWithForm) {
          res = await fetch(url.toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: formBodyFromPayload(),
          });
          json = await res.json().catch(() => null);
        }

        if (!res.ok) {
          return Response.json(
            { error: "IronPay API error", details: json },
            { status: 502 },
          );
        }

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
          raw: json,
        });
      },
    },
  },
});
