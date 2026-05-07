import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/pay/ironpay/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // IMPORTANTE: fallback hardcoded (não recomendado) solicitado pelo usuário.
        const apiToken =
          (process.env.IRONPAY_API_TOKEN ?? "").trim() ||
          "RUOkOpSr6bO7jIo6yAJkqKG7ASU2tXoEtpvJQnmaf8eX4uuEIK27vdOreVHv";

        const { searchParams } = new URL(request.url);
        const transactionHash = (searchParams.get("transactionHash") ?? "").trim();
        if (!transactionHash) {
          return Response.json({ error: "Missing transactionHash" }, { status: 400 });
        }
        if (!apiToken) {
          return Response.json({ error: "Missing IRONPAY_API_TOKEN" }, { status: 500 });
        }

        const base = "https://api.ironpayapp.com.br/api/public/v1";

        // A doc pública não lista o endpoint de consulta; tentamos padrões comuns.
        const candidates = [
          `${base}/transactions/${encodeURIComponent(transactionHash)}?api_token=${encodeURIComponent(apiToken)}`,
          `${base}/transactions?api_token=${encodeURIComponent(apiToken)}&transaction_hash=${encodeURIComponent(transactionHash)}`,
          `${base}/transactions?api_token=${encodeURIComponent(apiToken)}&hash=${encodeURIComponent(transactionHash)}`,
        ];

        let lastJson: any = null;
        let lastStatus = 502;

        for (const url of candidates) {
          const res = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
          }).catch(() => null);
          if (!res) continue;
          lastStatus = res.status;
          lastJson = await res.json().catch(() => null);
          if (!res.ok) continue;

          const statusRaw =
            (lastJson?.status as string | undefined) ||
            (lastJson?.data?.status as string | undefined) ||
            (Array.isArray(lastJson?.data) ? lastJson?.data?.[0]?.status : undefined) ||
            (Array.isArray(lastJson) ? lastJson?.[0]?.status : undefined) ||
            "";
          const status = String(statusRaw || "").toLowerCase();

          const paidStatuses = new Set([
            "paid",
            "approved",
            "confirmed",
            "success",
            "completed",
          ]);
          const unpaidStatuses = new Set([
            "pending",
            "waiting_payment",
            "waiting",
            "unpaid",
            "created",
          ]);

          const paid = paidStatuses.has(status);
          const pending = unpaidStatuses.has(status) || (!paid && Boolean(status));

          return Response.json(
            {
              transactionHash,
              status: status || null,
              paid,
              pending,
              raw: lastJson,
            },
            { status: 200 },
          );
        }

        return Response.json(
          { error: "Unable to fetch status", details: lastJson },
          { status: lastStatus || 502 },
        );
      },
    },
  },
});

