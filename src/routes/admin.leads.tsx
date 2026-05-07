import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminPasswordFromStorage } from "@/lib/adminPassword";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [{ title: "Admin · Leads — Disk Guincho" }] }),
  component: AdminLeadsPage,
});

function moneyBRLFromCents(cents?: number | null) {
  const v = Number(cents ?? 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtAgo(iso?: string | null) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return `${d} d`;
}

function secondsBetween(aIso?: string | null, bIso?: string | null) {
  if (!aIso || !bIso) return 0;
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 1000));
}

function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 1) return "<1 min";
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return `${h} h`;
}

function AdminLeadsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [range, setRange] = useState<"today" | "7d" | "30d">("7d");
  const [refreshKey, setRefreshKey] = useState(0);

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
        const res = await fetch("/api/admin/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-password": pw },
          body: JSON.stringify({ fromIso, toIso, limit: 200 }),
        });
        if (res.status === 401) {
          navigate({ to: "/admin/login" });
          return;
        }
        const data = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(data?.error ?? "Falha ao carregar");
        const list = (data?.rows ?? []) as any[];
        if (!active) return;
        setRows(list ?? []);
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
  }, [navigate, fromIso, toIso, refreshKey]);

  return (
    <AdminShell
      title="Leads (não finalizados)"
      subtitle="Entrou no funil e não teve pagamento Pix confirmado. Use os telefones para ligar."
      active="leads"
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

        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          className="h-10 rounded-2xl border border-[color:var(--color-border)] bg-black/10 px-4 text-sm font-semibold text-text hover:bg-white/5"
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          Carregando…
        </div>
      ) : err ? (
        <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          Nenhum lead pendente nesse período.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-3xl border border-[color:var(--color-border)]">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-black/20 text-[color:var(--color-muted)]">
                <tr>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Tempo tentando</th>
                  <th className="px-4 py-3">Última atividade</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">UTM</th>
                  <th className="px-4 py-3">Pix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)] bg-black/10">
                {rows.map((r) => {
                  const attemptSec = secondsBetween(r.first_seen_at, r.last_seen_at);
                  const origin =
                    [r.origin_city, r.origin_state].filter(Boolean).join(" - ") || "—";
                  const utm =
                    [r.utm_source, r.utm_campaign].filter(Boolean).join(" / ") || "—";
                  return (
                    <tr key={r.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-text">
                            {r.phone ?? "—"}
                          </div>
                          {r.phone ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(String(r.phone));
                                } catch {
                                  // ignore
                                }
                              }}
                              className="h-8 rounded-xl border border-[color:var(--color-border)] bg-black/20 px-3 text-xs font-semibold text-text hover:bg-white/5"
                            >
                              Copiar
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text">{r.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[color:var(--color-muted)]">
                        {typeof r.current_step === "number"
                          ? `${r.current_step + 1}/6`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-text">
                        {fmtDuration(attemptSec)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--color-muted)]">
                        {fmtAgo(r.last_seen_at)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--color-muted)]">
                        {origin}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--color-muted)]">
                        {utm}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--color-muted)]">
                        <div className="text-text font-semibold">
                          {String(r.pix_status ?? "—")}
                        </div>
                        {r.pix_amount_cents ? (
                          <div className="text-xs text-[color:var(--color-muted)]">
                            {moneyBRLFromCents(r.pix_amount_cents)}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

