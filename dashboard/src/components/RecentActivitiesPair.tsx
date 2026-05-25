import type { Activity } from "../types";
import { resolveSportIcon } from "../types";
import { formatDistanceKm } from "../utils";
import "./RecentActivitiesPair.css";

interface ActivityCompact {
  id: number;
  name: string;
  start_date_local: string;
  sport_type: string;
  distance: number;
  moving_time?: number;
}

interface Props {
  myActivities: Activity[];
  friendActivities: ActivityCompact[];
  friendName: string;
  myPhoto: string | null;
  friendPhoto: string | null;
  onMyActivityClick?: (a: Activity) => void;
  onFriendActivityClick?: (a: ActivityCompact) => void;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  // Compare CALENDAR DAYS (not raw ms) — aktivita ve 20:00 včera a teď v 8:00 ráno
  // by jinak vyšla jako "Dnes" (rozdíl < 24h ⇒ Math.floor → 0).
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const diffDays = Math.round((todayStart - dStart) / 86_400_000);
  if (diffDays === 0) return "Dnes";
  if (diffDays === 1) return "Včera";
  if (diffDays < 7) return `Před ${diffDays} dny`;
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
}

function shortDur(seconds?: number): string | null {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function ActivityItem({ activity, onClick }: {
  activity: { name: string; sport_type: string; distance: number; moving_time?: number; start_date_local: string };
  onClick?: () => void;
}) {
  const Icon = resolveSportIcon(activity.sport_type, activity.name);
  const dur = shortDur(activity.moving_time);
  const hasDistance = activity.distance > 0;
  return (
    <div
      className={`rap-item${onClick ? " rap-item--clickable" : ""}`}
      onClick={onClick}
    >
      <div className="rap-item-icon">
        <Icon size={18} color="var(--color-accent)" />
      </div>
      <div className="rap-item-main">
        <span className="rap-item-name">{activity.name}</span>
        <span className="rap-item-meta">{formatShortDate(activity.start_date_local)}</span>
      </div>
      <div className="rap-item-stats">
        {hasDistance && <span className="rap-item-dist">{formatDistanceKm(activity.distance)}</span>}
        {dur && <span className="rap-item-dur">{dur}</span>}
      </div>
    </div>
  );
}

function ParticipantColumn({
  title, photo, activities, onItemClick,
}: {
  title: string;
  photo: string | null;
  activities: Array<{ id: number; name: string; sport_type: string; distance: number; moving_time?: number; start_date_local: string }>;
  onItemClick?: (a: any) => void;
}) {
  return (
    <div className="rap-col">
      <div className="rap-col-header">
        {photo ? (
          <img className="rap-col-avatar" src={photo} alt={title} />
        ) : (
          <div className="rap-col-avatar rap-col-avatar--fb">{title[0]}</div>
        )}
        <span className="rap-col-title">{title}</span>
      </div>
      <div className="rap-col-list">
        {activities.length === 0 ? (
          <div className="rap-empty">Žádné aktivity</div>
        ) : (
          activities.map(a => (
            <ActivityItem
              key={a.id}
              activity={a}
              onClick={onItemClick ? () => onItemClick(a) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function RecentActivitiesPair({
  myActivities, friendActivities, friendName, myPhoto, friendPhoto, onMyActivityClick, onFriendActivityClick,
}: Props) {
  const myRecent = [...myActivities]
    .filter(a => a.start_date_local)
    .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local))
    .slice(0, 3);

  const friendRecent = [...friendActivities]
    .filter(a => a.start_date_local)
    .sort((a, b) => b.start_date_local.localeCompare(a.start_date_local))
    .slice(0, 3);

  return (
    <div className="rap-card">
      <h3 className="rap-title">Poslední aktivity</h3>
      <div className="rap-grid">
        <ParticipantColumn
          title="Honza"
          photo={myPhoto}
          activities={myRecent}
          onItemClick={onMyActivityClick}
        />
        <ParticipantColumn
          title={friendName}
          photo={friendPhoto}
          activities={friendRecent}
          onItemClick={onFriendActivityClick}
        />
      </div>
    </div>
  );
}
