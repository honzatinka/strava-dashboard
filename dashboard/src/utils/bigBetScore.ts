/**
 * Big Bet — Score logic
 *
 * Rules:
 *  - Three disciplines: Bike (100km), Run (20km), Swim (5km)
 *  - Discipline becomes "active" when EITHER participant crosses its threshold
 *  - For each active discipline:
 *      - leader = higher cumulative distance
 *      - leader.dist >= 2 × loser.dist  →  leader 2 pts ("má 2× tolik než druhý")
 *      - else                            →  leader 1 pt   (těsné vedení)
 *      - loser 0 v obou případech
 *      - Edge case: pokud loser = 0, leader dostává 2 body
 *  - Exact tie → 0 pts to both (rare)
 *  - Trainer activities (`trainer === true`) are excluded ONLY for Bike
 *    (Technogym/Zwift). Pool swims and treadmill runs DO count.
 *
 * Time axis: weekly snapshots from Jan 1 of competition year up to today.
 */

import type { Activity } from "../types";

export const COMPETITION_YEAR = 2026;

export const THRESHOLDS = {
  bike: 100_000, // 100 km in meters
  run:   20_000, //  20 km
  swim:   5_000, //   5 km
};

export const BIKE_TYPES = ["Ride", "GravelRide", "MountainBikeRide", "VirtualRide"];
export const RUN_TYPES  = ["Run",  "VirtualRun", "TrailRun"];
export const SWIM_TYPES = ["Swim"];

export interface ScorePoint {
  /** Label shown on X-axis, e.g. "W1", "W20" */
  week: string;
  /** ISO date string for tooltip */
  date: string;
  meScore: number;
  friendScore: number;
  // Per-discipline scores for sport tabs (0–2 points)
  bike_me: number;
  bike_friend: number;
  swim_me: number;
  swim_friend: number;
  run_me: number;
  run_friend: number;
  // Per-discipline CUMULATIVE distance in km — for sport tabs showing km progress
  bike_me_km: number;
  bike_friend_km: number;
  swim_me_km: number;
  swim_friend_km: number;
  run_me_km: number;
  run_friend_km: number;
}

export interface PerDiscipline {
  active: boolean;
  mePoints: number;
  friendPoints: number;
  meDist: number;
  friendDist: number;
}

/**
 * Returns the date (Sunday 23:59:59) of every ISO week from `from` up to `to`,
 * plus `to` itself as the final point if it isn't a Sunday already.
 */
export function getWeeklySnapshots(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(23, 59, 59, 999);

  // Always include the very first day as the W0 (start) snapshot
  out.push(new Date(cursor));

  // Move cursor to the next Sunday
  const daysUntilSunday = (7 - cursor.getDay()) % 7;
  cursor.setDate(cursor.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));

  while (cursor <= to) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  // If `to` is past the last snapshot (i.e. today is mid-week), add today as final point
  const last = out[out.length - 1];
  if (last.getTime() < to.getTime() - 1000 * 60 * 60) {
    out.push(new Date(to));
  }

  return out;
}

/** Sum distance (meters) of activities matching `types`, before `untilDate`.
 *  Trainer rides (Technogym/Zwift) excluded ONLY for bike — pool swims & treadmill runs count.
 */
function sumDistance(
  activities: Activity[],
  types: string[],
  untilDate: Date,
  excludeTrainer = false,
): number {
  let sum = 0;
  for (const a of activities) {
    if (!types.includes(a.sport_type)) continue;
    if (excludeTrainer && a.trainer === true) continue;
    const d = new Date(a.start_date_local);
    if (d > untilDate) continue;
    sum += a.distance || 0;
  }
  return sum;
}

