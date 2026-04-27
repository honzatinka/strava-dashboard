import { useState, useMemo } from "react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { ActivityCard } from "../components/ActivityCard";
import { formatDistance, formatDuration, groupBySport, sportLabel } from "../utils";
import "./AktivityPage.css";

const PAGE_SIZE = 10;

export function AktivityPage({ activities, onSelect }: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sportCounts = useMemo(() => {
    const map = groupBySport(activities);
    return Array.from(map.entries())
      .map(([sport, acts]) => ({ sport, count: acts.length }))
      .sort((a, b) => b.count - a.count);
  }, [activities]);

  const filtered = filter
    ? activities.filter((a) => (a.sport_type || a.type) === filter)
    : activities;

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const totalKm = activities.reduce((s, a) => s + a.distance, 0);
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);

  return (
    <div>
      <div className="page-hero">
        <div className="hero-text">
          <h1 className="hero-title">Aktivity</h1>
          <div className="hero-stats">
            <span className="hero-stat-value">{activities.length}</span> aktivit
            <span className="hero-dot">&middot;</span>
            <span className="hero-stat-value">{formatDistance(totalKm)}</span>
            <span className="hero-dot">&middot;</span>
            <span className="hero-stat-value">{Math.round(totalTime / 3600)} h</span>
          </div>
        </div>
      </div>

      <div className="filter-pills">
        <button
          className={`pill ${filter === null ? "active" : ""}`}
          onClick={() => { setFilter(null); setVisibleCount(PAGE_SIZE); }}
        >
          Vše ({activities.length})
        </button>
        {sportCounts.map(({ sport, count }) => (
          <button
            key={sport}
            className={`pill ${filter === sport ? "active" : ""}`}
            style={{ "--pill-color": SPORT_COLORS[sport] || "#95a5a6" } as React.CSSProperties}
            onClick={() => { setFilter(sport); setVisibleCount(PAGE_SIZE); }}
          >
            {(() => { const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON; return <Icon size={14} strokeWidth={1.5} />; })()} {sportLabel(sport)} ({count})
          </button>
        ))}
      </div>
      <div className="activity-grid">
        {visible.map((a) => (
          <ActivityCard key={a.id} activity={a} onClick={() => onSelect(a)} />
        ))}
      </div>
      {hasMore && (
        <button className="load-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          Zobrazit další
        </button>
      )}
    </div>
  );
}
