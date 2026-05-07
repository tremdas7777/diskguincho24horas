import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/autocomplete")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const q = (searchParams.get("q") ?? "").trim();
        const lat = Number(searchParams.get("lat"));
        const lng = Number(searchParams.get("lng"));
        if (!q || q.length < 3) return Response.json({ suggestions: [] });

        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "6");
        url.searchParams.set("countrycodes", "br");
        url.searchParams.set("accept-language", "pt-BR");
        url.searchParams.set("q", q);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          url.searchParams.set("lat", String(lat));
          url.searchParams.set("lon", String(lng));
        }

        const res = await fetch(url.toString(), {
          headers: { "User-Agent": "DiskGuincho24h/1.0", Accept: "application/json" },
        });
        if (!res.ok) return Response.json({ error: `Autocomplete failed (${res.status})` }, { status: 502 });
        const data = (await res.json()) as Array<any>;
        const suggestions = (data ?? [])
          .map((it) => ({
            id: String(it.place_id ?? it.osm_id ?? it.display_name),
            label: String(it.display_name ?? ""),
            lat: Number(it.lat),
            lng: Number(it.lon),
            address: it.address ?? null,
          }))
          .filter((s) => s.label && Number.isFinite(s.lat) && Number.isFinite(s.lng));
        return Response.json({ suggestions });
      },
    },
  },
});