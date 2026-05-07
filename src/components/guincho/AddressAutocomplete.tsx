"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLng } from "./geo";

type Suggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  address?: any;
};

export function AddressAutocomplete({
  placeholder,
  value,
  onChange,
  bias,
  onPick,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  bias?: LatLng;
  onPick: (s: { label: string; coords: LatLng; address?: any }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewportH, setViewportH] = useState<number>(() =>
    typeof window === "undefined" ? 0 : window.innerHeight,
  );

  const canSearch = useMemo(() => value.trim().length >= 3, [value]);

  useEffect(() => {
    if (!canSearch) {
      setItems([]);
      return;
    }

    const t = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        setBusy(true);
        const url = new URL("/api/autocomplete", window.location.origin);
        url.searchParams.set("q", value.trim());
        if (bias) {
          url.searchParams.set("lat", String(bias.lat));
          url.searchParams.set("lng", String(bias.lng));
        }
        const res = await fetch(url.toString(), {
          signal: ac.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as any;
        setItems((data?.suggestions as Suggestion[]) ?? []);
        setOpen(true);
      } catch {
        // ignore
      } finally {
        setBusy(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [bias, canSearch, value]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const onResize = () => {
      setViewportH(vv?.height ?? window.innerHeight);
      if (inputWrapRef.current) setRect(inputWrapRef.current.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onResize);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={inputWrapRef}
        className="flex items-center gap-2 rounded-2xl border border-border bg-panel/90 px-3 py-2"
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 w-full bg-transparent text-sm text-text outline-none placeholder:text-white/55"
          onFocus={() => {
            setOpen(true);
            inputWrapRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
            window.setTimeout(() => {
              if (inputWrapRef.current)
                setRect(inputWrapRef.current.getBoundingClientRect());
            }, 120);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 160)}
        />
        {busy ? <div className="text-xs text-muted">…</div> : null}
      </div>

      {open && items.length && rect
        ? createPortal(
            (() => {
              const gap = 8;
              const maxHBelow = Math.max(160, viewportH - rect.bottom - 24);
              const preferAbove = maxHBelow < 220 && rect.top > 260;
              const maxHAbove = Math.max(160, rect.top - 24);
              const maxH = preferAbove ? maxHAbove : maxHBelow;
              const top = preferAbove ? Math.max(16, rect.top - maxH - gap) : rect.bottom + gap;
              return (
                <div
                  className="fixed z-[9999] overflow-hidden rounded-2xl border border-border bg-panel/90 shadow-soft backdrop-blur"
                  style={{
                    left: rect.left,
                    top,
                    width: rect.width,
                    maxHeight: maxH,
                  }}
                >
              <div className="max-h-full overflow-y-auto">
                {items.slice(0, 8).map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    className="block w-full border-b border-border/60 px-3 py-3 text-left text-sm text-text hover:bg-white/5"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPick({
                        label: it.label,
                        coords: { lat: it.lat, lng: it.lng },
                        address: it.address,
                      });
                      setOpen(false);
                    }}
                  >
                    <div className="line-clamp-2">{it.label}</div>
                  </button>
                ))}
              </div>
                </div>
              );
            })(),
            document.body,
          )
        : null}
    </div>
  );
}

