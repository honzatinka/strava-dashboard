/**
 * Reverse geocoding via OpenStreetMap Nominatim — free, no API key needed.
 * Returns nearest city/town name in Czech. Results cached in localStorage for 30 days.
 */

const CACHE_PREFIX = "geo_";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedGeo {
  name: string | null;
  ts: number;
}

export async function getCityName(lat: number, lng: number): Promise<string | null> {
  const key = `${CACHE_PREFIX}${lat.toFixed(2)}_${lng.toFixed(2)}`;

  const raw = localStorage.getItem(key);
  if (raw) {
    const { name, ts }: CachedGeo = JSON.parse(raw);
    if (Date.now() - ts < CACHE_TTL) return name;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`,
      { headers: { "Accept-Language": "cs" } }
    );
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = await res.json();
    const a = data.address ?? {};
    const name: string | null =
      a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.country ?? null;
    localStorage.setItem(key, JSON.stringify({ name, ts: Date.now() }));
    return name;
  } catch {
    // Cache failure for 1 hour so we don't hammer the API
    localStorage.setItem(key, JSON.stringify({ name: null, ts: Date.now() - CACHE_TTL + 3600_000 }));
    return null;
  }
}
