import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Payload = {
  transaction_hash?: string;
  status?: string;
  amount?: number;
  payment_method?: string;
  paid_at?: string;
};

export const Route = createFileRoute("/api/pay/ironpay/postback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const p = (await request.json().catch(() => null)) as Payload | null;
        if (!p?.transaction_hash) {
          return Response.json({ ok: false, error: "missing_transaction_hash" }, { status: 400 });
        }

        const tx = String(p.transaction_hash).trim();
        const status = String(p.status ?? "").trim().toLowerCase();
        const amount = Number(p.amount);
        const paidAt = p.paid_at ? String(p.paid_at) : null;

        // Update lead by transaction hash
        const update: Record<string, unknown> = {
          pix_transaction_hash: tx,
          pix_status: status || "pending",
        };
        if (Number.isFinite(amount) && amount > 0) update.pix_amount_cents = Math.floor(amount);
        if (paidAt && status === "paid") update.paid_at = paidAt;

        const { error } = await supabaseAdmin
          .from("leads")
          .update(update as never)
          .eq("pix_transaction_hash", tx);

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});

