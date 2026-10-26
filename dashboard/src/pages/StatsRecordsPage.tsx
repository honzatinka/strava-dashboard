import { useState, useMemo, useEffect } from "react";
import {
  BarChart, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { Ruler, Timer, Mountain, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Activity } from "../types";
import { resolveSportIcon } from "../types";
import { YearOverYearChart } from "../components/YearOverYearChart";
import {
  formatDistance, formatDuration, formatFullDate, activityDurationSecs,
  groupBySport, sportLabel, locationFromTimezone,
} from "../utils";
import { getCityName } from "../utils/geocode";
import "./StatsRecordsPage.css";

const CZECH_DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const CZECH_MONTHS_FULL = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

interface ActivityRecord {
  label: string;
  icon: LucideIcon;
  activity: Activity;
  value: string;
}

function findRecord(
  activities: Activity[],
  label: string,
  icon: LucideIcon,
  selector: (a: Activity) => number,
  formatter: (val: number) => string,
  filter?: (a: Activity) => boolean,
): ActivityRecord | null {
  const filtered = filter ? activities.filter(filter) : activities;
  if (filtered.length === 0) return null;
  const best = filtered.reduce((best, a) => selector(a) > selector(best) ? a : best);
  if (selector(best) <= 0) return null;
  return { label, icon, activity: best, value: formatter(selector(best)) };
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h <= 0) return `${m} min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface VolumeTooltipPayload { name: string; km: number; hours: number }

/** Custom tooltip — Recharts' built-in formatter always inserts a ": " separator
 *  even with an empty name, which is what we're avoiding by rendering the rows
 *  ourselves. Also lets a single hover show both km and time together. */
function VolumeTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ payload: VolumeTooltipPayload }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const raw = String(label);
  const monthLabel = raw.includes("-")
    ? `${CZECH_MONTHS_FULL[parseInt(raw.slice(5, 7), 10) - 1]} ${raw.slice(0, 4)}`
    : CZECH_MONTHS_FULL[parseInt(raw, 10) - 1] || raw;
  return (
    <div
      style={{
        background: "#FFFFFF", border: "1px solid rgba(33,33,31,0.08)", borderRadius: 8,
        color: "#21211F", fontFamily: "inherit", padding: "8px 12px",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{monthLabel}</div>
      <div style={{ color: "var(--color-accent)", fontSize: 12 }}>{d.km.toLocaleString("cs-CZ")} km</div>
      <div style={{ color: "#6B8FC7", fontSize: 12 }}>{formatHours(d.hours)}</div>
    </div>
  );
}

function RecordCard({ rec, onSelect }: { rec: ActivityRecord; onSelect: (a: Activity) => void }) {
  const sport = rec.activity.sport_type || rec.activity.type;
  const SportIcon = resolveSportIcon(sport, rec.activity.name);
  const [city, setCity] = useState<string | null>(locationFromTimezone(rec.activity.timezone));

  useEffect(() => {
    if (rec.activity.start_latlng && rec.activity.start_latlng.length === 2) {
      getCityName(rec.activity.start_latlng[0], rec.activity.start_latlng[1]).then((name) => {
        if (name) setCity(name);
      });
    }
  }, [rec.activity.id]);

  return (
    <div className="sr-record-card" onClick={() => onSelect(rec.activity)}>
      <div className="sr-record-top">
        <span className="sr-record-icon"><rec.icon size={16} strokeWidth={1.8} /></span>
        <span className="sr-record-label">{rec.label}</span>
      </div>
      <div className="sr-record-value">{rec.value}</div>
      <div className="sr-record-activity">
        <span className="sr-record-sport"><SportIcon size={14} color="var(--color-accent)" /></span>
        <span className="sr-record-name">{rec.activity.name}</span>
      </div>
      <div className="sr-record-meta">
        <span>{formatFullDate(rec.activity.start_date_local)}</span>
        {city && <span className="sr-record-loc"><MapPin size={11} strokeWidth={1.8} /> {city}</span>}
      </div>
    </div>
  );
}

export function StatsRecordsPage({
  activities, onSelect,
}: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [showAllSports, setShowAllSports] = useState(false);

  const years = useMemo(() => {
    const set = new Set(activities.map((a) => a.start_date_local.slice(0, 4)));
    return Array.from(set).sort();
  }, [activities]);

  // One year → its 12 months ("1".."12"); "Vše" → every month on a timeline ("2024-03")
  const monthlyData = useMemo(() => {
    const months: Record<string, { km: number; hours: number }> = {};
    if (selectedYear) {
      for (let m = 1; m <= 12; m++) months[String(m)] = { km: 0, hours: 0 };
    } else if (activities.length) {
      const first = activities.reduce((min, a) => (a.start_date_local < min ? a.start_date_local : min), activities[0].start_date_local);
      const now = new Date();
      let y = parseInt(first.slice(0, 4), 10), m = parseInt(first.slice(5, 7), 10);
      while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
        months[`${y}-${String(m).padStart(2, "0")}`] = { km: 0, hours: 0 };
        if (++m > 12) { m = 1; y++; }
      }
    }
    for (const a of activities) {
      if (selectedYear && !a.start_date_local.startsWith(selectedYear)) continue;
      const key = selectedYear ? String(parseInt(a.start_date_local.slice(5, 7), 10)) : a.start_date_local.slice(0, 7);
      if (!months[key]) continue;
      months[key].km += (a.distance || 0) / 1000;
      months[key].hours += activityDurationSecs(a) / 3600;
    }
    return Object.entries(months).map(([m, { km, hours }]) => ({
      name: m,
      km: Math.round(km * 10) / 10,
      hours: Math.round(hours * 10) / 10,
    }));
  }, [activities, selectedYear]);

  const sportData = useMemo(() => {
    const map = groupBySport(activities);
    return Array.from(map.entries())
      .map(([sport, acts]) => ({
        name: sportLabel(sport),
        value: acts.length,
      }))
      .sort((a, b) => b.value - a.value);
  }, [activities]);

  const dayData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const a of activities) {
      const day = new Date(a.start_date_local).getDay();
      counts[day]++;
    }
    const ordered = [1, 2, 3, 4, 5, 6, 0];
    return ordered.map((d) => ({
      name: CZECH_DAYS[d],
      value: counts[d],
    }));
  }, [activities]);

  // Records — only distance, duration, elevation
  const records = useMemo((): ActivityRecord[] => {
    const recs: (ActivityRecord | null)[] = [
      findRecord(activities, "Nejdelší vzdálenost", Ruler, (a) => a.distance, formatDistance),
      findRecord(activities, "Nejdelší aktivita", Timer, (a) => a.moving_time, formatDuration),
      findRecord(activities, "Největší převýšení", Mountain, (a) => a.total_elevation_gain, (v) => `${Math.round(v)} m`),
    ];
    return recs.filter((r): r is ActivityRecord => r !== null);
  }, [activities]);

  return (
    <div className="sr-layout">
      {/* TOP LEFT (3/4) — Statistics headline: year over year */}
      <section className="sr-section">
        <h2 className="sr-title">Statistiky</h2>
        <YearOverYearChart activities={activities} />
      </section>

      {/* RIGHT — Records */}
      <section className="sr-section">
        <h2 className="sr-title">Rekordy</h2>

        <div className="sr-records-grid">
          {records.map((rec) => (
            <RecordCard key={rec.label} rec={rec} onSelect={onSelect} />
          ))}
        </div>
      </section>

      {/* FULL WIDTH — monthly volume, then sport/day breakdown */}
      <section className="sr-section sr-section--wide">
        {/* Měsíční objem */}
        <div className="sr-card">
          <div className="sr-card-header">
            <h3 className="sr-card-title">Měsíční objem</h3>
            <div className="sr-year-tabs">
              <button className={`sr-year-tab ${selectedYear === null ? "active" : ""}`} onClick={() => setSelectedYear(null)}>
                Vše
              </button>
              {years.map((y) => (
                <button key={y} className={`sr-year-tab ${selectedYear === y ? "active" : ""}`} onClick={() => setSelectedYear(y)}>
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div className="sr-volume-legend">
            <span className="sr-volume-legend-item">
              <span className="sr-volume-legend-swatch sr-volume-legend-swatch--km" /> km
            </span>
            <span className="sr-volume-legend-item">
              <span className="sr-volume-legend-swatch sr-volume-legend-swatch--time" /> čas
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "rgba(33,33,31,0.4)" }}
                axisLine={{ stroke: "rgba(33,33,31,0.08)" }}
                tickLine={false}
                interval={selectedYear ? "preserveEnd" : 0}
                tickFormatter={(v: string) => (selectedYear ? v : v.endsWith("-01") ? v.slice(0, 4) : "")}
              />
              <YAxis
                yAxisId="km"
                tick={{ fontSize: 11, fill: "rgba(33,33,31,0.4)" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <YAxis
                yAxisId="hours"
                orientation="right"
                tick={{ fontSize: 11, fill: "rgba(33,33,31,0.4)" }}
                axisLine={false}
                tickLine={false}
                width={32}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip cursor={false} content={<VolumeTooltip />} />
              <Bar yAxisId="km" dataKey="km" fill="var(--color-accent)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              <Line
                yAxisId="hours"
                type="monotone"
                dataKey="hours"
                stroke="#6B8FC7"
                strokeWidth={2.5}
                dot={selectedYear ? { r: 3, fill: "#6B8FC7" } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="sr-charts-pair">
          {/* Rozložení sportů — top 10 by default, toggle for the rest */}
          <div className="sr-card sr-chart-half">
            <h3 className="sr-card-title">Rozložení sportů</h3>
            {(() => {
              const displayed = showAllSports ? sportData : sportData.slice(0, 10);
              return (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(220, displayed.length * 30)}>
                    <BarChart data={displayed} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "rgba(33,33,31,0.6)" }}
                        axisLine={false}
                        tickLine={false}
                        width={90}
                      />
                      <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                        <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "rgba(33,33,31,0.6)", fontWeight: 600 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  {sportData.length > 10 && (
                    <button
                      type="button"
                      className="sr-toggle-more"
                      onClick={() => setShowAllSports((v) => !v)}
                    >
                      {showAllSports
                        ? "Skrýt"
                        : `Zobrazit dalších ${sportData.length - 10}`}
                    </button>
                  )}
                </>
              );
            })()}
          </div>

          {/* Aktivita podle dne — horizontal bar, no tooltip/hover */}
          <div className="sr-card sr-chart-half">
            <h3 className="sr-card-title">Aktivita podle dne</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dayData} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "rgba(33,33,31,0.6)" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "rgba(33,33,31,0.6)", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
