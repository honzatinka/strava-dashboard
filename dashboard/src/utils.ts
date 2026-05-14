import type { Activity } from "./types";

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Always-km variant — used in Big Bet where totals are large & we want consistent units.
 *  Future-proof:
 *   - 0           → "0 km"
 *   - < 100 km    → "3.6 km"     (1 decimal)
 *   - < 1000 km   → "474.2 km"   (1 decimal)
 *   - ≥ 1000 km   → "1 234 km"   (no decimal, space-separated thousands)
 */
export function formatDistanceKm(meters: number): string {
  if (meters === 0) return "0 km";
  const km = meters / 1000;
  if (km >= 1000) {
    // Use non-breaking thin space as thousands separator (looks clean, avoids confusion with comma=decimal in CS locale)
    return `${Math.round(km).toLocaleString("cs-CZ").replace(/\s/g, " ")} km`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", {
    day: "numeric", month: "short",
  });
}

export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("cs-CZ", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function formatPace(avgSpeed: number, sportType: string): string | null {
  if (avgSpeed <= 0) return null;
  if (["Run", "VirtualRun", "Hike", "Walk"].includes(sportType)) {
    const pace = 1000 / avgSpeed;
    const min = Math.floor(pace / 60);
    const sec = Math.round(pace % 60);
    return `${min}:${sec.toString().padStart(2, "0")} /km`;
  }
  return `${(avgSpeed * 3.6).toFixed(1)} km/h`;
}

export function formatSpeed(metersPerSec: number): string {
  return `${(metersPerSec * 3.6).toFixed(1)} km/h`;
}

export function sportLabel(sport: string): string {
  return sport.replace(/([A-Z])/g, " $1").trim();
}

export function groupByMonth(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = a.start_date_local.slice(0, 7); // YYYY-MM
    const arr = map.get(key) || [];
    arr.push(a);
    map.set(key, arr);
  }
  return map;
}

export function groupByDate(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = a.start_date_local.slice(0, 10); // YYYY-MM-DD
    const arr = map.get(key) || [];
    arr.push(a);
    map.set(key, arr);
  }
  return map;
}

export function groupBySport(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = a.sport_type || a.type;
    const arr = map.get(key) || [];
    arr.push(a);
    map.set(key, arr);
  }
  return map;
}

const CZECH_MONTHS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

export function czechMonth(month: number): string {
  return CZECH_MONTHS[month];
}

const CZECH_DAYS_SHORT = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export function czechDayShort(day: number): string {
  return CZECH_DAYS_SHORT[day];
}

const TZ_LOCATIONS: Record<string, string> = {
  "Europe/Prague": "Česko",
  "Europe/Bratislava": "Slovensko",
  "Europe/Vienna": "Rakousko",
  "Europe/Warsaw": "Polsko",
  "Europe/Rome": "Itálie",
  "Europe/Madrid": "Španělsko",
  "Europe/Lisbon": "Portugalsko",
  "Europe/London": "Anglie",
  "Africa/Algiers": "Alžírsko",
  "Africa/Blantyre": "Malawi",
  "Asia/Manila": "Filipíny",
  "Asia/Colombo": "Srí Lanka",
  "Atlantic/Azores": "Azory",
  "GMT": "GMT",
};

// Decode Google encoded polyline
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export function locationFromTimezone(tz?: string): string | null {
  if (!tz) return null;
  // format: "(GMT+01:00) Europe/Prague"
  const match = tz.match(/\)\s*(.+)/);
  if (!match) return null;
  const key = match[1].trim();
  return TZ_LOCATIONS[key] || key.split("/").pop()?.replace(/_/g, " ") || null;
}
