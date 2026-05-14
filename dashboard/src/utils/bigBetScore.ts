/**
 * Big Bet — Score logic
 *
 * Rules:
 *  - Three disciplines: Bike (100km), Run (20km), Swim (5km)
 *  - Discipline becomes "active" when EITHER participant crosses its threshold
 *  - For each active discipline:
 *      - leader = higher cumulative distance
 *      - leader.dist > 2 × loser.dist  →  leader 2 pts, loser 0
 *      - else                            →  leader 1 pt,  loser 0
 *  - Exact tie → 0 pts to both (rare)
 *  - Trainer activities (`trainer === true`) are excluded
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

/** Sum distance (meters) of activities matching `types`, before `untilDate`, excluding trainer. */
function sumDistance(
  activities: Activity[],
  types: string[],
  untilDate: Date,
): number {
  let sum = 0;
  for (const a of activities) {
    if (a.trainer === true) continue;
    if (!types.includes(a.sport_type)) continue;
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

  // 2 points if leader's distance > 2× loser's distance, otherwise 1 point.
  // Edge case: loser = 0 → leader automatically gets 2 points.
  const doubleAhead = loser === 0 || leader > 2 * loser;
  const pts = doubleAhead ? 2 : 1;

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
  const disciplines: Array<{ key: keyof typeof THRESHOLDS; types: string[] }> = [
    { key: "bike", types: BIKE_TYPES },
    { key: "run",  types: RUN_TYPES  },
    { key: "swim", types: SWIM_TYPES },
  ];

  let meScore = 0;
  let friendScore = 0;
  const perDiscipline: Record<string, PerDiscipline> = {};

  for (const { key, types } of disciplines) {
    const meDist = sumDistance(meActs, types, untilDate);
    const friendDist = sumDistance(friendActs, types, untilDate);
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

  const snapshots = getWeeklySnapshots(start, end);

  return snapshots.map((d, i) => {
    const { meScore, friendScore } = computeScoreAt(meActs, friendActs, d);
    return {
      week: i === 0 ? "Start" : `W${i}`,
      date: d.toISOString(),
      meScore,
      friendScore,
    };
  });
}
