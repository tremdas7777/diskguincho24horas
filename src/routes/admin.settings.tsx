import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSettings, saveAdminSettings } from "@/server/admin-settings.functions";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin · Configurações — Disk Guincho" }] }),
  component: AdminSettingsPage,
});

type Settings = {
  gatewayProvider: string;
  beehivePublicKey: string;
  hasBeehiveSecretKey: boolean;
  updatedAt: string | null;
};

function AdminSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [gatewayProvider, setGatewayProvider] = useState("beehive");
  const [beehivePublicKey, setBeehivePublicKey] = useState("");
  const [beehiveSecretKey, setBeehiveSecretKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/admin/login" });
        return;
      }
      try {
        const s = (await getAdminSettings()) as Settings;
        if (!active) return;
        setSettings(s);
        setGatewayProvider(s.gatewayProvider);
        setBeehivePublicKey(s.beehivePublicKey);
      } catch (e: any) {
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
    setErr(null);
    try {
      await saveAdminSettings({
        data: { gatewayProvider, beehivePublicKey, beehiveSecretKey },
      });
      setSavedAt(Date.now());
      setBeehiveSecretKey("");
      const s = (await getAdminSettings()) as Settings;
      setSettings(s);
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function onLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  return (
    <main className="app-bg min-h-screen px-4 py-10 text-[color:var(--color-text)]">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]/90 p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-yellow-400">Admin</div>
            <h1 className="mt-1 text-xl font-semibold">Configurações</h1>
            <p className="mt-2 text-sm text-[color:var(--color-muted)]">
              Coloque as chaves do gateway aqui. (Se deixar em branco, mantém o valor atual.)
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="h-10 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 text-sm font-semibold leading-10 hover:bg-white/5"
            >
              Site
            </Link>
            <button
              onClick={onLogout}
              className="h-10 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 text-sm font-semibold hover:bg-white/5"
            >
              Sair
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-[color:var(--color-border)] bg-black/20 px-4 py-3 text-sm text-[color:var(--color-muted)]">
            Carregando…
          </div>
        ) : (
          <form onSubmit={onSave} className="mt-6 grid gap-4">
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

            <label className="grid gap-1">
              <div className="text-sm font-semibold">Gateway</div>
              <select
                value={gatewayProvider}
                onChange={(e) => setGatewayProvider(e.target.value)}
                className="h-12 rounded-2xl border border-white/20 bg-black/55 px-4 outline-none"
              >
                <option value="beehive">Beehive</option>
                <option value="custom">Custom (futuro)</option>
              </select>
            </label>

            <div className="grid gap-3 rounded-3xl border border-[color:var(--color-border)] bg-black/10 p-4">
              <div className="text-sm font-semibold">Beehive</div>
              <div className="text-xs text-[color:var(--color-muted)]">
                Dica: cole a chave secreta aqui só quando quiser trocar. A chave atual não é exibida por segurança.
              </div>

              <label className="grid gap-1">
                <div className="text-sm font-semibold">Chave pública (opcional)</div>
                <input
                  value={beehivePublicKey}
                  onChange={(e) => setBeehivePublicKey(e.target.value)}
                  className="h-12 rounded-2xl border border-white/20 bg-black/55 px-4 outline-none placeholder:text-white/55"
                  placeholder="pk_..."
                />
              </label>

              <label className="grid gap-1">
                <div className="text-sm font-semibold">Chave secreta</div>
                <input
                  type="password"
                  value={beehiveSecretKey}
                  onChange={(e) => setBeehiveSecretKey(e.target.value)}
                  className="h-12 rounded-2xl border border-white/20 bg-black/55 px-4 outline-none placeholder:text-white/55"
                  placeholder={settings?.hasBeehiveSecretKey ? "•••••••• (já configurada)" : "sk_..."}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="h-12 rounded-2xl bg-yellow-500 text-base font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}