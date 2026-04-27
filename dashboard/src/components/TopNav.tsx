import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { Activity, Page } from "../types";
import { HamburgerMenu } from "./HamburgerMenu";
import "./TopNav.css";

interface TopNavProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  activityCount: number;
  activities: Activity[];
  athletePhoto: string | null;
}

export function TopNav({ activePage, onNavigate, activityCount, activities, athletePhoto }: TopNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          {/* Avatar místo loga */}
          <div className="topnav-brand">
            {athletePhoto ? (
              <img className="topnav-avatar" src={athletePhoto} alt="Profil" />
            ) : (
              <span className="topnav-avatar topnav-avatar--fallback">S</span>
            )}
          </div>

          <div className="topnav-spacer" />

          {/* Hamburger tlačítko */}
          <button
            className={`topnav-hamburger ${menuOpen ? "topnav-hamburger--open" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>
        </div>
      </header>

      <HamburgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activePage={activePage}
        onNavigate={onNavigate}
        activityCount={activityCount}
      />
    </>
  );
}
