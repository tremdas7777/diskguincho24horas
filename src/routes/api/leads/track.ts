import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Body = {
  leadKey: string;
  currentStep?: number;
  name?: string;
  phone?: string;
  originCity?: string;
  originState?: string;
  destCity?: string;
  destState?: string;
  utm?: Partial<{
    source: string;
    medium: string;
    campaign: string;
    term: string;
    content: string;
  }>;
  pix?: Partial<{
    transactionHash: string;
    status: "none" | "created" | "pending" | "paid" | "failed";
    amountCents: number;
    paidAt: string;
  }>;
};

export const Route = createFileRoute("/api/leads/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const b = (await request.json()) as Partial<Body>;
          const leadKey = String(b.leadKey ?? "").trim();
          if (!leadKey || leadKey.length > 120) {
            return Response.json({ ok: false, error: "invalid_leadKey" }, { status: 400 });
          }

          const nowIso = new Date().toISOString();
          const update: Record<string, unknown> = {
            lead_key: leadKey,
            last_seen_at: nowIso,
          };

          if (typeof b.currentStep === "number" && Number.isFinite(b.currentStep)) {
            update.current_step = Math.max(0, Math.min(10, Math.floor(b.currentStep)));
          }
          if (typeof b.name === "string" && b.name.trim()) update.name = b.name.trim().slice(0, 120);
          if (typeof b.phone === "string" && b.phone.trim()) update.phone = b.phone.trim().slice(0, 40);

          if (typeof b.originCity === "string" && b.originCity.trim()) update.origin_city = b.originCity.trim().slice(0, 120);
          if (typeof b.originState === "string" && b.originState.trim()) update.origin_state = b.originState.trim().slice(0, 8);
          if (typeof b.destCity === "string" && b.destCity.trim()) update.dest_city = b.destCity.trim().slice(0, 120);
          if (typeof b.destState === "string" && b.destState.trim()) update.dest_state = b.destState.trim().slice(0, 8);

          if (b.utm) {
            if (typeof b.utm.source === "string") update.utm_source = b.utm.source.trim().slice(0, 120);
            if (typeof b.utm.medium === "string") update.utm_medium = b.utm.medium.trim().slice(0, 120);
            if (typeof b.utm.campaign === "string") update.utm_campaign = b.utm.campaign.trim().slice(0, 180);
            if (typeof b.utm.term === "string") update.utm_term = b.utm.term.trim().slice(0, 120);
            if (typeof b.utm.content === "string") update.utm_content = b.utm.content.trim().slice(0, 180);
          }

          if (b.pix) {
            if (typeof b.pix.transactionHash === "string" && b.pix.transactionHash.trim()) {
              update.pix_transaction_hash = b.pix.transactionHash.trim().slice(0, 180);
            }
            if (typeof b.pix.status === "string" && b.pix.status.trim()) {
              update.pix_status = b.pix.status.trim().slice(0, 32);
            }
            if (typeof b.pix.amountCents === "number" && Number.isFinite(b.pix.amountCents)) {
              update.pix_amount_cents = Math.max(0, Math.floor(b.pix.amountCents));
            }
            if (typeof b.pix.paidAt === "string" && b.pix.paidAt.trim()) {
              update.paid_at = b.pix.paidAt.trim();
            }
          }

          // Upsert by unique lead_key
          const { error } = await supabaseAdmin
            .from("leads")
            .upsert(update as never, { onConflict: "lead_key" });

          if (error) {
            return Response.json({ ok: false, error: error.message }, { status: 500 });
          }
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
        }
      },
    },
  },
});

