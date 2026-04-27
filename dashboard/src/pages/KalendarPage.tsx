import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { groupByDate, formatDistance, formatDuration, czechMonth, sportLabel } from "../utils";

function shortDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? m : ""}`;
  return `${m}m`;
}

import "./KalendarPage.css";

const DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export function KalendarPage({ activities, onSelect }: { activities: Activity[]; onSelect: (a: Activity) => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDate = useMemo(() => groupByDate(activities), [activities]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = now.toISOString().slice(0, 10);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setSelectedDay(null);
  };

  const monthActivities = activities.filter((a) => {
    const key = a.start_date_local.slice(0, 7);
    return key === `${year}-${String(month + 1).padStart(2, "0")}`;
  });
  const totalKm = monthActivities.reduce((s, a) => s + a.distance, 0);
  const totalTime = monthActivities.reduce((s, a) => s + a.moving_time, 0);

  const selectedActivities = selectedDay ? byDate.get(selectedDay) || [] : [];

  return (
    <div>
      <div className="page-hero">
        <div className="hero-text">
          <h1 className="hero-title">Kalendář</h1>
          <div className="hero-stats">
            <span className="hero-stat-value">{monthActivities.length}</span> aktivit v {czechMonth(month).toLowerCase()}
            {totalKm > 0 && <><span className="hero-dot">&middot;</span><span className="hero-stat-value">{formatDistance(totalKm)}</span></>}
            {totalTime > 0 && <><span className="hero-dot">&middot;</span><span className="hero-stat-value">{formatDuration(totalTime)}</span></>}
          </div>
        </div>
      </div>

      <div className="cal-nav">
        <button className="cal-arrow" onClick={prevMonth}><ChevronLeft size={18} strokeWidth={2} /></button>
        <span className="cal-month">{czechMonth(month)} {year}</span>
        <button className="cal-arrow" onClick={nextMonth}><ChevronRight size={18} strokeWidth={2} /></button>
      </div>

      <div className="cal-grid">
        {DAYS.map((d) => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="cal-cell empty" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayActivities = byDate.get(dateStr) || [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDay;

          return (
            <div
              key={dateStr}
              className={`cal-cell ${dayActivities.length > 0 ? "has-activity" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => dayActivities.length > 0 && setSelectedDay(isSelected ? null : dateStr)}
            >
              <span className="cal-day-num">{day}</span>
              {dayActivities.length > 0 && (
                <div className="cal-activities">
                  {dayActivities.slice(0, 2).map((a) => {
                    const sport = a.sport_type || a.type;
                    return (
                      <div
                        key={a.id}
                        className="cal-activity"
                        style={{ "--sport-color": SPORT_COLORS[sport] || "#95a5a6" } as React.CSSProperties}
                      >
                        <span className="cal-act-icon">{(() => { const SportIcon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON; return <SportIcon size={12} strokeWidth={1.5} />; })()}</span>
                        <span className="cal-act-dur">{shortDuration(a.moving_time)}</span>
                      </div>
                    );
                  })}
                  {dayActivities.length > 2 && (
                    <span className="cal-more">+{dayActivities.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="cal-summary">
        {czechMonth(month)} {year} &middot; {monthActivities.length} aktivit
      </div>

      {selectedActivities.length > 0 && (
        <div className="cal-detail">
          {selectedActivities.map((a) => {
            const sport = a.sport_type || a.type;
            return (
              <div key={a.id} className="cal-detail-item" style={{ cursor: "pointer" }} onClick={() => onSelect(a)}>
                <span className="cal-detail-icon">{(() => { const SportIcon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON; return <SportIcon size={20} strokeWidth={1.5} />; })()}</span>
                <div className="cal-detail-info">
                  <strong>{a.name}</strong>
                  <span className="cal-detail-meta">
                    {sportLabel(sport)}
                    {a.distance > 0 && <> &middot; {formatDistance(a.distance)}</>}
                    {" "}&middot; {formatDuration(a.moving_time)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
