/** Normaliza endereço OSM/Nominatim (Brasil) para os campos do formulário. */

export type NominatimFormParts = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cepDigits: string;
};

export function partsFromNominatimAddress(
  a: Record<string, unknown> | null | undefined,
): NominatimFormParts {
  const addr = a ?? {};
  const road =
    String(
      addr.road ||
        addr.pedestrian ||
        addr.cycleway ||
        addr.footway ||
        addr.path ||
        addr.residential ||
        "",
    ).trim();
  const houseNumber = String(addr.house_number ?? "").trim();
  const neighborhood = String(
    addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.city_district ||
      addr.hamlet ||
      "",
  ).trim();
  const city = String(
    addr.city || addr.town || addr.village || addr.municipality || "",
  ).trim();
  const stateName = String(addr.state ?? "").trim();
  const iso = String(addr["ISO3166-2-lvl4"] ?? "");
  const stateCode =
    /^BR-([A-Za-z]{2})$/i.exec(iso)?.[1]?.toUpperCase() ??
    (stateName.length === 2 && /^[A-Za-z]{2}$/.test(stateName)
      ? stateName.toUpperCase()
      : "");
  const cepDigits = String(addr.postcode ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);

  return {
    street: road,
    number: houseNumber,
    neighborhood,
    city,
    state: stateCode,
    cepDigits,
  };
}
