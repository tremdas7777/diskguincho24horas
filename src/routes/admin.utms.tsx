import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminPasswordFromStorage } from "@/lib/adminPassword";

export const Route = createFileRoute("/admin/utms")({
  head: () => ({ meta: [{ title: "Admin · UTMs — Disk Guincho" }] }),
  component: AdminUtmsPage,
});

function moneyBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type Row = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  leads: number;
  paid: number;
  revenueCents: number;
  conversionRate: number;
  ticketMedioCents: number;
};

function AdminUtmsPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<"today" | "7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Row[]>([]);

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();
    const to = now.toISOString();
    if (range === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { fromIso: start.toISOString(), toIso: to };
    }
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const from = new Date(Date.now() - days * 86400000);
    return { fromIso: from.toISOString(), toIso: to };
  }, [range]);

  useEffect(() => {
    let active = true;
    (async () => {
      const pw = getAdminPasswordFromStorage();
      if (!pw) {
        navigate({ to: "/admin/login" });
        return;
      }
      try {
        setErr(null);
        setLoading(true);
        const res = await fetch("/api/admin/utms", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-password": pw },
          body: JSON.stringify({ fromIso, toIso, limit: 3000 }),
        });
        if (res.status === 401) {
          navigate({ to: "/admin/login" });
          return;
        }
        const j = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(j?.error ?? "Falha ao carregar");
        if (!active) return;
        setItems((j?.items ?? []) as Row[]);
      } catch (e: any) {
        if (!active) return;
        setErr(e?.message ?? "Falha ao carregar");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate, fromIso, toIso]);

  return (
    <AdminShell
      title="UTMs"
      subtitle="Ranking por campanha (leads, pagamentos e receita)."
      active="utms"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "Hoje"],
              ["7d", "7d"],
              ["30d", "30d"],
              ["90d", "90d"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={[
                "h-10 rounded-2xl border px-4 text-sm font-semibold",
                id === range
                  ? "border-[rgba(var(--brand-rgb),0.35)] bg-[rgba(var(--brand-rgb),0.14)] text-text"
                  : "border-[color:var(--color-border)] bg-black/10 text-[color:var(--color-muted)] hover:bg-white/5 hover:text-text",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          Carregando…
        </div>
      ) : err ? (
        <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-[color:var(--color-border)]">
          <div className="grid grid-cols-12 gap-2 bg-black/20 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
            <div className="col-span-5">Campanha</div>
            <div className="col-span-2 text-right">Leads</div>
            <div className="col-span-2 text-right">Pagos</div>
            <div className="col-span-1 text-right">Conv.</div>
            <div className="col-span-2 text-right">Receita</div>
          </div>
          <div className="divide-y divide-[color:var(--color-border)]">
            {items.slice(0, 80).map((r, idx) => (
              <div
                key={`${r.utm_source}-${r.utm_medium}-${r.utm_campaign}-${idx}`}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm"
              >
                <div className="col-span-5 min-w-0">
                  <div className="truncate font-semibold text-text">
                    {r.utm_campaign}
                  </div>
                  <div className="truncate text-xs text-[color:var(--color-muted)]">
                    {r.utm_source} · {r.utm_medium}
                  </div>
                </div>
                <div className="col-span-2 text-right tabular-nums text-text">
                  {r.leads}
                </div>
                <div className="col-span-2 text-right tabular-nums text-text">
                  {r.paid}
                </div>
                <div className="col-span-1 text-right tabular-nums text-text">
                  {(r.conversionRate * 100).toFixed(1)}%
                </div>
                <div className="col-span-2 text-right tabular-nums text-text">
                  {moneyBRLFromCents(r.revenueCents)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

