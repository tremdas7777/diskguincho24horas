import { createFileRoute } from "@tanstack/react-router";
import { haversineKm, type LatLng } from "@/lib/guincho/geo";
import { partsFromNominatimAddress } from "@/lib/guincho/nominatimParts";

type RawNominatim = Record<string, any>;

interface Suggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
  address: any;
  parts: ReturnType<typeof partsFromNominatimAddress>;
  distanceKm?: number;
}

function mapSuggestions(data: RawNominatim[]): Suggestion[] {
  return (data ?? [])
    .map((it) => {
      const addr = (it.address ?? null) as Record<string, unknown> | null;
      return {
        id: String(it.place_id ?? it.osm_id ?? it.display_name),
        label: String(it.display_name ?? ""),
        lat: Number(it.lat),
        lng: Number(it.lon),
        address: it.address ?? null,
        parts: partsFromNominatimAddress(addr),
      };
    })
    .filter((s) => s.label && Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

function dedupeById(items: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

export const Route = createFileRoute("/api/autocomplete")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const q = (searchParams.get("q") ?? "").trim();
        const lat = Number(searchParams.get("lat"));
        const lng = Number(searchParams.get("lng"));
        if (!q || q.length < 3) return Response.json({ suggestions: [] });

        const headers = {
          "User-Agent": "DiskGuincho24h/1.0",
          Accept: "application/json",
        };

        const buildSearchUrl = (
          query: string,
          opts?: { d?: number; bounded?: boolean },
        ) => {
          const url = new URL("https://nominatim.openstreetmap.org/search");
          url.searchParams.set("format", "jsonv2");
          url.searchParams.set("addressdetails", "1");
          url.searchParams.set("namedetails", "1");
          url.searchParams.set("extratags", "1");
          url.searchParams.set("dedupe", "1");
          url.searchParams.set("limit", "18");
          url.searchParams.set("countrycodes", "br");
          url.searchParams.set("accept-language", "pt-BR");
          url.searchParams.set("q", query);
          /* Viés geográfico perto do cliente */
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const d = Math.max(0.05, Math.min(opts?.d ?? 0.35, 2)); // caixa menor por padrão
            url.searchParams.set(
              "viewbox",
              `${lng - d},${lat + d},${lng + d},${lat - d}`,
            );
            // bounded=1 limita à caixa; bounded=0 só dá viés
            url.searchParams.set("bounded", opts?.bounded ? "1" : "0");
          }
          return url;
        };

        const fetchSearch = async (
          query: string,
          opts?: { d?: number; bounded?: boolean },
        ) => {
          const res = await fetch(buildSearchUrl(query, opts).toString(), {
            headers,
          });
          if (!res.ok) {
            return { ok: false as const, status: res.status, data: [] as RawNominatim[] };
          }
          const data = (await res.json()) as RawNominatim[];
          return { ok: true as const, status: res.status, data };
        };

        const hasBias = Number.isFinite(lat) && Number.isFinite(lng);
        const ref: LatLng | null = hasBias ? { lat, lng } : null;
        const maxDistanceKm = 35; // limita resultados mais próximos do cliente

        const withDistance = <T extends { lat: number; lng: number }>(items: T[]) =>
          ref
            ? items.map((s) => ({
                ...s,
                distanceKm: haversineKm(ref, { lat: s.lat, lng: s.lng }),
              }))
            : items;

        const filterAndSortNear = <T extends { distanceKm?: number }>(items: T[]) => {
          if (!ref) return items;
          return items
            .filter(
              (s) =>
                typeof s.distanceKm === "number" &&
                Number.isFinite(s.distanceKm) &&
                s.distanceKm <= maxDistanceKm,
            )
            .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        };

        // 1) Busca principal: se temos localização do cliente, limita à caixa (bounded=1)
        const res1 = await fetchSearch(q, hasBias ? { d: 0.25, bounded: true } : undefined);
        if (!res1.ok) {
          return Response.json(
            { error: `Autocomplete failed (${res1.status})` },
            { status: 502 },
          );
        }
        let suggestions = filterAndSortNear(withDistance(mapSuggestions(res1.data)));

        // 2) Se vier pouca coisa: fallback progressivo (ainda perto, mas menos restrito)
        if (suggestions.length < 4 && hasBias) {
          const resNear = await fetchSearch(q, { d: 0.6, bounded: true });
          if (resNear.ok) {
            const near2 = filterAndSortNear(withDistance(mapSuggestions(resNear.data)));
            suggestions = dedupeById([...suggestions, ...near2]);
          }
        }

        // 3) Se ainda vier pouca coisa, tentamos “completar” com cidade/UF da região
        if (suggestions.length < 4 && hasBias) {
          const rev = new URL("https://nominatim.openstreetmap.org/reverse");
          rev.searchParams.set("format", "jsonv2");
          rev.searchParams.set("addressdetails", "1");
          rev.searchParams.set("accept-language", "pt-BR");
          rev.searchParams.set("lat", String(lat));
          rev.searchParams.set("lon", String(lng));
          // zoom 10-12 tende a pegar cidade/município
          rev.searchParams.set("zoom", "10");

          const revRes = await fetch(rev.toString(), { headers });
          const revJson = (await revRes.json().catch(() => null)) as
            | { address?: Record<string, unknown> }
            | null;

          const parts = partsFromNominatimAddress(revJson?.address ?? null);
          const cityState = [parts.city, parts.state].filter(Boolean).join(" - ");
          if (cityState) {
            const q2 = `${q}, ${cityState}`;
            const res2 = await fetchSearch(q2, { d: 0.9, bounded: false });
            if (res2.ok) {
              const extra = filterAndSortNear(withDistance(mapSuggestions(res2.data)));
              suggestions = dedupeById([...suggestions, ...extra]);
            }
          }
        }

        // Último fallback: se nada apareceu, volta a busca ampla (sem bounded) para não “morrer” vazio
        if (!suggestions.length && hasBias) {
          const resWide = await fetchSearch(q, { d: 1.2, bounded: false });
          if (resWide.ok) {
            suggestions = withDistance(mapSuggestions(resWide.data)).sort(
              (a: any, b: any) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0),
            );
          }
        }

        return Response.json({ suggestions: suggestions.slice(0, 12) });
      },
    },
  },
});