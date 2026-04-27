/**
 * Unsplash API helper for fetching location-based photos.
 * Set VITE_UNSPLASH_KEY in .env to enable. Without it, photos are silently skipped.
 */

const API_KEY = import.meta.env.VITE_UNSPLASH_KEY as string | undefined;
const CACHE_KEY_PREFIX = "unsplash_cache_";
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const FAIL_CACHE_DURATION = 60 * 60 * 1000; // 1 hour (cache failures to avoid spam)

interface CachedPhoto {
  url: string; // empty string = known failure
  timestamp: number;
}

export async function getLocationPhoto(lat?: number, lng?: number, sport?: string): Promise<string> {
  if (!lat || !lng || !API_KEY) return "";

  const cacheKey = `${CACHE_KEY_PREFIX}${lat.toFixed(2)}_${lng.toFixed(2)}`;

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const parsed: CachedPhoto = JSON.parse(cached);
    const ttl = parsed.url ? CACHE_DURATION : FAIL_CACHE_DURATION;
    if (Date.now() - parsed.timestamp < ttl) {
      return parsed.url;
    }
  }

  try {
    const query = sport ? sport.replace(/Ride|Run|Hike|Swim/g, "").trim() || "nature" : "nature";
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&count=1&client_id=${API_KEY}`
    );

    if (!response.ok) throw new Error(`Unsplash API error: ${response.status}`);

    const data = await response.json();
    const photoUrl: string = data?.urls?.regular || data?.urls?.small || "";

    localStorage.setItem(cacheKey, JSON.stringify({ url: photoUrl, timestamp: Date.now() }));
    return photoUrl;
  } catch (error) {
    // Cache failure to avoid retrying on every render
    localStorage.setItem(cacheKey, JSON.stringify({ url: "", timestamp: Date.now() }));
    console.warn(`Failed to fetch photo for ${lat}, ${lng}:`, error);
    return "";
  }
}

export function clearPhotosCache() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(CACHE_KEY_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}
