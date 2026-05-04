import { useEffect, useState } from "react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON, COURT_SPORTS } from "../types";
import { formatDistance, formatPace, locationFromTimezone } from "../utils";
import { getCityName } from "../utils/geocode";
import "./ActivityRow.css";

function shortDur(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
}

function formatRowDate(iso: string, city?: string | null): string {
  const d = new Date(iso);
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();
  const yearPart = year !== currentYear ? `, ${year}` : "";
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${month} ${day}${yearPart} at ${time}, ${city || weekday}`;
}

interface Props {
  activity: Activity;
  onClick: () => void;
  photoUrl?: string;
  city?: string;
}

export function ActivityRow({ activity, onClick, photoUrl, city: cityProp }: Props) {
  const sport = activity.sport_type || activity.type;
  const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
  const color = SPORT_COLORS[sport] || "#FF4400";
  const isCourtSport = COURT_SPORTS.has(sport);
  const pace = !isCourtSport ? formatPace(activity.average_speed, sport) : null;

  // Resolve location using same rules as calendar popup: try props first,
  // then reverse-geocode start_latlng, fall back to timezone.
  const [city, setCity] = useState<string | null>(
    cityProp ?? locationFromTimezone(activity.timezone),
  );
  useEffect(() => {
    if (cityProp) { setCity(cityProp); return; }
    if (activity.start_latlng && activity.start_latlng.length === 2) {
      getCityName(activity.start_latlng[0], activity.start_latlng[1]).then((name) => {
        if (name) setCity(name);
      });
    }
  }, [activity.id, cityProp]);

  return (
    <div
      className="act-row"
      style={{ "--row-color": color } as React.CSSProperties}
      onClick={onClick}
    >
      {/* Sport icon */}
      <div className="act-row-icon">
        <Icon size={18} strokeWidth={1.8} color="var(--color-accent)" />
      </div>

      {/* Name + meta */}
      <div className="act-row-info">
        <span className="act-row-meta">{formatRowDate(activity.start_date_local, city)}</span>
        <span className="act-row-name">{activity.name}</span>
      </div>

      {/* Stats — order: Time, Distance, Elevation, Tempo, Avg HR */}
      <div className="act-row-stats">
        <div className="act-row-stat">
          <span className="act-row-stat-label">Time</span>
          <span className="act-row-stat-value act-row-stat-value--accent">{shortDur(activity.moving_time)}</span>
        </div>
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
        {activity.average_heartrate && (
          <div className="act-row-stat">
            <span className="act-row-stat-label">Avg HR</span>
            <span className="act-row-stat-value">{Math.round(activity.average_heartrate)} bpm</span>
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
