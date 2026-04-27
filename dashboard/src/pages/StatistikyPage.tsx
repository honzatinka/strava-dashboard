import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { Activity } from "../types";
import { SPORT_COLORS } from "../types";
import { formatDistance, formatDuration, groupBySport, sportLabel } from "../utils";
import "./StatistikyPage.css";

const CZECH_DAYS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MONTH_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function StatistikyPage({ activities }: { activities: Activity[] }) {
  const totalKm = activities.reduce((s, a) => s + a.distance, 0);
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalElev = activities.reduce((s, a) => s + a.total_elevation_gain, 0);

  const years = useMemo(() => {
    const set = new Set(activities.map((a) => a.start_date_local.slice(0, 4)));
    return Array.from(set).sort();
  }, [activities]);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  // Monthly volume
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

  // Sport distribution
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

  // Day of week
  const dayData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    for (const a of activities) {
      const day = new Date(a.start_date_local).getDay();
      counts[day]++;
    }
    // Reorder to Mon-Sun
    const ordered = [1, 2, 3, 4, 5, 6, 0];
    return ordered.map((d) => ({ name: CZECH_DAYS[d], count: counts[d] }));
  }, [activities]);

  return (
    <div>
      <div className="stats-hero">
        <div className="stats-hero-inner">
          <h1 className="stats-hero-title">Statistiky</h1>
          <div className="stats-hero-grid">
            <div className="stats-hero-item">
              <span className="stats-hero-value">{formatDistance(totalKm)}</span>
              <span className="stats-hero-label">Celková vzdálenost</span>
            </div>
            <div className="stats-hero-item">
              <span className="stats-hero-value">{Math.round(totalTime / 3600)} h</span>
              <span className="stats-hero-label">Celkový čas</span>
            </div>
            <div className="stats-hero-item">
              <span className="stats-hero-value">{(totalElev / 1000).toFixed(1)} km</span>
              <span className="stats-hero-label">Celkové převýšení</span>
            </div>
            <div className="stats-hero-item">
              <span className="stats-hero-value">{activities.length}</span>
              <span className="stats-hero-label">Aktivit celkem</span>
            </div>
            <div className="stats-hero-item">
              <span className="stats-hero-value">{activities.length > 0 ? formatDuration(Math.round(totalTime / activities.length)) : "–"}</span>
              <span className="stats-hero-label">Průměrná délka</span>
            </div>
          </div>
        </div>
      </div>

      <section className="chart-section">
        <div className="chart-header">
          <h2>Měsíční objem</h2>
          <div className="year-tabs">
            <button
              className={`year-tab ${selectedYear === null ? "active" : ""}`}
              onClick={() => setSelectedYear(null)}
            >
              Vše
            </button>
            {years.map((y) => (
              <button
                key={y}
                className={`year-tab ${selectedYear === y ? "active" : ""}`}
                onClick={() => setSelectedYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#A8A29E" }} />
            <YAxis tick={{ fontSize: 11, fill: "#A8A29E" }} />
            <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: 8, color: "#1A1A1A", fontFamily: "inherit" }} />
            <Bar dataKey="count" name="Aktivit" fill="#E8825C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className="charts-row">
        <section className="chart-section chart-half">
          <h2>Rozložení sportů</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sportData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {sportData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: 8, color: "#1A1A1A", fontFamily: "inherit" }} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: 12, color: "#6B6560" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="chart-section chart-half">
          <h2>Aktivita podle dne</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayData}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#A8A29E" }} />
              <YAxis tick={{ fontSize: 11, fill: "#A8A29E" }} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: 8, color: "#1A1A1A", fontFamily: "inherit" }} />
              <Bar dataKey="count" name="Aktivit" fill="#9B8574" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
}
