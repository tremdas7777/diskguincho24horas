import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminPasswordFromStorage } from "@/lib/adminPassword";

export const Route = createFileRoute("/admin/financas")({
  head: () => ({ meta: [{ title: "Admin · Finanças — Disk Guincho" }] }),
  component: AdminFinancasPage,
});

function moneyBRLFromCents(cents: number) {
  const v = cents / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AdminFinancasPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<"today" | "7d" | "30d">("7d");
  const [summary, setSummary] = useState<null | {
    count: number;
    totalCents: number;
    avgCents: number;
  }>(null);

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();
    const to = now.toISOString();
    if (range === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { fromIso: start.toISOString(), toIso: to };
    }
    if (range === "30d") {
      const start = new Date(Date.now() - 30 * 86400000);
      return { fromIso: start.toISOString(), toIso: to };
    }
    const start = new Date(Date.now() - 7 * 86400000);
    return { fromIso: start.toISOString(), toIso: to };
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
        const res = await fetch("/api/admin/financas", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-password": pw },
          body: JSON.stringify({ fromIso, toIso }),
        });
        if (res.status === 401) {
          navigate({ to: "/admin/login" });
          return;
        }
        const s = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(s?.error ?? "Falha ao carregar");
        if (!active) return;
        setSummary({
          count: Number(s?.count ?? 0),
          totalCents: Number(s?.totalCents ?? 0),
          avgCents: Number(s?.avgCents ?? 0),
        });
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
      title="Finanças"
      subtitle="Resumo do que foi vendido (pagamentos Pix confirmados)."
      active="financas"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={[
                "h-10 rounded-2xl border px-4 text-sm font-semibold",
                r === range
                  ? "border-[rgba(var(--brand-rgb),0.35)] bg-[rgba(var(--brand-rgb),0.14)] text-text"
                  : "border-[color:var(--color-border)] bg-black/10 text-[color:var(--color-muted)] hover:bg-white/5 hover:text-text",
              ].join(" ")}
            >
              {r === "today" ? "Hoje" : r === "7d" ? "7 dias" : "30 dias"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          Carregando…
        </div>
      ) : err ? (
        <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : !summary ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          Sem dados.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
              Total vendido
            </div>
            <div className="mt-1 text-xl font-semibold text-text">
              {moneyBRLFromCents(summary.totalCents)}
            </div>
          </div>
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
              Vendas (pagas)
            </div>
            <div className="mt-1 text-xl font-semibold text-text">{summary.count}</div>
          </div>
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
              Ticket médio
            </div>
            <div className="mt-1 text-xl font-semibold text-text">
              {moneyBRLFromCents(summary.avgCents)}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

