import { useEffect, useRef } from "react";
import type { Page } from "../types";
import { BarChart3, Target, Map, CalendarDays } from "lucide-react";
import "./HamburgerMenu.css";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
  activePage: Page;
  onNavigate: (page: Page) => void;
  activityCount: number;
}

const NAV_ITEMS = [
  { id: "statistiky"    as Page, label: "Přehledy",        icon: BarChart3 },
  { id: "sporty"        as Page, label: "Sporty",           icon: Target },
  { id: "heatmapa"      as Page, label: "Mapa",             icon: Map },
  { id: "sporty-mesice" as Page, label: "Sporty v měsíci",  icon: CalendarDays },
];

export function HamburgerMenu({ open, onClose, activePage, onNavigate, activityCount }: HamburgerMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Zavři klikem mimo panel
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  // Zavři Escapem
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="hm-backdrop" />}
      <div ref={panelRef} className={`hm-panel${open ? " hm-panel--open" : ""}`}>
        <div className="hm-inner">

          {/* Navigace */}
          <div className="hm-section">
            <div className="hm-section-title">Sekce</div>
            <nav className="hm-nav">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`hm-nav-item${activePage === id ? " hm-nav-item--active" : ""}`}
                  onClick={() => { onNavigate(id); onClose(); }}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="hm-footer">
            Postaveno na datech z {activityCount} aktivit.
          </div>
        </div>
      </div>
    </>
  );
}
