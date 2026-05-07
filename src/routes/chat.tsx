import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/chat")({
  component: ChatDemo,
});

type Msg = { id: string; from: "driver" | "user"; text: string; at: number };

function ChatDemo() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<Msg[]>(() => {
    const now = Date.now();
    return [
      {
        id: `m_${now}_1`,
        from: "driver",
        text: "Olá! Sou o motorista do guincho. Já estou a caminho. Pode me confirmar um ponto de referência?",
        at: now,
      },
    ];
  });

  const canSend = text.trim().length > 0;
  const headerTime = useMemo(() => "Online", []);

  function send() {
    const msg = text.trim();
    if (!msg) return;
    const now = Date.now();
    setText("");
    setMessages((m) => [...m, { id: `m_${now}_u`, from: "user", text: msg, at: now }]);
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: `m_${Date.now()}_d`,
          from: "driver",
          text: "Perfeito, recebido. Estou chegando — qualquer coisa me avise por aqui.",
          at: Date.now(),
        },
      ]);
    }, 700);
  }

  return (
    <main className="min-h-screen w-full bg-bg supports-[height:100dvh]:min-h-[100dvh]">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+16px)] supports-[height:100dvh]:min-h-[100dvh] sm:px-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-[color:var(--brand-2)] to-[color:var(--brand)] shadow-[0_8px_24px_rgba(var(--brand-rgb),0.35)] ring-2 ring-[rgba(var(--brand-rgb),0.25)]">
              <img
                src="/images/logo-guincho.png"
                alt="Disk Guincho"
                className="absolute inset-0 h-full w-full object-cover object-center scale-[1.15]"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-text">
                Chat com o motorista
              </div>
              <div className="truncate text-xs text-muted">{headerTime}</div>
            </div>
          </div>
          <Link
            to="/"
            className="h-10 rounded-2xl border border-border bg-panel/80 px-3 text-sm font-semibold leading-10 text-text hover:bg-white/5"
          >
            Voltar
          </Link>
        </div>

        <div className="flex-1 overflow-hidden rounded-3xl border border-border bg-panel/70 shadow-soft backdrop-blur">
          <div className="flex h-full flex-col">
            <div className="border-b border-border/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-2)]">
                Chamado confirmado
              </div>
              <div className="mt-1 text-sm text-muted">
                Converse com o motorista para combinar ponto de referência.
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="grid gap-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={[
                      "max-w-[92%] rounded-2xl px-3 py-2 text-sm",
                      m.from === "user"
                        ? "ml-auto bg-[color:var(--brand)] text-white"
                        : "mr-auto border border-border bg-panel/70 text-text",
                    ].join(" ")}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/70 p-4">
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  placeholder="Digite uma mensagem…"
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  className="h-11 w-full rounded-2xl border border-border bg-panel/90 px-4 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-4 focus:ring-[rgba(var(--brand-rgb),0.22)]"
                />
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={send}
                  className="h-11 shrink-0 rounded-2xl bg-[color:var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[rgba(var(--brand-rgb),0.90)] disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

