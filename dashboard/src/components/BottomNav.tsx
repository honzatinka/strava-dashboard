import type { Page } from "../types";
import { NAV_ICONS } from "../types";
import "./BottomNav.css";

interface BottomNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "dash",       label: "Dash"       },
  { id: "activities", label: "Activities" },
  { id: "statistiky", label: "Stats"      },
  { id: "heatmapa",   label: "Map"        },
  { id: "changelog",  label: "Log"        },
];

export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ id, label }) => {
        const Icon = NAV_ICONS[id as keyof typeof NAV_ICONS];
        const isActive = activePage === id;
        return (
          <button
            key={id}
            className={`bottom-nav-item${isActive ? " is-active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={22} color={isActive ? "var(--color-accent)" : "var(--color-text-muted)"} />
            <span className="bottom-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
