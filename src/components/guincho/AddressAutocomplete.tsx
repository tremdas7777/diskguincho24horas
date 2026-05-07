import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { LatLng } from "@/lib/guincho/geo";
import type { NominatimFormParts } from "@/lib/guincho/nominatimParts";

function formatDistancePt(km: number | undefined) {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `≈ ${Math.round(km * 1000)} m`;
  return `≈ ${km.toFixed(1).replace(".", ",")} km`;
}

type Suggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  parts?: NominatimFormParts;
  address?: unknown;
};

/** Área visível real (recorta teclado virtual no mobile). */
function readVisualLayout(): {
  top: number;
  left: number;
  right: number;
  bottom: number;
} {
  if (typeof window === "undefined") {
    return { top: 0, left: 0, right: 0, bottom: 0 };
  }
  const vv = window.visualViewport;
  if (vv) {
    const top = vv.offsetTop;
    const left = vv.offsetLeft;
    return {
      top,
      left,
      right: left + vv.width,
      bottom: top + vv.height,
    };
  }

  return {
    top: 0,
    left: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
}

export function AddressAutocomplete({
  placeholder,
  value,
  onChange,
  bias,
  onPick,
  onPreviewCoords,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  bias?: LatLng;
  onPick: (s: {
    label: string;
    coords: LatLng;
    parts?: NominatimFormParts;
    address?: unknown;
  }) => void;
  /** Atualiza o mapa com a sugestão “em foco” (primeira, hover ou teclado). */
  onPreviewCoords?: (coords: LatLng | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const previewCbRef = useRef(onPreviewCoords);
  previewCbRef.current = onPreviewCoords;

  const canSearch = useMemo(() => value.trim().length >= 3, [value]);

  const itemsKey = useMemo(() => items.map((x) => x.id).join("|"), [items]);

  const updateDropdownGeometry = useCallback(() => {
    const el = inputWrapRef.current;
    if (!el || typeof window === "undefined") return;

    const rect = el.getBoundingClientRect();
    const vis = readVisualLayout();
    const gap = 10;
    const edgePad = 12;
    const minSpace = 190;

    const spaceBelow = vis.bottom - rect.bottom - gap;
    const spaceAbove = rect.top - vis.top - gap;

    const placeAbove =
      spaceBelow < minSpace && spaceAbove >= spaceBelow ? true : spaceAbove > spaceBelow;

    const maxHBelow = Math.max(140, spaceBelow - edgePad);
    const maxHAbove = Math.max(140, spaceAbove - edgePad);
    const maxH = Math.min(placeAbove ? maxHAbove : maxHBelow, Math.round(window.innerHeight * 0.42));

    let width = rect.width;
    let left = rect.left;
    const maxW = Math.min(vis.right - vis.left - edgePad * 2, 672);
    width = Math.min(Math.max(width, 260), maxW);
    left = rect.left + (rect.width - width) / 2;

    if (left + width > vis.right - edgePad) left = vis.right - width - edgePad;
    if (left < vis.left + edgePad) left = vis.left + edgePad;

    const top = placeAbove
      ? Math.max(vis.top + edgePad, rect.top - gap - maxH)
      : rect.bottom + gap;

    setDropdownStyle({
      position: "fixed",
      left,
      top,
      width,
      maxHeight: maxH,
      zIndex: 10050,
    });
  }, []);

  useEffect(() => {
    if (!canSearch) {
      setItems([]);
      previewCbRef.current?.(null);
      setDropdownStyle(null);
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
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setItems(data?.suggestions ?? []);
        setOpen(true);
      } catch {
        // ignore
      } finally {
        setBusy(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [bias?.lat, bias?.lng, canSearch, value]);

  useEffect(() => {
    setActiveIdx(0);
  }, [itemsKey]);

  useEffect(() => {
    const cb = previewCbRef.current;
    if (!cb) return;
    if (!items.length) {
      cb(null);
      return;
    }
    const i = Math.min(Math.max(activeIdx, 0), items.length - 1);
    const it = items[i];
    cb({ lat: it.lat, lng: it.lng });
  }, [items, activeIdx]);

  useLayoutEffect(() => {
    if (!open || !items.length) return;
    updateDropdownGeometry();
  }, [open, items.length, updateDropdownGeometry]);

  /* Reposiciona ao teclado/viewport mudar */
  useEffect(() => {
    if (!open || !items.length) return;

    const vv = window.visualViewport;
    const schedule = () => requestAnimationFrame(updateDropdownGeometry);

    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);

    return () => {
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [open, items.length, updateDropdownGeometry]);

  useEffect(() => {
    const node = listRef.current?.querySelector(`[data-ac-index="${activeIdx}"]`);
    node?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx, open, itemsKey]);

  const shown = items.slice(0, 10);

  return (
    <div className="relative isolate z-[60]">
      <div
        ref={inputWrapRef}
        className="flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-panel/95 px-3 py-2.5 shadow-sm backdrop-blur-sm"
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-9 w-full min-w-0 bg-transparent text-[15px] leading-snug text-text outline-none placeholder:text-muted touch-manipulation"
          onKeyDown={(e) => {
            if (!shown.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((a) => Math.min(shown.length - 1, a + 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((a) => Math.max(0, a - 1));
              return;
            }
            if (e.key !== "Enter") return;
            e.preventDefault();
            const choice = shown[Math.min(activeIdx, shown.length - 1)];
            if (!choice) return;
            onPick({
              label: choice.label,
              coords: { lat: choice.lat, lng: choice.lng },
              parts: choice.parts,
              address: choice.address,
            });
            previewCbRef.current?.(null);
            setOpen(false);
            setDropdownStyle(null);
          }}
          onFocus={() => {
            setOpen(true);
            inputWrapRef.current?.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
            window.requestAnimationFrame(updateDropdownGeometry);
          }}
          onBlur={() =>
            window.setTimeout(() => {
              setOpen(false);
              setDropdownStyle(null);
            }, 220)
          }
        />
        {busy ? (
          <div className="shrink-0 text-xs text-muted tabular-nums">…</div>
        ) : null}
      </div>

      {open && shown.length && dropdownStyle
        ? createPortal(
            <>
              {/* Bloqueia cliques “fantasma” no sheet atrás da lista */}
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-[10040] cursor-default bg-transparent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  setDropdownStyle(null);
                }}
              />
              <div
                className="fixed z-[10050] flex flex-col overflow-hidden rounded-2xl border border-border bg-panel/95 shadow-xl backdrop-blur-md ring-1 ring-white/10"
                style={dropdownStyle}
              >
                <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {shown.map((it, idx) => (
                    <button
                      key={it.id}
                      type="button"
                      data-ac-index={idx}
                      className={[
                        "flex w-full flex-col gap-0.5 border-b border-border/50 px-3 py-2.5 text-left transition-colors last:border-b-0",
                        idx === activeIdx ? "bg-white/[0.12]" : "hover:bg-white/[0.06]",
                      ].join(" ")}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        onPick({
                          label: it.label,
                          coords: { lat: it.lat, lng: it.lng },
                          parts: it.parts,
                          address: it.address,
                        });
                        previewCbRef.current?.(null);
                        setOpen(false);
                        setDropdownStyle(null);
                      }}
                    >
                      <span className="line-clamp-2 text-[13px] leading-snug text-text">
                        {it.label}
                      </span>
                      {formatDistancePt(it.distanceKm) ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--brand-2)]/95">
                          {idx === 0 ? "Mais perto · " : ""}
                          {formatDistancePt(it.distanceKm)}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
