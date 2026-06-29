import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import type { Activity } from "../types";
import { normalizeDisplaySport } from "../types";
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

const SPORTS: { key: string; label: string }[] = [
  { key: "Ride", label: "Kolo" },
  { key: "Run", label: "Běh" },
  { key: "Swim", label: "Plavání" },
];

function cumulativeKmSeries(activities: Activity[], year: number, sportKey: string): (number | null)[] {
  const bySum: Record<string, number> = {};
  for (const a of activities) {
    const d = a.start_date_local;
    if (!d || !d.startsWith(String(year))) continue;
    const sport = normalizeDisplaySport(a.sport_type || a.type || "");
    if (sport !== sportKey) continue;
    // Same exclusion rule as Big Bet: trainer rides don't count, pool swims/treadmill runs do.
    if (sportKey === "Ride" && a.trainer === true) continue;
    const m = parseInt(d.slice(5, 7), 10);
    const day = parseInt(d.slice(8, 10), 10);
    const key = `${m}-${day}`;
    bySum[key] = (bySum[key] || 0) + (a.distance || 0);
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
    out.push(Math.round(cum / 100) / 10);
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

  const { chartData, curr, prevFull, prevToDate } = useMemo(() => {
    const currSeries = cumulativeKmSeries(activities, thisYear, sport);
    const prevSeries = cumulativeKmSeries(activities, lastYear, sport);
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
    };
  }, [activities, sport, thisYear, lastYear]);

  const fmt = (v: number) => `${v.toLocaleString("cs-CZ")} km`;

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
        </div>
        <div className="yoy-stat">
          <span className="yoy-stat-label">{lastYear} (stejné datum)</span>
          <span className="yoy-stat-value">{fmt(prevToDate)}</span>
        </div>
        <div className="yoy-stat">
          <span className="yoy-stat-label">{lastYear} celý rok</span>
          <span className="yoy-stat-value">{fmt(prevFull)}</span>
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
            width={48}
            tickFormatter={(v) => `${v} km`}
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
