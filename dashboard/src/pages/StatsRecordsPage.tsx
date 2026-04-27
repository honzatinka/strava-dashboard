import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import { Ruler, Timer, Mountain, Heart, HeartPulse, Zap, ThumbsUp } from "lucide-react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import {
  formatDistance, formatDuration, formatFullDate, formatSpeed, formatPace,
  groupBySport, sportLabel,
} from "../utils";
import "./StatsRecordsPage.css";

const CZECH_DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MONTH_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

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

export function StatsRecordsPage({
  activities, onSelect,
}: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  // Stats
  const totalKm = activities.reduce((s, a) => s + a.distance, 0);
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalElev = activities.reduce((s, a) => s + a.total_elevation_gain, 0);

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
      name: MONTH_LABELS[parseInt(m) - 1],
      count,
    }));
  }, [activities, selectedYear]);

  const sportData = useMemo(() => {
    const map = groupBySport(activities);
    return Array.from(map.entries())
      .map(([sport, acts]) => ({
        name: sportLabel(sport),
        value: acts.length,
        color: SPORT_COLORS[sport] || "#95a5a6",
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
    return ordered.map((d) => ({ name: CZECH_DAYS[d], count: counts[d] }));
  }, [activities]);

  // Records
  const records = useMemo((): ActivityRecord[] => {
    const recs: (ActivityRecord | null)[] = [
      findRecord(activities, "Nejdelší vzdálenost", Ruler, (a) => a.distance, formatDistance),
      findRecord(activities, "Nejdelší aktivita", Timer, (a) => a.moving_time, formatDuration),
      findRecord(activities, "Největší převýšení", Mountain, (a) => a.total_elevation_gain, (v) => `${Math.round(v)} m`),
      findRecord(activities, "Nejvyšší průměrný tep", Heart, (a) => a.average_heartrate || 0, (v) => `${Math.round(v)} bpm`, (a) => !!a.average_heartrate),
      findRecord(activities, "Nejvyšší max tep", HeartPulse, (a) => a.max_heartrate || 0, (v) => `${Math.round(v)} bpm`, (a) => !!a.max_heartrate),
      findRecord(activities, "Nejvyšší rychlost", Zap, (a) => a.max_speed, formatSpeed),
      findRecord(activities, "Nejvíce kudos", ThumbsUp, (a) => a.kudos_count, (v) => `${v} kudos`),
    ];
    return recs.filter((r): r is ActivityRecord => r !== null);
  }, [activities]);

  return (
    <div className="sr-layout">
      {/* LEFT — Statistics */}
      <section className="sr-section">
        <div className="sr-hero">
          <h2 className="sr-title">Statistiky</h2>
          <div className="sr-hero-grid">
            <div className="sr-hero-item">
              <span className="sr-hero-value">{formatDistance(totalKm)}</span>
              <span className="sr-hero-label">Vzdálenost</span>
            </div>
            <div className="sr-hero-item">
              <span className="sr-hero-value">{Math.round(totalTime / 3600)} h</span>
              <span className="sr-hero-label">Čas</span>
            </div>
            <div className="sr-hero-item">
              <span className="sr-hero-value">{(totalElev / 1000).toFixed(1)} km</span>
              <span className="sr-hero-label">Převýšení</span>
            </div>
            <div className="sr-hero-item">
              <span className="sr-hero-value">{activities.length}</span>
              <span className="sr-hero-label">Aktivit</span>
            </div>
          </div>
        </div>

        <div className="sr-chart-section">
          <div className="sr-chart-header">
            <h3>Měsíční objem</h3>
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
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#A8A29E" }} />
              <YAxis tick={{ fontSize: 10, fill: "#A8A29E" }} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: 8, color: "#1A1A1A", fontFamily: "inherit" }} />
              <Bar dataKey="count" fill="#E8825C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="sr-charts-pair">
          <div className="sr-chart-section sr-chart-half">
            <h3>Rozložení sportů</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sportData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {sportData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: 8, color: "#1A1A1A", fontFamily: "inherit" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="sr-chart-section sr-chart-half">
            <h3>Aktivita podle dne</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dayData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#A8A29E" }} />
                <YAxis tick={{ fontSize: 10, fill: "#A8A29E" }} />
                <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: 8, color: "#1A1A1A", fontFamily: "inherit" }} />
                <Bar dataKey="count" fill="#9B8574" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* RIGHT — Records */}
      <section className="sr-section">
        <h2 className="sr-title">Rekordy</h2>
        <p className="sr-subtitle">{records.length} osobních rekordů</p>

        <div className="sr-records-grid">
          {records.map((rec) => {
            const sport = rec.activity.sport_type || rec.activity.type;
            return (
              <div key={rec.label} className="sr-record-card" onClick={() => onSelect(rec.activity)}>
                <div className="sr-record-top">
                  <span className="sr-record-icon"><rec.icon size={18} strokeWidth={1.5} /></span>
                  <span className="sr-record-label">{rec.label}</span>
                </div>
                <div className="sr-record-value">{rec.value}</div>
                <div className="sr-record-activity">
                  <span className="sr-record-name">{(() => {
                    const SportIcon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
                    return <SportIcon size={14} strokeWidth={1.5} />;
                  })()} {rec.activity.name}</span>
                  <span className="sr-record-date">{formatFullDate(rec.activity.start_date_local)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
