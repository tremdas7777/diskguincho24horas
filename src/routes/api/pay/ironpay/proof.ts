import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pay/ironpay/proof")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as any;

          const fileName = String(body?.fileName ?? "").slice(0, 180);
          const mimeType = String(body?.mimeType ?? "").slice(0, 120);
          const base64 = String(body?.base64 ?? "");
          const pixUrl = String(body?.pixUrl ?? "").slice(0, 600);
          const title = String(body?.title ?? "").slice(0, 200);
          const amountLabel = String(body?.amountLabel ?? "").slice(0, 120);

          if (!fileName || !base64) {
            return new Response(JSON.stringify({ ok: false, error: "invalid" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Minimal validation: block overly large payloads (~6MB base64 ≈ 8MB text)
          if (base64.length > 9_000_000) {
            return new Response(JSON.stringify({ ok: false, error: "too_large" }), {
              status: 413,
              headers: { "Content-Type": "application/json" },
            });
          }

          // For now we only accept and acknowledge; persistence/inbox can be added later.
          // Some platforms surface these logs in the dashboard.
          console.log("[pix-proof] received", {
            fileName,
            mimeType,
            bytesApprox: Math.round((base64.length * 3) / 4),
            pixUrl,
            title,
            amountLabel,
          });

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "bad_request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

