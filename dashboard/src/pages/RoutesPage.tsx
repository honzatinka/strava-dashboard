import { useMemo, useState } from "react";
import type { Activity } from "../types";
import { resolveSportIcon } from "../types";
import { groupBySport, sportLabel, formatDistanceKm, formatDate } from "../utils";
import { RouteThumbnail } from "../components/RouteThumbnail";
import "./RoutesPage.css";

const PAGE_SIZE = 60;

/**
 * RoutesPage ("Routes") — Runna-style grid of route-shape thumbnails.
 * Shows every activity that has a GPS polyline, newest first, with a total-km
 * header and a per-sport filter. Tiles are clickable → existing ActivityModal.
 * Consumes the active view's activities, so it follows the Honza/Martin switch.
 */
export function RoutesPage({
  activities,
  onSelect,
}: {
  activities: Activity[];
  onSelect: (a: Activity) => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const withPolyline = useMemo(
    () =>
      activities
        .filter((a) => a.map?.summary_polyline && a.start_date_local)
        .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local)),
    [activities],
  );

  const sportCounts = useMemo(() => {
    const m = groupBySport(withPolyline);
    return Array.from(m.entries())
      .map(([sport, acts]) => ({ sport, count: acts.length }))
      .sort((a, b) => b.count - a.count);
  }, [withPolyline]);

  const filtered = filter
    ? withPolyline.filter((a) => (a.sport_type || a.type) === filter)
    : withPolyline;

  const totalDist = useMemo(
    () => filtered.reduce((s, a) => s + (a.distance || 0), 0),
    [filtered],
  );

  const visible = filtered.slice(0, limit);

  const selectFilter = (next: string | null) => {
    setFilter(next);
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="routes-page">
      <div className="routes-header">
        <div className="routes-total">{formatDistanceKm(totalDist)}</div>
        <div className="routes-sub">Zaznamenáno · {filtered.length} tras</div>
      </div>

      <div className="routes-filters">
        <button
          className={`rp-pill ${filter === null ? "active" : ""}`}
          onClick={() => selectFilter(null)}
        >
          Vše ({withPolyline.length})
        </button>
        {sportCounts.map(({ sport, count }) => (
          <button
            key={sport}
            className={`rp-pill ${filter === sport ? "active" : ""}`}
            onClick={() => selectFilter(filter === sport ? null : sport)}
          >
            {sportLabel(sport)} ({count})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="routes-empty">Žádné trasy s GPS záznamem.</div>
      ) : (
        <div className="routes-grid">
          {visible.map((a) => {
            const Icon = resolveSportIcon(a.sport_type || a.type, a.name);
            return (
              <button
                key={a.id}
                className="routes-tile"
                onClick={() => onSelect(a)}
                title={a.name}
              >
                <div className="routes-tile-thumb">
                  <RouteThumbnail activity={a} />
                </div>
                <div className="routes-tile-meta">
                  <span className="routes-tile-icon">
                    <Icon size={14} />
                  </span>
                  <span className="routes-tile-dist">{formatDistanceKm(a.distance)}</span>
                  <span className="routes-tile-date">{formatDate(a.start_date_local)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {filtered.length > limit && (
        <button className="routes-more" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          Zobrazit další ({filtered.length - limit})
        </button>
      )}
    </div>
  );
}
