import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin · Login — Disk Guincho" }] }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/settings" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate({ to: "/admin/settings" });
  }

  async function onSignUp() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/admin/settings" },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setErr("Conta criada. Verifique seu e-mail para confirmar (se exigido).");
  }

  return (
    <main className="app-bg min-h-screen px-4 py-10 text-[color:var(--color-text)]">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]/90 p-6 shadow-soft">
        <div className="text-xs font-semibold uppercase tracking-wide text-yellow-400">Admin</div>
        <h1 className="mt-1 text-xl font-semibold">Entrar no painel</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">Use seu e-mail e senha de administrador.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3">
          <label className="grid gap-1">
            <div className="text-sm font-semibold">E-mail</div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-2xl border border-white/20 bg-black/55 px-4 outline-none placeholder:text-white/55"
              placeholder="admin@empresa.com"
            />
          </label>
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
            className="h-12 rounded-2xl bg-yellow-500 text-base font-semibold text-black hover:bg-yellow-400 disabled:opacity-60"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={onSignUp}
            disabled={busy || !email || !password}
            className="h-10 rounded-2xl border border-[color:var(--color-border)] bg-black/20 text-sm hover:bg-white/5 disabled:opacity-60"
          >
            Criar conta de admin
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-[color:var(--color-muted)]">
          <Link to="/" className="hover:underline">← Voltar ao site</Link>
        </div>
      </div>
    </main>
  );
}