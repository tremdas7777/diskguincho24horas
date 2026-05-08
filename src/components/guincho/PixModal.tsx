
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

export function PixModal({
  open,
  onClose,
  title,
  amountLabel,
  pixUrl,
  copyText,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  amountLabel: string;
  pixUrl: string;
  copyText: string;
}) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [proofFileName, setProofFileName] = useState("");
  const [proofBusy, setProofBusy] = useState<null | "encoding" | "uploading">(
    null,
  );
  const [proofOk, setProofOk] = useState(false);
  const [proofErr, setProofErr] = useState<string | null>(null);

  const payload = useMemo(() => copyText || pixUrl, [copyText, pixUrl]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setQr("");
    QRCode.toDataURL(pixUrl, { margin: 1, width: 640 })
      .then((data) => {
        if (mounted) setQr(data);
      })
      .catch(() => {
        if (mounted) setQr("");
      });
    return () => {
      mounted = false;
    };
  }, [open, pixUrl]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] grid place-items-end bg-black/65 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+16px)]"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Fechar"
        onClick={onClose}
      />

      <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-panel/95 shadow-soft backdrop-blur max-h-[calc(100vh-96px)]">
        {/* Cabeçalho fixo do Pix */}
        <div className="sticky top-0 z-10 border-b border-border/70 bg-panel/95 backdrop-blur">
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <div className="relative mt-0.5 h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-[color:var(--brand-2)] to-[color:var(--brand)] shadow-[0_8px_24px_rgba(var(--brand-rgb),0.35)] ring-2 ring-[rgba(var(--brand-rgb),0.25)]">
                <img
                  src="/images/logo-guincho.png"
                  alt="Disk Guincho"
                  className="absolute inset-0 h-full w-full object-cover object-center scale-[1.15]"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--brand-2)]">
                  Pagamento Pix
                </div>
                <div className="mt-1 text-base font-semibold text-text">{title}</div>
                <div className="mt-1 text-sm text-muted">{amountLabel}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-black/10 text-text"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Corpo rolável: garante que o cabeçalho sempre apareça no mobile */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid gap-3 p-4">
          <div className="rounded-2xl border border-border bg-black/15 p-3 text-sm text-text">
            Assim que o pagamento for <span className="font-semibold">confirmado</span>, o{" "}
            <span className="font-semibold">guincho irá se deslocar até você</span> e um{" "}
            <span className="font-semibold">chat com o motorista</span> será aberto automaticamente.
          </div>

          <div className="grid place-items-center rounded-2xl border border-border bg-black/20 p-3">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="QR Code Pix"
                src={qr}
                className="h-[260px] w-[260px] rounded-xl bg-white p-2"
              />
            ) : (
              <div className="grid h-[260px] w-[260px] place-items-center rounded-xl bg-white/10">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
                  <div className="text-sm font-semibold text-text">Gerando Pix…</div>
                  <div className="mt-1 text-xs text-muted">Aguarde alguns segundos</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-black/15 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Copia e cola
            </div>
            <div className="mt-2 break-all text-xs text-text">{payload}</div>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(payload);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                } catch {
                  // ignore
                }
              }}
              className="h-12 rounded-2xl border border-border bg-black/20 text-sm font-semibold text-text hover:bg-white/5"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>

          <div className="mt-1 rounded-2xl border border-border bg-black/15 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Pagamento não confirmou?
            </div>
            <div className="mt-1 text-xs text-muted">
              Envie o comprovante (foto ou PDF) para análise.
            </div>

            <div className="mt-3 grid gap-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="block w-full text-xs text-muted file:mr-3 file:rounded-xl file:border file:border-border file:bg-black/20 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-text"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  setProofOk(false);
                  setProofErr(null);
                  setProofFileName(f?.name ?? "");
                  if (!f) return;
                  if (f.size > 6 * 1024 * 1024) {
                    setProofErr("Arquivo muito grande (máx. 6MB).");
                    return;
                  }
                  try {
                    setProofBusy("encoding");
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                      const r = new FileReader();
                      r.onload = () =>
                        resolve(typeof r.result === "string" ? r.result : "");
                      r.onerror = () => reject(new Error("read_error"));
                      r.readAsDataURL(f);
                    });
                    const comma = dataUrl.indexOf(",");
                    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : "";
                    if (!base64) {
                      setProofErr("Não foi possível ler o arquivo.");
                      return;
                    }
                    setProofBusy("uploading");
                    const res = await fetch("/api/pay/ironpay/proof", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        pixUrl,
                        title,
                        amountLabel,
                        fileName: f.name,
                        mimeType: f.type || "application/octet-stream",
                        base64,
                      }),
                    });
                    if (!res.ok) {
                      setProofErr("Falha ao enviar comprovante. Tente novamente.");
                      return;
                    }
                    setProofOk(true);
                  } catch {
                    setProofErr("Falha ao enviar comprovante. Tente novamente.");
                  } finally {
                    setProofBusy(null);
                  }
                }}
              />

              {proofFileName ? (
                <div className="text-xs text-muted">
                  Arquivo:{" "}
                  <span className="font-semibold text-text">{proofFileName}</span>
                </div>
              ) : null}
              {proofErr ? (
                <div className="text-xs font-semibold text-red-300">{proofErr}</div>
              ) : null}
              {proofOk ? (
                <div className="text-xs font-semibold text-emerald-300">
                  Comprovante enviado. Vamos analisar e confirmar o pagamento.
                </div>
              ) : null}
              {proofBusy ? (
                <div className="text-xs text-muted">
                  {proofBusy === "encoding"
                    ? "Preparando arquivo…"
                    : "Enviando comprovante…"}
                </div>
              ) : null}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

