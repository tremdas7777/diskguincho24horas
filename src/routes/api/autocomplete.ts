import { createFileRoute } from "@tanstack/react-router";
import { haversineKm, type LatLng } from "@/lib/guincho/geo";
import { partsFromNominatimAddress } from "@/lib/guincho/nominatimParts";

type RawNominatim = Record<string, any>;

function mapSuggestions(data: RawNominatim[]) {
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

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
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

        const buildSearchUrl = (query: string) => {
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
          /* Viés geográfico perto da origem (como apps de GPS), sem travar fora da caixa */
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const d = 0.9; // caixa maior para achar bairros/ruas
            url.searchParams.set(
              "viewbox",
              `${lng - d},${lat + d},${lng + d},${lat - d}`,
            );
            url.searchParams.set("bounded", "0");
          }
          return url;
        };

        const fetchSearch = async (query: string) => {
          const res = await fetch(buildSearchUrl(query).toString(), { headers });
          if (!res.ok) {
            return { ok: false as const, status: res.status, data: [] as RawNominatim[] };
          }
          const data = (await res.json()) as RawNominatim[];
          return { ok: true as const, status: res.status, data };
        };

        // 1) Busca principal (texto puro do usuário)
        const res1 = await fetchSearch(q);
        if (!res1.ok) {
          return Response.json(
            { error: `Autocomplete failed (${res1.status})` },
            { status: 502 },
          );
        }
        let suggestions = mapSuggestions(res1.data);

        // 2) Se vier pouca coisa e temos viés, tentamos “completar” com cidade/UF da região
        if (suggestions.length < 4 && Number.isFinite(lat) && Number.isFinite(lng)) {
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
            const res2 = await fetchSearch(q2);
            if (res2.ok) {
              suggestions = dedupeById([...suggestions, ...mapSuggestions(res2.data)]);
            }
          }
        }

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const ref: LatLng = { lat, lng };
          suggestions = suggestions
            .map((s) => ({
              ...s,
              distanceKm: haversineKm(ref, { lat: s.lat, lng: s.lng }),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);
        }

        return Response.json({ suggestions });
      },
    },
  },
});