import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/obrigado")({
  component: Obrigado,
});

function Obrigado() {
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

          <div className="mt-5 text-center text-lg font-semibold text-slate-900">
            Obrigado!
          </div>
          <div className="mt-2 text-center text-sm text-slate-700">
            Seu pagamento foi confirmado e o guincho já está a caminho.
            <br />
            Se precisar, use o chat com o motorista.
          </div>

          <div className="mt-6 grid gap-3">
            <Link
              to="/"
              className="block h-12 w-full rounded-2xl bg-[color:var(--brand)] text-center text-sm font-semibold leading-[48px] text-white shadow-[0_14px_34px_rgba(var(--brand-rgb),0.35)] transition hover:bg-[rgba(var(--brand-rgb),0.90)] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-[rgba(var(--brand-rgb),0.22)]"
            >
              Novo chamado
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

