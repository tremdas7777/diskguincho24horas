import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/reverse")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url);
        const lat = Number(searchParams.get("lat"));
        const lng = Number(searchParams.get("lng"));
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return Response.json({ error: "Missing lat/lng" }, { status: 400 });
        }
        const url = new URL("https://nominatim.openstreetmap.org/reverse");
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("lat", String(lat));
        url.searchParams.set("lon", String(lng));
        const res = await fetch(url.toString(), {
          headers: { "User-Agent": "DiskGuincho24h/1.0", Accept: "application/json" },
        });
        if (!res.ok) return Response.json({ error: `Reverse failed (${res.status})` }, { status: 502 });
        const data = (await res.json()) as any;
        const a = data?.address ?? {};
        const line = [
          a.road || a.pedestrian || a.cycleway || a.footway || "",
          a.house_number ? `, ${a.house_number}` : "",
        ].join("");
        const city = a.city || a.town || a.village || a.municipality || "";
        const state = a.state || "";
        return Response.json({
          display_name: data?.display_name ?? "",
          short: [line, city && state ? `${city} - ${state}` : city || state].filter(Boolean).join(" · "),
        });
      },
    },
  },
});