function pointsForDiscipline(
  meDist: number,
  friendDist: number,
  threshold: number,
): { active: boolean; mePoints: number; friendPoints: number } {
  const active = Math.max(meDist, friendDist) >= threshold;
  if (!active) return { active: false, mePoints: 0, friendPoints: 0 };
  if (meDist === friendDist) return { active: true, mePoints: 0, friendPoints: 0 };

  const meLeads = meDist > friendDist;
  const leader = meLeads ? meDist : friendDist;
  const loser  = meLeads ? friendDist : meDist;

  // "Má 2× tolik vzdálenosti než druhý" = leader >= 2 × loser
  // Edge case: loser = 0 → leader >= 0 trivially → 2 points
  const dominantLead = loser === 0 || leader >= 2 * loser;
  const pts = dominantLead ? 2 : 1;

  return meLeads
    ? { active: true, mePoints: pts, friendPoints: 0 }
    : { active: true, mePoints: 0, friendPoints: pts };
}

/** Compute snapshot score at `untilDate` for both participants. */
export function computeScoreAt(
  meActs: Activity[],
  friendActs: Activity[],
  untilDate: Date,
): { meScore: number; friendScore: number; perDiscipline: Record<string, PerDiscipline> } {
  const disciplines: Array<{ key: keyof typeof THRESHOLDS; types: string[]; excludeTrainer: boolean }> = [
    { key: "bike", types: BIKE_TYPES, excludeTrainer: true  },
    { key: "run",  types: RUN_TYPES,  excludeTrainer: false },
    { key: "swim", types: SWIM_TYPES, excludeTrainer: false },
  ];

  let meScore = 0;
  let friendScore = 0;
  const perDiscipline: Record<string, PerDiscipline> = {};

  for (const { key, types, excludeTrainer } of disciplines) {
    const meDist = sumDistance(meActs, types, untilDate, excludeTrainer);
    const friendDist = sumDistance(friendActs, types, untilDate, excludeTrainer);
    const r = pointsForDiscipline(meDist, friendDist, THRESHOLDS[key]);
    meScore += r.mePoints;
    friendScore += r.friendPoints;
    perDiscipline[key] = {
      active: r.active,
      mePoints: r.mePoints,
      friendPoints: r.friendPoints,
      meDist,
      friendDist,
    };
  }

  return { meScore, friendScore, perDiscipline };
}

/** Build the full weekly time series for charting. */
export function buildScoreSeries(
  meActs: Activity[],
  friendActs: Activity[],
  year: number = COMPETITION_YEAR,
  now: Date = new Date(),
): ScorePoint[] {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = now < new Date(Date.UTC(year, 11, 31, 23, 59, 59))
    ? now
    : new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  // CRITICAL: filter to competition year only. /api/activities returns all years,
  // and without this filter prior-year totals get summed and trip thresholds at week 1.
  const yearStr = String(year);
  const meThisYear = meActs.filter(a => a.start_date_local?.startsWith(yearStr));
  const friendThisYear = friendActs.filter(a => a.start_date_local?.startsWith(yearStr));

  const snapshots = getWeeklySnapshots(start, end);

  return snapshots.map((d, i) => {
    const { meScore, friendScore, perDiscipline } = computeScoreAt(meThisYear, friendThisYear, d);
    const toKm = (m: number) => Math.round(m / 100) / 10; // 1 decimal
    return {
      week: i === 0 ? "Start" : `W${i}`,
      date: d.toISOString(),
      meScore,
      friendScore,
      bike_me: perDiscipline.bike?.mePoints ?? 0,
      bike_friend: perDiscipline.bike?.friendPoints ?? 0,
      swim_me: perDiscipline.swim?.mePoints ?? 0,
      swim_friend: perDiscipline.swim?.friendPoints ?? 0,
      run_me: perDiscipline.run?.mePoints ?? 0,
      run_friend: perDiscipline.run?.friendPoints ?? 0,
      bike_me_km:     toKm(perDiscipline.bike?.meDist ?? 0),
      bike_friend_km: toKm(perDiscipline.bike?.friendDist ?? 0),
      swim_me_km:     toKm(perDiscipline.swim?.meDist ?? 0),
      swim_friend_km: toKm(perDiscipline.swim?.friendDist ?? 0),
      run_me_km:      toKm(perDiscipline.run?.meDist ?? 0),
      run_friend_km:  toKm(perDiscipline.run?.friendDist ?? 0),
    };
  });
}
