import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON, COURT_SPORTS } from "../types";
import {
  groupByDate, formatDistance, czechMonth, formatPace,
} from "../utils";
import { getCityName } from "../utils/geocode";
import { TheBigBet } from "../components/TheBigBet";
import "./CombinedActivityCalendarPage.css";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const PAGE_SIZE = 15;

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstDayOfWeek(y: number, m: number) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function shortDur(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
}
function darken(hex: string, f = 0.45) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}
function formatRowDate(iso: string, city?: string): string {
  const d = new Date(iso);
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${month} ${day} at ${time}, ${city || weekday}`;
}


function ActivityRow({
  activity, onClick, photoUrl, city,
}: { activity: Activity; onClick: () => void; photoUrl?: string; city?: string }) {
  const sport = activity.sport_type || activity.type;
  const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
  const color = SPORT_COLORS[sport] || "#FF4400";
  const isCourtSport = COURT_SPORTS.has(sport);
  const pace = !isCourtSport ? formatPace(activity.average_speed, sport) : null;

  return (
    <div
      className="act-row"
      style={{ "--row-color": color } as React.CSSProperties}
      onClick={onClick}
    >
      {/* Sport icon */}
      <div className="act-row-icon">
        <Icon size={18} strokeWidth={1.8} />
      </div>

      {/* Name + meta */}
      <div className="act-row-info">
        <span className="act-row-meta">{formatRowDate(activity.start_date_local, city)}</span>
        <span className="act-row-name">{activity.name}</span>
      </div>

      {/* Stats */}
      <div className="act-row-stats">
        <div className="act-row-stat">
          <span className="act-row-stat-label">Time</span>
          <span className="act-row-stat-value act-row-stat-value--accent">{shortDur(activity.moving_time)}</span>
        </div>
        {activity.average_heartrate && (
          <div className="act-row-stat">
            <span className="act-row-stat-label">Avg HR</span>
            <span className="act-row-stat-value">{Math.round(activity.average_heartrate)} bpm</span>
          </div>
        )}
        {!isCourtSport && activity.distance > 0 && (
          <div className="act-row-stat">
            <span className="act-row-stat-label">Distance</span>
            <span className="act-row-stat-value">{formatDistance(activity.distance)}</span>
          </div>
        )}
        {!isCourtSport && activity.total_elevation_gain > 0 && (
          <div className="act-row-stat">
            <span className="act-row-stat-label">Elevation</span>
            <span className="act-row-stat-value">{Math.round(activity.total_elevation_gain)} m</span>
          </div>
        )}
        {pace && (
          <div className="act-row-stat">
            <span className="act-row-stat-label">Tempo</span>
            <span className="act-row-stat-value">{pace}</span>
          </div>
        )}
      </div>

      {/* Photo */}
      {photoUrl && (
        <div className="act-row-thumb" style={{ backgroundImage: `url(${photoUrl})` }} />
      )}
    </div>
  );
}

export function CombinedActivityCalendarPage({
  activities, onSelect,
}: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [photoCache, setPhotoCache] = useState<Record<number, string>>({});
  const [cityCache, setCityCache] = useState<Record<number, string>>({});

  const byDate = useMemo(() => groupByDate(activities), [activities]);

  const displayedActivities = useMemo(() => {
    if (selectedDay) return byDate.get(selectedDay) || [];
    return activities.slice(0, visibleCount);
  }, [selectedDay, activities, byDate, visibleCount]);

  // Load Strava thumbnails
  useEffect(() => {
    const toLoad = displayedActivities
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
  }, [displayedActivities]);

  // Load city names
  useEffect(() => {
    const load = async () => {
      const toLoad = displayedActivities.filter(
        (a) => a.start_latlng && a.start_latlng.length === 2 && !cityCache[a.id]
      );
      if (!toLoad.length) return;
      const updates: Record<number, string> = {};
      for (const a of toLoad) {
        const name = await getCityName(a.start_latlng![0], a.start_latlng![1]);
        if (name) updates[a.id] = name;
      }
      if (Object.keys(updates).length) setCityCache((p) => ({ ...p, ...updates }));
    };
    load();
  }, [displayedActivities]);

  // Calendar
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const today = now.toISOString().slice(0, 10);

  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1); setSelectedDay(null); };

  const monthActs = activities.filter((a) =>
    a.start_date_local.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)
  );
  const monthTotalSecs = monthActs.reduce((s, a) => s + a.moving_time, 0);
  const monthHH = Math.floor(monthTotalSecs / 3600);
  const monthMM = String(Math.floor((monthTotalSecs % 3600) / 60)).padStart(2, "0");
  const monthDist = monthActs.reduce((s, a) => s + a.distance, 0);

  // Previous month for deltas
  const prevY = month === 0 ? year - 1 : year;
  const prevM = month === 0 ? 12 : month;
  const prevMonthActs = activities.filter((a) =>
    a.start_date_local.startsWith(`${prevY}-${String(prevM).padStart(2,"0")}`)
  );
  const prevSecs = prevMonthActs.reduce((s, a) => s + a.moving_time, 0);
  const prevDist = prevMonthActs.reduce((s, a) => s + a.distance, 0);
  const deltaCount = monthActs.length - prevMonthActs.length;
  const deltaSecs  = monthTotalSecs - prevSecs;
  const deltaDist  = monthDist - prevDist;

  function fmtDelta(secs: number) {
    const abs = Math.abs(secs);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    return h > 0 ? `${h}h ${m > 0 ? m+"m" : ""}`.trim() : `${m}m`;
  }
  function fmtDistDelta(m: number) {
    const abs = Math.abs(m);
    return abs >= 1000 ? `${(abs/1000).toFixed(1)} km` : `${Math.round(abs)} m`;
  }

  return (
    <div className="cp-root">

      {/* ─── TOP: Calendar + The Big Bet (separate cards) ─── */}
      <div className="cp-top">
        <div className="cp-calendar-card">
        <div className="cp-calendar-wrapper">

          {/* Calendar header — single row: title | stats | nav */}
          <div className="cp-cal-header">
            <div className="cp-month-title">
              <span className="cp-month-name">{czechMonth(month)}</span>
              <span className="cp-year">{year}</span>
            </div>

            {monthActs.length > 0 && (
              <div className="cp-month-stats">
                <div className="cp-month-stat">
                  <span className="cp-month-stat-value">{monthActs.length} activities</span>
                  {prevMonthActs.length > 0 && (
                    <span className={`cp-month-stat-delta ${deltaCount >= 0 ? "cp-delta--up" : "cp-delta--down"}`}>
                      {deltaCount >= 0 ? "▲ " : "▼ "}{Math.abs(deltaCount)}
                    </span>
                  )}
                </div>
                <span className="cp-month-stat-sep">·</span>
                <div className="cp-month-stat">
                  <span className="cp-month-stat-value">{monthHH}h {monthMM}m</span>
                  {prevMonthActs.length > 0 && (
                    <span className={`cp-month-stat-delta ${deltaSecs >= 0 ? "cp-delta--up" : "cp-delta--down"}`}>
                      {deltaSecs >= 0 ? "▲ " : "▼ "}{fmtDelta(deltaSecs)}
                    </span>
                  )}
                </div>
                <span className="cp-month-stat-sep">·</span>
                <div className="cp-month-stat">
                  <span className="cp-month-stat-value">{formatDistance(monthDist)}</span>
                  {prevMonthActs.length > 0 && (
                    <span className={`cp-month-stat-delta ${deltaDist >= 0 ? "cp-delta--up" : "cp-delta--down"}`}>
                      {deltaDist >= 0 ? "▲ " : "▼ "}{fmtDistDelta(deltaDist)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="cp-nav">
              <button className="cp-arrow" onClick={prevMonth}><ChevronLeft size={16} strokeWidth={2} /></button>
              <button className="cp-arrow" onClick={nextMonth}><ChevronRight size={16} strokeWidth={2} /></button>
            </div>
          </div>

          {/* Day headers */}
          <div className="cp-day-headers">
            {DAYS.map((d, i) => <div key={i} className="cp-day-hdr">{d}</div>)}
          </div>

          {/* Calendar cells */}
          <div className="cp-cal-grid">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className="cp-cell cp-cell--empty" />;
              const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayActs = byDate.get(ds) || [];
              const isToday = ds === today;
              const isSel = ds === selectedDay;
              const firstSport = dayActs[0]?.sport_type || dayActs[0]?.type || "";
              const selColor = SPORT_COLORS[firstSport] || "#FF4400";
              return (
                <div
                  key={ds}
                  className={["cp-cell", dayActs.length ? "cp-cell--active" : "", isToday ? "cp-cell--today" : "", isSel ? "cp-cell--selected" : ""].join(" ")}
                  onClick={() => dayActs.length && setSelectedDay(isSel ? null : ds)}
                  style={isSel ? { "--sel-color": selColor } as React.CSSProperties : undefined}
                >
                  <span className="cp-cell-num">{day}</span>
                  {dayActs.length > 0 && (
                    <div className="cp-cell-acts">
                      {dayActs.slice(0, 2).map((a, idx) => {
                        const s = a.sport_type || a.type;
                        const c = SPORT_COLORS[s] || "#D4CFC9";
                        const Ic = SPORT_ICONS[s] || FALLBACK_SPORT_ICON;
                        return (
                          <div key={idx} className="cp-cell-act" style={{ background: c }}>
                            <Ic size={9} strokeWidth={2.5} color="#fff" />
                            <span className="cp-cell-act-dur" style={{ color: "#fff" }}>
                              {shortDur(a.moving_time)}
                            </span>
                          </div>
                        );
                      })}
                      {dayActs.length > 2 && <span className="cp-dot-more">+{dayActs.length-2}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedDay && (
            <button className="cp-clear-btn" onClick={() => setSelectedDay(null)}>✕ Clear filter</button>
          )}
        </div>
        </div>{/* end cp-calendar-card */}

        {/* The Big Bet — separate card */}
        <div className="cp-bigbet-card">
          <TheBigBet activities={activities} />
        </div>
      </div>

      {/* ─── Activity List ─── */}
      <div className="cp-list-header">
        <h2 className="cp-list-title">{selectedDay ? selectedDay : "Latest activities"}</h2>
        <span className="cp-list-count">{displayedActivities.length} activities</span>
      </div>

      <div className="cp-list">
        {displayedActivities.map((a) => (
          <ActivityRow
            key={a.id}
            activity={a}
            onClick={() => onSelect(a)}
            photoUrl={photoCache[a.id]}
            city={cityCache[a.id]}
          />
        ))}
      </div>

      {!selectedDay && visibleCount < activities.length && (
        <button className="cp-load-more" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          Load more
        </button>
      )}
      {displayedActivities.length === 0 && (
        <div className="cp-empty">No activities on this day</div>
      )}
    </div>
  );
}
