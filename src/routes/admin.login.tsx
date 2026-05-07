import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { setAdminPasswordInStorage, getAdminPasswordFromStorage } from "@/lib/adminPassword";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin · Login — Disk Guincho" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const saved = getAdminPasswordFromStorage();
    if (saved) navigate({ to: "/admin/leads" });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json().catch(() => null)) as any;
    setBusy(false);
    if (!res.ok || !data?.ok) {
      setErr("Senha inválida.");
      return;
    }
    setAdminPasswordInStorage(password);
    navigate({ to: "/admin/leads" });
  }

  return (
    <main className="app-bg min-h-screen px-4 py-10 text-[color:var(--color-text)]">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]/90 p-6 shadow-soft">
        <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-2)]">Admin</div>
        <h1 className="mt-1 text-xl font-semibold">Entrar no painel</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">Digite a senha do painel.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <label className="grid gap-1">
            <div className="text-sm font-semibold">Senha</div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-2xl border border-white/20 bg-black/55 px-4 outline-none placeholder:text-white/55"
              placeholder="••••••••"
            />
          </label>

          {err ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-2xl bg-[color:var(--brand)] text-base font-semibold text-white hover:bg-[rgba(var(--brand-rgb),0.90)] disabled:opacity-60"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-[color:var(--color-muted)]">
          <Link to="/" className="hover:underline">← Voltar ao site</Link>
        </div>
      </div>
    </main>
  );
}