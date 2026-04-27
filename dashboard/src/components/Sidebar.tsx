import type { Activity, Page } from "../types";
import { BarChart3, Bike, Map, Activity as ActivityIcon } from "lucide-react";
import "./Sidebar.css";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  activities: Activity[];
  athletePhoto: string | null;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "aktivity",   label: "Activities", icon: ActivityIcon },
  { id: "statistiky", label: "Statistics", icon: BarChart3 },
  { id: "sporty",     label: "Sports",     icon: Bike },
  { id: "heatmapa",   label: "Map",        icon: Map },
];

export function Sidebar({ activePage, onNavigate, activities, athletePhoto }: SidebarProps) {
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0);
  const totalDist = activities.reduce((s, a) => s + a.distance, 0);
  const hours = Math.round(totalTime / 3600);
  const km = Math.round(totalDist / 1000);

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        {athletePhoto ? (
          <img className="sidebar-avatar" src={athletePhoto} alt="Profil" />
        ) : (
          <div className="sidebar-avatar sidebar-avatar--fallback">H</div>
        )}
        <div>
          <div className="sidebar-title">Dashboard</div>
          <div className="sidebar-sub">Honza</div>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar-item${activePage === id ? " sidebar-item--active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
          </button>
        ))}
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
