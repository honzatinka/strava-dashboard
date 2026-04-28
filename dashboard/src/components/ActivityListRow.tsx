import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON, COURT_SPORTS } from "../types";
import { sportLabel, locationFromTimezone, formatDistance, formatPace } from "../utils";
import { MapPin } from "lucide-react";
import "./ActivityListRow.css";

export function ActivityListRow({
  activity, onClick, city,
}: { activity: Activity; onClick: () => void; city?: string }) {
  const sport = activity.sport_type || activity.type;
  const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
  const color = SPORT_COLORS[sport] || "#E8E4DE";
  const isCourtSport = COURT_SPORTS.has(sport);
  const location = !isCourtSport ? (city || locationFromTimezone(activity.timezone)) : null;
  const pace = !isCourtSport ? formatPace(activity.average_speed, sport) : null;
  const mainStat = !isCourtSport && activity.distance > 0
    ? `${formatDistance(activity.distance)}`
    : `${Math.floor(activity.moving_time / 60)}m`;

  const date = new Date(activity.start_date_local).toLocaleDateString("cs-CZ");
  const hasGPS = !!activity.start_latlng;

  const hasLocation = !isCourtSport && hasGPS && !!location;

  return (
    <div
      className={`act-row${hasLocation ? "" : " act-row--no-location"}`}
      style={{ "--row-color": color } as React.CSSProperties}
      onClick={onClick}
    >
      <span className="act-row-date">{date}</span>

      <div className="act-row-sport">
        <Icon size={22} strokeWidth={1.6} color="var(--color-accent)" />
        <span className="act-row-type">{sportLabel(sport)}</span>
      </div>

      {hasLocation && (
        <span className="act-row-location">
          <MapPin size={11} strokeWidth={2} /> {location}
        </span>
      )}

      <div className="act-row-stats">
        {mainStat && <span className="act-row-stat">{mainStat}</span>}
        {pace && <span className="act-row-stat">{pace}</span>}
        {activity.average_heartrate && <span className="act-row-stat">{Math.round(activity.average_heartrate)} bpm</span>}
      </div>
    </div>
  );
}
