import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Ruler, Timer, Mountain, Heart, HeartPulse, Zap, ThumbsUp } from "lucide-react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance, formatDuration, formatFullDate, formatSpeed, groupBySport, sportLabel } from "../utils";
import "./RekordyPage.css";

interface Record {
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
): Record | null {
  const filtered = filter ? activities.filter(filter) : activities;
  if (filtered.length === 0) return null;
  const best = filtered.reduce((best, a) => selector(a) > selector(best) ? a : best);
  if (selector(best) <= 0) return null;
  return { label, icon, activity: best, value: formatter(selector(best)) };
}

export function RekordyPage({ activities, onSelect }: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const records = useMemo((): Record[] => {
    const recs: (Record | null)[] = [
      findRecord(activities, "Nejdelší vzdálenost", Ruler, (a) => a.distance, formatDistance),
      findRecord(activities, "Nejdelší aktivita", Timer, (a) => a.moving_time, formatDuration),
      findRecord(activities, "Největší převýšení", Mountain, (a) => a.total_elevation_gain, (v) => `${Math.round(v)} m`),
      findRecord(activities, "Nejvyšší průměrný tep", Heart, (a) => a.average_heartrate || 0, (v) => `${Math.round(v)} bpm`, (a) => !!a.average_heartrate),
      findRecord(activities, "Nejvyšší max tep", HeartPulse, (a) => a.max_heartrate || 0, (v) => `${Math.round(v)} bpm`, (a) => !!a.max_heartrate),
      findRecord(activities, "Nejvyšší rychlost", Zap, (a) => a.max_speed, formatSpeed),
      findRecord(activities, "Nejvíce kudos", ThumbsUp, (a) => a.kudos_count, (v) => `${v} kudos`),
    ];
    return recs.filter((r): r is Record => r !== null);
  }, [activities]);

  const sportRecords = useMemo(() => {
    const bySort = groupBySport(activities);
    return Array.from(bySort.entries())
      .filter(([, acts]) => acts.length >= 5)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([sport, acts]) => {
        const best: { label: string; value: string }[] = [];
        const maxDist = acts.reduce((best, a) => a.distance > best.distance ? a : best);
        if (maxDist.distance > 0) best.push({ label: "Nejdelší", value: formatDistance(maxDist.distance) });

        const maxTime = acts.reduce((best, a) => a.moving_time > best.moving_time ? a : best);
        best.push({ label: "Nejdelší čas", value: formatDuration(maxTime.moving_time) });

        const maxElev = acts.reduce((best, a) => a.total_elevation_gain > best.total_elevation_gain ? a : best);
        if (maxElev.total_elevation_gain > 0) best.push({ label: "Převýšení", value: `${Math.round(maxElev.total_elevation_gain)} m` });

        const withHr = acts.filter((a) => a.average_heartrate);
        if (withHr.length > 0) {
          const maxHr = withHr.reduce((best, a) => (a.average_heartrate || 0) > (best.average_heartrate || 0) ? a : best);
          best.push({ label: "Max avg HR", value: `${Math.round(maxHr.average_heartrate!)} bpm` });
        }

        return { sport, count: acts.length, records: best };
      });
  }, [activities]);

  return (
    <div>
      <div className="page-hero">
        <div className="hero-text">
          <h1 className="hero-title">Rekordy</h1>
          <div className="hero-stats">
            <span className="hero-stat-value">{records.length}</span> osobních rekordů
            <span className="hero-dot">&middot;</span>
            <span className="hero-stat-value">{sportRecords.length}</span> sportů
          </div>
        </div>
      </div>

      <div className="records-grid">
        {records.map((rec) => {
          const sport = rec.activity.sport_type || rec.activity.type;
          return (
            <div key={rec.label} className="record-card" style={{ cursor: "pointer" }} onClick={() => onSelect(rec.activity)}>
              <div className="record-top">
                <span className="record-icon"><rec.icon size={20} strokeWidth={1.5} /></span>
                <span className="record-label">{rec.label}</span>
              </div>
              <div className="record-value">{rec.value}</div>
              <div className="record-activity">
                <span>{(() => { const SportIcon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON; return <SportIcon size={16} strokeWidth={1.5} />; })()} {rec.activity.name}</span>
                <span className="record-date">{formatFullDate(rec.activity.start_date_local)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="section-title">Rekordy podle sportu</h2>
      <div className="sport-records">
        {sportRecords.map(({ sport, count, records }) => (
          <div
            key={sport}
            className="sport-record-card"
            style={{ borderTopColor: SPORT_COLORS[sport] || "#95a5a6" }}
          >
            <div className="sport-record-header">
              <span>{(() => { const SportIcon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON; return <SportIcon size={16} strokeWidth={1.5} />; })()} {sportLabel(sport)}</span>
              <span className="sport-record-count">{count}x</span>
            </div>
            <div className="sport-record-stats">
              {records.map((r) => (
                <div key={r.label} className="sport-record-stat">
                  <span className="stat-value">{r.value}</span>
                  <span className="stat-label">{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
