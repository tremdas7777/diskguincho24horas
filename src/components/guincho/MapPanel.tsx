
import { useEffect, useMemo, useRef } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LatLng } from "@/lib/guincho/geo";

/** Mostra origem e destino na mesma vista (estilo “para onde ir” no GPS). */
function FitOriginDestRoute({
  origin,
  dest,
}: {
  origin?: LatLng;
  dest?: LatLng;
}) {
  const map = useMap();
  const lastSig = useRef<string>("");

  useEffect(() => {
    if (!origin || !dest) {
      lastSig.current = "";
      return;
    }
    const sig = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}|${dest.lat.toFixed(5)},${dest.lng.toFixed(5)}`;
    if (lastSig.current === sig) return;
    lastSig.current = sig;

    const b = L.latLngBounds([origin.lat, origin.lng], [dest.lat, dest.lng]);
    map.fitBounds(b, { padding: [80, 80], maxZoom: 15, animate: true });
  }, [dest?.lat, dest?.lng, map, origin?.lat, origin?.lng]);

  return null;
}

function Follow({
  center,
  zoom,
  follow,
}: {
  center: LatLng;
  zoom: number;
  follow: boolean;
}) {
  const map = useMap();
  const last = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!follow) return;
    const prev = last.current;
    last.current = center;

    // Avoid jitter: only recenter when user moved enough.
    const movedEnough =
      !prev ||
      Math.abs(prev.lat - center.lat) > 0.00008 ||
      Math.abs(prev.lng - center.lng) > 0.00008;

    if (!movedEnough) return;

    map.setView([center.lat, center.lng], zoom, {
      animate: true,
      duration: 0.6,
    });
  }, [center, follow, map, zoom]);

  return null;
}

export function MapPanel({
  origin,
  dest,
  destPreview,
  tow,
  accuracyM,
  followOrigin,
  className,
}: {
  origin?: LatLng;
  dest?: LatLng;
  /** Sugestão da busca (ainda não confirmada): rota tracejada até este ponto. */
  destPreview?: LatLng | null;
  tow?: LatLng;
  accuracyM?: number;
  followOrigin?: boolean;
  className?: string;
}) {
  const center: LatLng = origin ?? tow ?? { lat: -14.235, lng: -51.9253 }; // Brazil
  // Uber/Waze-like close view: 1–2 blocks around the user
  const zoom = origin ? 18 : tow ? 16 : 4;

  const iconFix = useMemo(() => {
    // Fix Leaflet default marker icons when bundled.
    // We only use CircleMarker, but this prevents missing assets warnings in some builds.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
    return true;
  }, []);

  const gpsIcon = useMemo(() => {
    return L.divIcon({
      className: "",
      html: `<div class="gps-dot" aria-hidden="true"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }, []);

  const routeEnd = destPreview ?? dest;
  const previewActive = destPreview != null;

  return (
    <div className={className}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={3}
        maxZoom={19}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={true}
        style={{ height: "100%", width: "100%" }}
      >
        {iconFix ? null : null}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Follow center={center} zoom={zoom} follow={Boolean(followOrigin && origin)} />

        {origin && routeEnd ? (
          <FitOriginDestRoute origin={origin} dest={routeEnd} />
        ) : null}

        {origin ? (
          <>
            {Number.isFinite(accuracyM) && (accuracyM ?? 0) > 0 ? (
              <Circle
                center={[origin.lat, origin.lng]}
                radius={Math.min(accuracyM ?? 0, 250)}
                pathOptions={{
                  color: "#f59e0b",
                  fillColor: "#f59e0b",
                  fillOpacity: 0.12,
                  weight: 1,
                }}
              />
            ) : null}

            <Marker position={[origin.lat, origin.lng]} icon={gpsIcon} />
          </>
        ) : null}

        {origin && routeEnd ? (
          <>
            <Polyline
              positions={[
                [origin.lat, origin.lng],
                [routeEnd.lat, routeEnd.lng],
              ]}
              pathOptions={{
                color: "#0099FF",
                weight: previewActive ? 6 : 7,
                opacity: previewActive ? 0.72 : 0.95,
                lineCap: "round",
                lineJoin: "round",
                dashArray: previewActive ? "10 12" : undefined,
              }}
            />
            <CircleMarker
              center={[routeEnd.lat, routeEnd.lng]}
              radius={previewActive ? 7 : 8}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#0099FF",
                fillOpacity: previewActive ? 0.65 : 1,
                weight: previewActive ? 2 : 3,
              }}
            />
          </>
        ) : null}

        {tow ? (
          <CircleMarker
            center={[tow.lat, tow.lng]}
            radius={8}
            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.85 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

