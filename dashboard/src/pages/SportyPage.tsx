import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance, formatDuration, groupBySport, groupByMonth, sportLabel } from "../utils";
import { ActivityCard } from "../components/ActivityCard";
import "./SportyPage.css";

const MONTH_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const ACTIVITIES_PER_PAGE = 6;

function darken(hex: string, f = 0.45) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

export function SportyPage({ activities, onSelect }: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const bySport = useMemo(() => {
    const map = groupBySport(activities);
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.length - a.length);
  }, [activities]);

  const [selected, setSelected] = useState(bySport[0]?.[0] || "");
  const [visibleCount, setVisibleCount] = useState(ACTIVITIES_PER_PAGE);

  const sportActivities = useMemo(() => {
    return activities.filter((a) => (a.sport_type || a.type) === selected);
  }, [activities, selected]);

  const displayedActivities = sportActivities.slice(0, visibleCount);

  const totalKm = sportActivities.reduce((s, a) => s + a.distance, 0);
  const totalTime = sportActivities.reduce((s, a) => s + a.moving_time, 0);
  const totalElev = sportActivities.reduce((s, a) => s + a.total_elevation_gain, 0);
  const withHr = sportActivities.filter((a) => a.average_heartrate);
  const avgHr = withHr.length > 0
    ? Math.round(withHr.reduce((s, a) => s + (a.average_heartrate || 0), 0) / withHr.length)
    : null;

  const trendData = useMemo(() => {
    const byMonth = groupByMonth(sportActivities);
    if (byMonth.size === 0) return [];

    const keys = Array.from(byMonth.keys()).sort();
    const startKey = keys[0];
    const endKey = keys[keys.length - 1];

    const [startYear, startMonth] = startKey.split("-").map(Number);
    const [endYear, endMonth] = endKey.split("-").map(Number);

    const data: { name: string; count: number }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd = y === endYear ? endMonth : 12;
      for (let m = mStart; m <= mEnd; m++) {
        const key = `${y}-${String(m).padStart(2, "0")}`;
        const acts = byMonth.get(key) || [];
        data.push({ name: `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`, count: acts.length });
      }
    }
    return data;
  }, [sportActivities]);

  const color = SPORT_COLORS[selected] || "#95a5a6";
  const textColor = darken(color);
  const SportIcon = SPORT_ICONS[selected] || FALLBACK_SPORT_ICON;

  return (
    <div className="sporty-root">
      {/* Sport Selector — na vrchu */}
      <div className="sporty-selector">
        <h2 className="sporty-selector-title">Vyberte sport</h2>
        <div className="sporty-tabs">
          {bySport.map(([sport, acts]) => (
            <button
              key={sport}
              className={`sporty-tab ${selected === sport ? "active" : ""}`}
              style={{ "--tab-color": SPORT_COLORS[sport] || "#95a5a6" } as React.CSSProperties}
              onClick={() => {
                setSelected(sport);
                setVisibleCount(ACTIVITIES_PER_PAGE);
              }}
            >
              {(() => { const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON; return <Icon size={13} strokeWidth={2} />; })()}
              {sportLabel(sport)} <span className="sporty-tab-count">{acts.length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sport Box — info o vybraném sportu */}
      <div className="sporty-box" style={{ "--sport-color": color, "--sport-text": textColor } as React.CSSProperties}>
        <div className="sporty-box-header">
          <div className="sporty-box-icon">
            <SportIcon size={32} strokeWidth={2} color={textColor} />
          </div>
          <div className="sporty-box-title-group">
            <h1 className="sporty-box-title">{sportLabel(selected)}</h1>
            <p className="sporty-box-subtitle">
              {sportActivities.length} aktivit · {formatDuration(totalTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Statistiky — formátované */}
      <section className="sporty-stats">
        <div className="sporty-stat-card">
          <span className="sporty-stat-value">{sportActivities.length}</span>
          <span className="sporty-stat-label">Počet aktivit</span>
        </div>
        {totalKm > 0 && (
          <div className="sporty-stat-card">
            <span className="sporty-stat-value">{formatDistance(totalKm)}</span>
            <span className="sporty-stat-label">Celková vzdálenost</span>
          </div>
        )}
        <div className="sporty-stat-card">
          <span className="sporty-stat-value">{formatDuration(totalTime)}</span>
          <span className="sporty-stat-label">Celkový čas</span>
        </div>
        {totalElev > 0 && (
          <div className="sporty-stat-card">
            <span className="sporty-stat-value">{(totalElev / 1000).toFixed(1)} km</span>
            <span className="sporty-stat-label">Převýšení</span>
          </div>
        )}
        {totalKm > 0 && sportActivities.length > 0 && (
          <div className="sporty-stat-card">
            <span className="sporty-stat-value">{formatDistance(totalKm / sportActivities.length)}</span>
            <span className="sporty-stat-label">Průměr na aktivitu</span>
          </div>
        )}
        {avgHr && (
          <div className="sporty-stat-card">
            <span className="sporty-stat-value">{avgHr} bpm</span>
            <span className="sporty-stat-label">Průměrný srdeční tep</span>
          </div>
        )}
      </section>

      {/* Graf — vývoj v čase */}
      {trendData.length > 2 && (
        <section className="sporty-chart">
          <h2>Vývoj v čase</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#A8A29E" }}
                interval={Math.max(0, Math.floor(trendData.length / 12) - 1)}
              />
              <YAxis tick={{ fontSize: 12, fill: "#A8A29E" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: 8, color: "#1A1A1A", fontFamily: "inherit" }} />
              <Line
                type="monotone"
                dataKey="count"
                name="Aktivit"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Aktivity — s možností načíst více */}
      {displayedActivities.length > 0 && (
        <section className="sporty-activities">
          <h2>Aktivity ({visibleCount} z {sportActivities.length})</h2>
          <div className="sporty-activities-grid">
            {displayedActivities.map((a) => (
              <ActivityCard key={a.id} activity={a} onClick={() => onSelect(a)} />
            ))}
          </div>
          {visibleCount < sportActivities.length && (
            <button className="sporty-load-more" onClick={() => setVisibleCount((c) => c + ACTIVITIES_PER_PAGE)}>
              Načíst další ({sportActivities.length - visibleCount} zbývá)
            </button>
          )}
        </section>
      )}
    </div>
  );
}
