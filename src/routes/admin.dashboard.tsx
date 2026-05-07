import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminPasswordFromStorage } from "@/lib/adminPassword";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin · Dashboard — Disk Guincho" }] }),
  component: AdminDashboardPage,
});

function moneyBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<"today" | "yesterday" | "7d" | "30d" | "90d">(
    "today",
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date();
    const to = now.toISOString();
    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    if (range === "today") {
      return { fromIso: startOfDay(now).toISOString(), toIso: to };
    }
    if (range === "yesterday") {
      const y = new Date(Date.now() - 86400000);
      const from = startOfDay(y);
      const end = new Date(from);
      end.setHours(23, 59, 59, 999);
      return { fromIso: from.toISOString(), toIso: end.toISOString() };
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
        const res = await fetch("/api/admin/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-password": pw },
          body: JSON.stringify({ fromIso, toIso }),
        });
        if (res.status === 401) {
          navigate({ to: "/admin/login" });
          return;
        }
        const j = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(j?.error ?? "Falha ao carregar");
        if (!active) return;
        setData(j);
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

  const vendasPorHora = (data?.vendasPorHora ?? []) as number[];
  const maxHour = Math.max(1, ...vendasPorHora);

  return (
    <AdminShell
      title="Dashboard"
      subtitle="Visão geral do funil e pagamentos (como painel de loja)."
      active="dashboard"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "Hoje"],
              ["yesterday", "Ontem"],
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
        <div className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          Carregando…
        </div>
      ) : err ? (
        <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : !data ? null : (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-4">
            <KpiCard label="Total pedidos" value={String(data.totalPedidos ?? 0)} />
            <KpiCard
              label="Receita aprovada"
              value={moneyBRLFromCents(Number(data.receitaAprovadaCents ?? 0))}
            />
            <KpiCard
              label="Ticket médio"
              value={moneyBRLFromCents(Number(data.ticketMedioCents ?? 0))}
            />
            <KpiCard
              label="Taxa aprovação"
              value={pct(Number(data.taxaAprovacao ?? 0))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <KpiMini label="Aprovados" value={String(data.aprovados ?? 0)} />
            <KpiMini label="Pendentes" value={String(data.pendentes ?? 0)} />
            <KpiMini label="Cancelados/Recusados" value={String(data.cancelados ?? 0)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
              <div className="text-sm font-semibold text-text">Vendas por hora</div>
              <div className="mt-3 grid grid-cols-24 items-end gap-1">
                {new Array(24).fill(0).map((_, i) => {
                  const v = vendasPorHora[i] ?? 0;
                  const h = Math.max(2, Math.round((v / maxHour) * 120));
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-2 rounded-full bg-[color:var(--brand)]"
                        style={{ height: `${h}px` }}
                        title={`${i}h: ${v}`}
                      />
                      <div className="text-[10px] text-[color:var(--color-muted)]">
                        {i % 6 === 0 ? i : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
              <div className="text-sm font-semibold text-text">Status dos pedidos</div>
              <div className="mt-4 grid gap-2 text-sm">
                <StatusLine label="Aprovados" value={Number(data.aprovados ?? 0)} />
                <StatusLine label="Pendentes" value={Number(data.pendentes ?? 0)} />
                <StatusLine
                  label="Cancelados/Recusados"
                  value={Number(data.cancelados ?? 0)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]/70 p-4 shadow-soft">
      <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-text">{value}</div>
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-text">{value}</div>
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3">
      <div className="font-semibold text-text">{label}</div>
      <div className="text-[color:var(--color-muted)]">{value}</div>
    </div>
  );
}

