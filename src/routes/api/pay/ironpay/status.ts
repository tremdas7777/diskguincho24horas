import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/pay/ironpay/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apiToken = (process.env.IRONPAY_API_TOKEN ?? "").trim();

        const { searchParams } = new URL(request.url);
        const transactionHash = (searchParams.get("transactionHash") ?? "").trim();
        if (!transactionHash) {
          return Response.json({ error: "Missing transactionHash" }, { status: 400 });
        }
        if (!apiToken) {
          return Response.json({ error: "Missing IRONPAY_API_TOKEN" }, { status: 500 });
        }

        // 1) First check our DB (postback-updated), more reliable than polling IronPay.
        try {
          const { data } = await supabaseAdmin
            .from("leads")
            .select("pix_status, paid_at")
            .eq("pix_transaction_hash", transactionHash)
            .maybeSingle();
          const st = String(data?.pix_status ?? "").toLowerCase();
          if (st) {
            const paid = st === "paid";
            const pending = !paid;
            return Response.json(
              {
                transactionHash,
                status: st,
                paid,
                pending,
                source: "db",
                paidAt: data?.paid_at ?? null,
              },
              { status: 200 },
            );
          }
        } catch {
          // ignore and fall back to IronPay polling
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

