import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance, formatDuration, formatDate, formatPace, sportLabel, locationFromTimezone } from "../utils";
import { MapPin, ExternalLink } from "lucide-react";
import "./ActivityCard.css";

export function ActivityCard({ activity, onClick, photoUrl }: { activity: Activity; onClick?: () => void; photoUrl?: string }) {
  const sport = activity.sport_type || activity.type;
  const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
  const color = SPORT_COLORS[sport] || "#95a5a6";
  const pace = formatPace(activity.average_speed, sport);
  const location = locationFromTimezone(activity.timezone);

  return (
    <div className={`card ${onClick ? "card-clickable" : ""}`} style={{ "--accent-color": color, "--photo-url": photoUrl ? `url(${photoUrl})` : "none" } as React.CSSProperties} onClick={onClick}>
      {photoUrl && <div className="card-photo"></div>}
      <div className="card-header">
        <span className="sport-badge">
          <Icon size={14} strokeWidth={1.5} />
          {sportLabel(sport)}
        </span>
        <span className="date">{formatDate(activity.start_date_local)}</span>
      </div>
      <h3 className="card-title">{activity.name}</h3>
      {location && <span className="card-location"><MapPin size={12} strokeWidth={1.5} /> {location}</span>}
      <a
        className="card-strava-link"
        href={`https://www.strava.com/activities/${activity.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={11} strokeWidth={1.5} /> Zobrazit na Stravě
      </a>
      <div className="card-stats">
        {activity.distance > 0 && (
          <div className="stat">
            <span className="stat-value">{formatDistance(activity.distance)}</span>
            <span className="stat-label">Vzdálenost</span>
          </div>
        )}
        <div className="stat">
          <span className="stat-value">{formatDuration(activity.moving_time)}</span>
          <span className="stat-label">Čas</span>
        </div>
        {activity.total_elevation_gain > 0 && (
          <div className="stat">
            <span className="stat-value">{Math.round(activity.total_elevation_gain)} m</span>
            <span className="stat-label">Převýšení</span>
          </div>
        )}
        {pace && (
          <div className="stat">
            <span className="stat-value">{pace}</span>
            <span className="stat-label">Tempo</span>
          </div>
        )}
        {activity.average_heartrate && (
          <div className="stat">
            <span className="stat-value">{Math.round(activity.average_heartrate)}</span>
            <span className="stat-label">Avg HR</span>
          </div>
        )}
      </div>
    </div>
  );
}
