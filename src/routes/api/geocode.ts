import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/geocode")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const q = (searchParams.get("q") ?? "").trim();
        if (!q) return Response.json({ error: "Missing q" }, { status: 400 });

        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "1");
        url.searchParams.set("q", q);

        const res = await fetch(url.toString(), {
          headers: {
            "User-Agent": "DiskGuincho24h/1.0",
            Accept: "application/json",
          },
        });
        if (!res.ok) return Response.json({ error: `Geocode failed (${res.status})` }, { status: 502 });
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        const hit = data?.[0];
        if (!hit) return Response.json({ found: false });
        return Response.json({ found: true, lat: Number(hit.lat), lng: Number(hit.lon) });
      },
    },
  },
});