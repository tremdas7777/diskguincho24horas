"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

export function PixModal({
  open,
  onClose,
  title,
  amountLabel,
  pixUrl,
  copyText,
  onPaid,
  paidFollowupHint,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  amountLabel: string;
  pixUrl: string;
  copyText: string;
  onPaid?: () => void;
  paidFollowupHint?: string;
}) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => copyText || pixUrl, [copyText, pixUrl]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
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

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-panel/95 shadow-soft backdrop-blur">
        <div className="flex items-start justify-between gap-3 border-b border-border/70 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-yellow-400">
              Pagamento Pix
            </div>
            <div className="mt-1 text-base font-semibold text-text">{title}</div>
            <div className="mt-1 text-sm text-muted">{amountLabel}</div>
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

        <div className="grid gap-3 p-4">
          <div className="grid place-items-center rounded-2xl border border-border bg-black/20 p-3">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="QR Code Pix"
                src={qr}
                className="h-[260px] w-[260px] rounded-xl bg-white p-2"
              />
            ) : (
              <div className="h-[260px] w-[260px] rounded-xl bg-white/10" />
            )}
          </div>

          <div className="rounded-2xl border border-border bg-black/15 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Copia e cola
            </div>
            <div className="mt-2 break-all text-xs text-text">{payload}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <a
              href={pixUrl}
              target="_blank"
              rel="noreferrer"
              className="h-12 rounded-2xl bg-yellow-500 text-center text-sm font-semibold leading-[48px] text-black hover:bg-yellow-400"
            >
              Abrir Pix
            </a>
          </div>

          {onPaid ? (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={onPaid}
                className="h-12 w-full rounded-2xl border border-border bg-black/20 text-sm font-semibold text-text hover:bg-white/5"
              >
                Já paguei (continuar)
              </button>
              {paidFollowupHint ? (
                <div className="text-center text-xs text-muted">
                  {paidFollowupHint}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

