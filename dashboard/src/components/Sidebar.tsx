import type { Activity, Page } from "../types";
import { NAV_ICONS } from "../types";
import "./Sidebar.css";

type ViewAs = "honza" | "martin";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  activities: Activity[];
  athletePhoto: string | null;
  viewAs: ViewAs;
  onChangeViewAs: (v: ViewAs) => void;
  myPhoto: string | null;
  friendPhoto: string | null;
  friendName: string;
  activeName: string;
}

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "dash",       label: "Dash & Bet" },
  { id: "activities", label: "Activities" },
  { id: "statistiky", label: "Statistics" },
  { id: "heatmapa",   label: "Map"        },
  { id: "trasy",      label: "Routes"     },
  { id: "changelog",  label: "Changelog"  },
];

export function Sidebar({
  activePage, onNavigate, activities, athletePhoto,
  viewAs, onChangeViewAs, myPhoto, friendPhoto, friendName, activeName,
}: SidebarProps) {
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalDist = activities.reduce((s, a) => s + a.distance, 0);
  const hours = Math.round(totalTime / 3600);
  const km = Math.round(totalDist / 1000);

  const isFriend = viewAs === "martin";

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        {athletePhoto ? (
          <img className="sidebar-avatar" src={athletePhoto} alt="Profil" />
        ) : (
          <div className="sidebar-avatar sidebar-avatar--fallback">{activeName[0]}</div>
        )}
        <div>
          <div className="sidebar-title">Dashboard</div>
          <div className="sidebar-sub">{activeName}</div>
        </div>
      </div>

      {/* View-as switcher */}
      <div className="sidebar-viewas" role="tablist" aria-label="Zobrazit jako">
        <button
          type="button"
          role="tab"
          aria-selected={!isFriend}
          className={`sidebar-viewas-btn${!isFriend ? " sidebar-viewas-btn--active" : ""}`}
          onClick={() => onChangeViewAs("honza")}
          title="Zobrazit data Honzy"
        >
          {myPhoto ? (
            <img className="sidebar-viewas-avatar" src={myPhoto} alt="Honza" />
          ) : (
            <div className="sidebar-viewas-avatar sidebar-viewas-avatar--fb">H</div>
          )}
          <span>Honza</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isFriend}
          className={`sidebar-viewas-btn${isFriend ? " sidebar-viewas-btn--active" : ""}`}
          onClick={() => onChangeViewAs("martin")}
          title={`Zobrazit data ${friendName}`}
        >
          {friendPhoto ? (
            <img className="sidebar-viewas-avatar" src={friendPhoto} alt={friendName} />
          ) : (
            <div className="sidebar-viewas-avatar sidebar-viewas-avatar--fb">{friendName[0]}</div>
          )}
          <span>{friendName}</span>
        </button>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, label }) => {
          const Icon = NAV_ICONS[id as keyof typeof NAV_ICONS];
          return (
            <button
              key={id}
              className={`sidebar-item${activePage === id ? " sidebar-item--active" : ""}`}
              onClick={() => onNavigate(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-spacer" />
      <div className="sidebar-divider" />

      {/* Bottom stats */}
      <div className="sidebar-stats">
        <div className="sidebar-stat">
          <span className="sidebar-stat-value">{activities.length}</span>
          <span className="sidebar-stat-label">Activities</span>
        </div>
        <div className="sidebar-stat">
          <span className="sidebar-stat-value">{hours} h</span>
          <span className="sidebar-stat-label">Time</span>
        </div>
        <div className="sidebar-stat">
          <span className="sidebar-stat-value">{km} km</span>
          <span className="sidebar-stat-label">Distance</span>
        </div>
      </div>
    </aside>
  );
}
