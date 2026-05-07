import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Disk Guincho 24h — Todo Brasil" },
      {
        name: "description",
        content:
          "Guincho 24h em todo Brasil — atendimento rápido e seguro. Solicite com CEP/GPS, estimativa de preço e despacho imediato.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen w-full bg-[color:var(--brand)] supports-[height:100dvh]:min-h-[100dvh]">
      <div className="mx-auto grid min-h-screen w-full max-w-xl place-items-center px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+20px)] supports-[height:100dvh]:min-h-[100dvh]">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_24px_70px_rgba(2,132,199,0.18)]">
          <div className="grid place-items-center">
            <div className="rounded-full bg-[color:var(--brand)] p-[3px] shadow-[0_10px_30px_rgba(var(--brand-rgb),0.28)]">
              <div className="relative h-[76px] w-[76px] overflow-hidden rounded-full bg-white ring-1 ring-[rgba(var(--brand-rgb),0.25)]">
                <img
                  src="/images/logo-guincho.png"
                  alt="Disk Guincho"
                  className="absolute inset-0 h-full w-full object-cover object-center scale-[1.42]"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-lg font-semibold text-slate-900">
            Disk Guincho 24h
          </div>

          <div className="mt-6">
            <Link
              to="/origem"
              className="block h-12 w-full rounded-2xl bg-[color:var(--brand)] text-center text-sm font-semibold leading-[48px] text-white shadow-[0_14px_34px_rgba(var(--brand-rgb),0.35)] transition hover:bg-[rgba(var(--brand-rgb),0.90)] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--brand-rgb),0.22)]"
            >
              Solicitar guincho
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
