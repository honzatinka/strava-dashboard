import { useState, useMemo, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { ActivityRow } from "../components/ActivityRow";
import {
  formatDistance, formatDuration, groupBySport, groupByMonth, sportLabel,
} from "../utils";
import "./AktivityPage.css";

const PAGE_SIZE = 10;
const MONTH_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function AktivityPage({ activities, onSelect }: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [open, setOpen] = useState(false);
  const [photoCache, setPhotoCache] = useState<Record<number, string>>({});

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

  // Load photo thumbnails for visible
  useEffect(() => {
    const toLoad = visible
      .filter((a) => (a.total_photo_count ?? 0) > 0 && !photoCache[a.id])
      .map((a) => a.id)
      .slice(0, 12);
    if (!toLoad.length) return;
    fetch("/api/batch-thumbs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityIds: toLoad }),
    })
      .then((r) => r.json())
      .then((data: Record<number, string>) => {
        if (Object.keys(data).length) setPhotoCache((p) => ({ ...p, ...data }));
      })
      .catch(() => {});
  }, [visible]);

  // Sport stats (for selected filter or "all")
  const sportTotalKm = filtered.reduce((s, a) => s + a.distance, 0);
  const sportTotalTime = filtered.reduce((s, a) => s + a.moving_time, 0);
  const sportTotalElev = filtered.reduce((s, a) => s + a.total_elevation_gain, 0);
  const withHr = filtered.filter((a) => a.average_heartrate);
  const avgHr = withHr.length > 0
    ? Math.round(withHr.reduce((s, a) => s + (a.average_heartrate || 0), 0) / withHr.length)
    : null;
  const avgKm = filtered.length > 0 && sportTotalKm > 0 ? sportTotalKm / filtered.length : 0;

  const trendData = useMemo(() => {
    const byMonth = groupByMonth(filtered);
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
  }, [filtered]);

  const SelectedIcon = filter ? (SPORT_ICONS[filter] || FALLBACK_SPORT_ICON) : null;

  return (
    <div className="ap-root">
      {/* Header with select-box */}
      <div className="ap-header">
        <h1 className="ap-title">{filter ? sportLabel(filter) : "Activities"}</h1>

        <div className={`ap-select ${open ? "ap-select--open" : ""}`}>
          <button className="ap-select-trigger" onClick={() => setOpen((v) => !v)}>
            {SelectedIcon && <SelectedIcon size={16} color="var(--color-accent)" />}
            <span className="ap-select-label">
              {filter ? `${sportLabel(filter)} (${filtered.length})` : `All sports (${activities.length})`}
            </span>
            <ChevronDown size={14} strokeWidth={2} className="ap-select-chevron" />
          </button>

          {open && (
            <div className="ap-select-menu">
              <button
                className={`ap-select-item ${filter === null ? "active" : ""}`}
                onClick={() => { setFilter(null); setVisibleCount(PAGE_SIZE); setOpen(false); }}
              >
                <span className="ap-select-item-label">All sports</span>
                <span className="ap-select-item-count">({activities.length})</span>
              </button>
              {sportCounts.map(({ sport, count }) => {
                const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
                return (
                  <button
                    key={sport}
                    className={`ap-select-item ${filter === sport ? "active" : ""}`}
                    onClick={() => { setFilter(sport); setVisibleCount(PAGE_SIZE); setOpen(false); }}
                  >
                    <Icon size={14} color="var(--color-accent)" />
                    <span className="ap-select-item-label">{sportLabel(sport)}</span>
                    <span className="ap-select-item-count">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sport stats */}
      <div className="ap-stats">
        <div className="ap-stat-card">
          <span className="ap-stat-value">{filtered.length}</span>
          <span className="ap-stat-label">Activities</span>
        </div>
        {sportTotalKm > 0 && (
          <div className="ap-stat-card">
            <span className="ap-stat-value">{formatDistance(sportTotalKm)}</span>
            <span className="ap-stat-label">Distance</span>
          </div>
        )}
        <div className="ap-stat-card">
          <span className="ap-stat-value">{formatDuration(sportTotalTime)}</span>
          <span className="ap-stat-label">Time</span>
        </div>
        {sportTotalElev > 0 && (
          <div className="ap-stat-card">
            <span className="ap-stat-value">{(sportTotalElev / 1000).toFixed(1)} km</span>
            <span className="ap-stat-label">Elevation</span>
          </div>
        )}
        {avgKm > 0 && (
          <div className="ap-stat-card">
            <span className="ap-stat-value">{formatDistance(avgKm)}</span>
            <span className="ap-stat-label">Avg / activity</span>
          </div>
        )}
        {avgHr && (
          <div className="ap-stat-card">
            <span className="ap-stat-value">{avgHr} bpm</span>
            <span className="ap-stat-label">Avg HR</span>
          </div>
        )}
      </div>

      {/* Trend chart */}
      {trendData.length > 2 && (
        <div className="ap-chart-card">
          <h3 className="ap-chart-title">Vývoj v čase</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "rgba(33,33,31,0.4)" }}
                interval={Math.max(0, Math.floor(trendData.length / 12) - 1)}
                axisLine={{ stroke: "rgba(33,33,31,0.08)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "rgba(33,33,31,0.4)" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid rgba(33,33,31,0.08)", borderRadius: 8, color: "#21211F", fontFamily: "inherit" }} />
              <Line
                type="monotone"
                dataKey="count"
                name="Aktivit"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-accent)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Activity list — homepage style rows */}
      <div className="ap-list">
        {visible.map((a) => (
          <ActivityRow
            key={a.id}
            activity={a}
            onClick={() => onSelect(a)}
            photoUrl={photoCache[a.id]}
          />
        ))}
      </div>

      {hasMore && (
        <button className="ap-load-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          Load more
        </button>
      )}
    </div>
  );
}
