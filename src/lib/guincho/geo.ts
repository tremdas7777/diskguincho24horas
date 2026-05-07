export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = deg2rad(b.lat - a.lat);
  const dLon = deg2rad(b.lng - a.lng);
  const sLat1 = deg2rad(a.lat);
  const sLat2 = deg2rad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(sLat1) * Math.cos(sLat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function deg2rad(v: number) {
  return (v * Math.PI) / 180;
}

