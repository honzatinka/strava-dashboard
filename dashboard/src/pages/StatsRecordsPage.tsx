import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { Ruler, Timer, Mountain, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Activity } from "../types";
import { SPORT_ICONS, FALLBACK_SPORT_ICON } from "../types";
import {
  formatDistance, formatDuration, formatFullDate,
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

function RecordCard({ rec, onSelect }: { rec: ActivityRecord; onSelect: (a: Activity) => void }) {
  const sport = rec.activity.sport_type || rec.activity.type;
  const SportIcon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
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

  const monthlyData = useMemo(() => {
    const filtered = selectedYear
      ? activities.filter((a) => a.start_date_local.startsWith(selectedYear))
      : activities;
    const months: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) months[String(m)] = 0;
    for (const a of filtered) {
      const m = String(parseInt(a.start_date_local.slice(5, 7)));
      months[m] = (months[m] || 0) + 1;
    }
    return Object.entries(months).map(([m, count]) => ({
      name: m, // numeric month label per request
      count,
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
      {/* LEFT — Statistics */}
      <section className="sr-section">
        <h2 className="sr-title">Statistiky</h2>

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
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "rgba(33,33,31,0.4)" }}
                axisLine={{ stroke: "rgba(33,33,31,0.08)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "rgba(33,33,31,0.4)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={false}
                labelFormatter={(label) => CZECH_MONTHS_FULL[parseInt(String(label)) - 1] || String(label)}
                formatter={(value) => [`${value} aktivit`, ""] as [string, string]}
                contentStyle={{ background: "#FFFFFF", border: "1px solid rgba(33,33,31,0.08)", borderRadius: 8, color: "#21211F", fontFamily: "inherit", padding: "8px 12px" }}
                labelStyle={{ fontWeight: 600, marginBottom: 2 }}
                itemStyle={{ color: "var(--color-accent)" }}
              />
              <Bar dataKey="count" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
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

      {/* RIGHT — Records */}
      <section className="sr-section">
        <h2 className="sr-title">Rekordy</h2>

        <div className="sr-records-grid">
          {records.map((rec) => (
            <RecordCard key={rec.label} rec={rec} onSelect={onSelect} />
          ))}
        </div>
      </section>
    </div>
  );
}
