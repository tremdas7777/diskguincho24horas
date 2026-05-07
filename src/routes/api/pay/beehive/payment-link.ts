import { createFileRoute } from "@tanstack/react-router";
import { getBeehiveSecretKey } from "@/server/settings.server";

type Body = { title: string; amountCents: number };

export const Route = createFileRoute("/api/pay/beehive/payment-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = await getBeehiveSecretKey();
        if (!secret) return Response.json({ error: "Missing BEEHIVE_SECRET_KEY" }, { status: 500 });

        const body = (await request.json()) as Partial<Body>;
        const title = (body.title ?? "").trim();
        const amountCents = Number(body.amountCents);
        if (!title || !Number.isFinite(amountCents) || amountCents < 100) {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        const authorization = "Basic " + Buffer.from(`${secret}:x`).toString("base64");
        const res = await fetch("https://api.conta.paybeehive.com.br/v1/payment-links", {
          method: "POST",
          headers: { authorization, "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            amount: Math.round(amountCents),
            settings: {
              defaultPaymentMethod: "credit_card",
              requestAddress: true,
              requestPhone: true,
              requestDocument: true,
              traceable: true,
              card: { enabled: true, freeInstallments: 1, maxInstallments: 12 },
              pix: { enabled: true, expiresInDays: 1 },
              boleto: { enabled: false, expiresInDays: 0 },
            },
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) return Response.json({ error: "Beehive API error", details: json }, { status: 502 });
        const url = json?.url as string | undefined;
        const id = json?.id as number | undefined;
        if (!url) return Response.json({ error: "Beehive response missing url", details: json }, { status: 502 });
        return Response.json({ id, url });
      },
    },
  },
});