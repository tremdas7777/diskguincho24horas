import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminPasswordFromStorage } from "@/lib/adminPassword";

export const Route = createFileRoute("/admin/funil")({
  head: () => ({ meta: [{ title: "Admin · Funil — Disk Guincho" }] }),
  component: AdminFunilPage,
});

const STEP_LABELS = [
  "Origem",
  "Destino",
  "Veículo",
  "Contato",
  "Pagamento",
  "Chat",
] as const;

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function AdminFunilPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState<"today" | "yesterday" | "7d" | "30d" | "90d">(
    "7d",
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
    if (range === "today") return { fromIso: startOfDay(now).toISOString(), toIso: to };
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
        const res = await fetch("/api/admin/funil", {
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

  const total = Number(data?.total ?? 0);
  const reached = (data?.reached ?? []) as number[];
  const paid = Number(data?.paid ?? 0);

  return (
    <AdminShell
      title="Funil"
      subtitle="Conversão por etapa (origem → destino → veículo → contato → pagamento → chat)."
      active="funil"
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
          <div className="rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
            <div className="text-sm font-semibold text-text">Resumo</div>
            <div className="mt-2 grid gap-2 text-sm text-[color:var(--color-muted)] sm:grid-cols-3">
              <div>
                Total no período:{" "}
                <span className="font-semibold text-text">{total}</span>
              </div>
              <div>
                Pagos (Pix confirmado):{" "}
                <span className="font-semibold text-text">{paid}</span>
              </div>
              <div>
                Conversão final:{" "}
                <span className="font-semibold text-text">
                  {total ? pct(paid / total) : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[color:var(--color-border)]">
            <div className="bg-black/20 px-4 py-3 text-sm font-semibold text-[color:var(--color-muted)]">
              Etapas
            </div>
            <div className="divide-y divide-[color:var(--color-border)] bg-black/10">
              {STEP_LABELS.map((label, idx) => {
                const n = Number(reached[idx] ?? 0);
                const prev = idx === 0 ? total : Number(reached[idx - 1] ?? 0);
                const rate = prev ? n / prev : 0;
                const w = Math.max(0, Math.min(100, Math.round(rate * 100)));
                return (
                  <div key={label} className="px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-text">{label}</div>
                      <div className="text-sm text-[color:var(--color-muted)]">
                        <span className="font-semibold text-text">{n}</span>{" "}
                        <span className="ml-2">{prev ? pct(rate) : "—"}</span>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/25">
                      <div
                        className="h-2 rounded-full bg-[color:var(--brand)]"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-[color:var(--color-muted)]">
                      {idx === 0
                        ? "Entrada no funil"
                        : `Conversão da etapa anterior → ${label}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

