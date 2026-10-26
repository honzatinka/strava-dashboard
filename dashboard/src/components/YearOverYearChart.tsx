import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import type { Activity } from "../types";
import { normalizeDisplaySport } from "../types";
import { activityDurationSecs, formatDuration } from "../utils";
import "./YearOverYearChart.css";

// Canonical 366 calendar days (Jan 1 → Dec 31 of a leap year, so Feb 29 is included).
// Both years are aligned by calendar position (month+day), not raw day-of-year index —
// that keeps Feb 29 from shifting every date after it by one day in non-leap years.
const REF_DAYS: [number, number][] = (() => {
  const days: [number, number][] = [];
  const d = new Date(2024, 0, 1);
  for (let i = 0; i < 366; i++) {
    days.push([d.getMonth() + 1, d.getDate()]);
    d.setDate(d.getDate() + 1);
  }
  return days;
})();

/** "Time" is not a sport: it sums the duration of every activity, whatever the sport. */
const TIME = "Time";

const SPORTS: { key: string; label: string }[] = [
  { key: "Ride", label: "Kolo" },
  { key: "Run", label: "Běh" },
  { key: "Swim", label: "Plavání" },
  { key: TIME, label: "Čas" },
];

function countsFor(a: Activity, year: number, sportKey: string): boolean {
  const d = a.start_date_local;
  if (!d || !d.startsWith(String(year))) return false;
  if (sportKey === TIME) return true;
  if (normalizeDisplaySport(a.sport_type || a.type || "") !== sportKey) return false;
  // Same exclusion rule as Big Bet: trainer rides don't count, pool swims/treadmill runs do.
  return !(sportKey === "Ride" && a.trainer === true);
}

/** Total activity time in seconds, optionally only up to today's calendar date. */
function totalSecs(activities: Activity[], year: number, sportKey: string, toToday: boolean): number {
  const now = new Date();
  const cutoff = (now.getMonth() + 1) * 100 + now.getDate();
  let secs = 0;
  for (const a of activities) {
    if (!countsFor(a, year, sportKey)) continue;
    const md = parseInt(a.start_date_local.slice(5, 7), 10) * 100 + parseInt(a.start_date_local.slice(8, 10), 10);
    if (toToday && md > cutoff) continue;
    secs += activityDurationSecs(a);
  }
  return secs;
}

function cumulativeSeries(activities: Activity[], year: number, sportKey: string): (number | null)[] {
  const bySum: Record<string, number> = {};
  for (const a of activities) {
    if (!countsFor(a, year, sportKey)) continue;
    const d = a.start_date_local;
    const m = parseInt(d.slice(5, 7), 10);
    const day = parseInt(d.slice(8, 10), 10);
    const key = `${m}-${day}`;
    const amount = sportKey === TIME ? activityDurationSecs(a) / 3600 : (a.distance || 0) / 1000;
    bySum[key] = (bySum[key] || 0) + amount;
  }

  const now = new Date();
  const isCurrentYear = year === now.getFullYear();
  let cum = 0;
  let pastToday = false;
  const out: (number | null)[] = [];
  for (const [m, day] of REF_DAYS) {
    if (isCurrentYear && (m > now.getMonth() + 1 || (m === now.getMonth() + 1 && day > now.getDate()))) {
      pastToday = true;
    }
    if (pastToday) { out.push(null); continue; }
    cum += bySum[`${m}-${day}`] || 0;
    out.push(Math.round(cum * 10) / 10);
  }
  return out;
}

const lastNonNull = (arr: (number | null)[]) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i] as number;
  }
  return 0;
};

/**
 * Year-over-year cumulative distance — current year (solid accent, stops at today)
 * vs. previous year (dashed gray, full year). Sport-selectable (Ride/Run/Swim, the
 * three Big Bet disciplines). Works for whichever activities prop is passed in, so
 * it automatically follows the Honza/Martin view switch like the rest of Statistics.
 */
export function YearOverYearChart({ activities }: { activities: Activity[] }) {
  const [sport, setSport] = useState("Ride");
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;

  const { chartData, curr, prevFull, prevToDate, time } = useMemo(() => {
    const currSeries = cumulativeSeries(activities, thisYear, sport);
    const prevSeries = cumulativeSeries(activities, lastYear, sport);
    const data = REF_DAYS.map(([m, day], i) => ({
      label: `${day}.${m}.`,
      curr: currSeries[i],
      prev: prevSeries[i],
    }));
    return {
      chartData: data,
      curr: lastNonNull(currSeries),
      prevToDate: (() => {
        const now = new Date();
        const idx = REF_DAYS.findIndex(([m, day]) => m === now.getMonth() + 1 && day === now.getDate());
        return prevSeries[idx >= 0 ? idx : prevSeries.length - 1] ?? 0;
      })(),
      prevFull: lastNonNull(prevSeries),
      time: {
        curr: totalSecs(activities, thisYear, sport, true),
        prevToDate: totalSecs(activities, lastYear, sport, true),
        prevFull: totalSecs(activities, lastYear, sport, false),
      },
    };
  }, [activities, sport, thisYear, lastYear]);

  const isTime = sport === TIME;
  const unit = isTime ? "h" : "km";
  const fmt = (v: number) => (isTime ? formatDuration(v * 3600) : `${v.toLocaleString("cs-CZ")} km`);

  return (
    <div className="sr-card">
      <div className="sr-card-header">
        <h3 className="sr-card-title">Meziroční srovnání</h3>
        <div className="sr-year-tabs">
          {SPORTS.map(({ key, label }) => (
            <button
              key={key}
              className={`sr-year-tab ${sport === key ? "active" : ""}`}
              onClick={() => setSport(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="yoy-stats">
        <div className="yoy-stat">
          <span className="yoy-stat-label">{thisYear} (k dnešku)</span>
          <span className="yoy-stat-value yoy-stat-value--accent">{fmt(curr)}</span>
          {!isTime && <span className="yoy-stat-time">{formatDuration(time.curr)}</span>}
        </div>
        <div className="yoy-stat">
          <span className="yoy-stat-label">{lastYear} (stejné datum)</span>
          <span className="yoy-stat-value">{fmt(prevToDate)}</span>
          {!isTime && <span className="yoy-stat-time">{formatDuration(time.prevToDate)}</span>}
        </div>
        <div className="yoy-stat">
          <span className="yoy-stat-label">{lastYear} celý rok</span>
          <span className="yoy-stat-value">{fmt(prevFull)}</span>
          {!isTime && <span className="yoy-stat-time">{formatDuration(time.prevFull)}</span>}
        </div>
      </div>

      <div className="yoy-legend">
        <span className="yoy-legend-item"><span className="yoy-legend-swatch yoy-legend-swatch--curr" />{thisYear}</span>
        <span className="yoy-legend-item"><span className="yoy-legend-swatch yoy-legend-swatch--prev" />{lastYear}</span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="rgba(33,33,31,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "rgba(33,33,31,0.5)" }}
            axisLine={{ stroke: "rgba(33,33,31,0.12)" }}
            tickLine={false}
            interval={29}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "rgba(33,33,31,0.5)" }}
            axisLine={false}
            tickLine={false}
            width={76}
            tickFormatter={(v) => `${v.toLocaleString("cs-CZ")} ${unit}`}
          />
          <Line
            type="monotone"
            dataKey="curr"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="prev"
            stroke="rgba(33,33,31,0.45)"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
