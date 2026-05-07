import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminPasswordFromStorage } from "@/lib/adminPassword";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Admin · Pixel/Ads — Disk Guincho" }] }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [utmTrackingEnabled, setUtmTrackingEnabled] = useState(true);
  const [googleAdsEnabled, setGoogleAdsEnabled] = useState(false);
  const [googleAdsConversionId, setGoogleAdsConversionId] = useState("");
  const [googleAdsConversionLabel, setGoogleAdsConversionLabel] = useState("");
  const [metaPixelEnabled, setMetaPixelEnabled] = useState(false);
  const [metaPixelId, setMetaPixelId] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const pw = getAdminPasswordFromStorage();
      if (!pw) {
        navigate({ to: "/admin/login" });
        return;
      }
      try {
        const res = await fetch("/api/admin/analytics", {
          method: "GET",
          headers: { "x-admin-password": pw },
        });
        if (res.status === 401) {
          navigate({ to: "/admin/login" });
          return;
        }
        const s = (await res.json().catch(() => null)) as any;
        if (!res.ok) throw new Error(s?.error ?? "Falha ao carregar");
        if (!active) return;
        setUtmTrackingEnabled(Boolean(s.utmTrackingEnabled));
        setGoogleAdsEnabled(Boolean(s.googleAdsEnabled));
        setGoogleAdsConversionId(String(s.googleAdsConversionId ?? ""));
        setGoogleAdsConversionLabel(String(s.googleAdsConversionLabel ?? ""));
        setMetaPixelEnabled(Boolean(s.metaPixelEnabled));
        setMetaPixelId(String(s.metaPixelId ?? ""));
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
  }, [navigate]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedAt(null);
    setErr(null);
    try {
      const pw = getAdminPasswordFromStorage();
      if (!pw) {
        navigate({ to: "/admin/login" });
        return;
      }
      const res = await fetch("/api/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({
          utmTrackingEnabled,
          googleAdsEnabled,
          googleAdsConversionId,
          googleAdsConversionLabel,
          metaPixelEnabled,
          metaPixelId,
        }),
      });
      const data = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(data?.error ?? "Falha ao salvar");
      setSavedAt(Date.now());
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Pixel / Google Ads / UTM"
      subtitle="Configure rastreamento e conversões. Recomendação: só habilitar depois de preencher os IDs."
      active="analytics"
    >
      {loading ? (
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
          Carregando…
        </div>
      ) : (
        <form onSubmit={onSave} className="grid gap-4">
          {savedAt ? (
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
              Salvo com sucesso.
            </div>
          ) : null}
          {err ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

          <div className="grid gap-2 rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">UTM tracking</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={utmTrackingEnabled}
                  onChange={(e) => setUtmTrackingEnabled(e.target.checked)}
                />
                <span className="text-[color:var(--color-muted)]">Ativo</span>
              </label>
            </div>
            <div className="text-xs text-[color:var(--color-muted)]">
              Salva `utm_source`, `utm_campaign` etc no lead para filtrar no painel.
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Google Ads (conversão Pix pago)</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={googleAdsEnabled}
                  onChange={(e) => setGoogleAdsEnabled(e.target.checked)}
                />
                <span className="text-[color:var(--color-muted)]">Ativo</span>
              </label>
            </div>
            <label className="grid gap-1">
              <div className="text-sm font-semibold">Conversion ID</div>
              <input
                value={googleAdsConversionId}
                onChange={(e) => setGoogleAdsConversionId(e.target.value)}
                className="h-12 rounded-2xl border border-white/20 bg-black/55 px-4 outline-none placeholder:text-white/55"
                placeholder="AW-123456789"
              />
            </label>
            <label className="grid gap-1">
              <div className="text-sm font-semibold">Conversion Label</div>
              <input
                value={googleAdsConversionLabel}
                onChange={(e) => setGoogleAdsConversionLabel(e.target.value)}
                className="h-12 rounded-2xl border border-white/20 bg-black/55 px-4 outline-none placeholder:text-white/55"
                placeholder="AbCdEfGhIjKlMnOpQr"
              />
            </label>
            <div className="text-xs text-[color:var(--color-muted)]">
              Quando o Pix for confirmado, disparamos o evento de conversão no navegador.
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Meta Pixel</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={metaPixelEnabled}
                  onChange={(e) => setMetaPixelEnabled(e.target.checked)}
                />
                <span className="text-[color:var(--color-muted)]">Ativo</span>
              </label>
            </div>
            <label className="grid gap-1">
              <div className="text-sm font-semibold">Pixel ID</div>
              <input
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                className="h-12 rounded-2xl border border-white/20 bg-black/55 px-4 outline-none placeholder:text-white/55"
                placeholder="123456789012345"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-2xl bg-[color:var(--brand)] text-base font-semibold text-white hover:bg-[rgba(var(--brand-rgb),0.90)] disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </form>
      )}
    </AdminShell>
  );
}

