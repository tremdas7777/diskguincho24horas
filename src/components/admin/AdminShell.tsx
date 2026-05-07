import { Link, useNavigate } from "@tanstack/react-router";
import { clearAdminPasswordFromStorage } from "@/lib/adminPassword";

export function AdminShell({
  title,
  subtitle,
  active,
  children,
}: {
  title: string;
  subtitle?: string;
  active: "dashboard" | "funil" | "settings" | "leads" | "financas" | "analytics";
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  async function onLogout() {
    clearAdminPasswordFromStorage();
    navigate({ to: "/admin/login" });
  }

  const tabs: Array<{ id: typeof active; label: string; to: string }> = [
    { id: "dashboard", label: "Dashboard", to: "/admin/dashboard" },
    { id: "funil", label: "Funil", to: "/admin/funil" },
    { id: "leads", label: "Leads", to: "/admin/leads" },
    { id: "financas", label: "Finanças", to: "/admin/financas" },
    { id: "analytics", label: "Pixel/Ads", to: "/admin/analytics" },
    { id: "settings", label: "Config", to: "/admin/settings" },
  ];

  return (
    <main className="app-bg min-h-screen px-4 py-10 text-[color:var(--color-text)]">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-[color:var(--color-border)] bg-[color:var(--color-panel)]/90 p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-2)]">
              Admin
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                {subtitle}
              </p>
            ) : null}
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

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.id}
              to={t.to}
              className={[
                "h-10 rounded-2xl border px-4 text-sm font-semibold leading-10",
                t.id === active
                  ? "border-[rgba(var(--brand-rgb),0.35)] bg-[rgba(var(--brand-rgb),0.14)] text-text"
                  : "border-[color:var(--color-border)] bg-black/10 text-[color:var(--color-muted)] hover:bg-white/5 hover:text-text",
              ].join(" ")}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

