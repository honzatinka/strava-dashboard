import { useEffect, useState, useCallback } from "react";
import type { Activity, Page } from "./types";
import { Sidebar } from "./components/Sidebar";
import { BottomNav } from "./components/BottomNav";
import { ActivityModal } from "./components/ActivityModal";
import { CombinedActivityCalendarPage } from "./pages/CombinedActivityCalendarPage";
import { StatsRecordsPage } from "./pages/StatsRecordsPage";
import { HeatmapaPage } from "./pages/HeatmapaPage";
import { SportyMesicePage } from "./pages/SportyMesicePage";
import { BigBetPage } from "./pages/BigBetPage";
import { AktivityPage } from "./pages/AktivityPage";
import { ChangelogPage } from "./pages/ChangelogPage";
import "./App.css";

type ViewAs = "honza" | "martin";
const VIEW_AS_KEY = "strava-dashboard:view-as";

/**
 * Load initial view from URL (?view=martin) first, then localStorage, then default.
 * URL takes priority — useful for sharing links like /?view=martin
 */
function loadViewAs(): ViewAs {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlView = params.get("view");
    if (urlView === "martin" || urlView === "honza") return urlView;
  } catch {}
  try {
    const v = localStorage.getItem(VIEW_AS_KEY);
    if (v === "martin" || v === "honza") return v;
  } catch {}
  return "honza";
}

/** Sync viewAs into URL (without reload) and localStorage. */
function persistViewAs(view: ViewAs) {
  try { localStorage.setItem(VIEW_AS_KEY, view); } catch {}
  try {
    const url = new URL(window.location.href);
    if (view === "honza") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", view);
    }
    window.history.replaceState({}, "", url.toString());
  } catch {}
}

function Dashboard() {
  const [viewAs, setViewAs] = useState<ViewAs>(loadViewAs);
  const [myActivities, setMyActivities] = useState<Activity[]>([]);
  const [friendActivities, setFriendActivities] = useState<Activity[]>([]);
  const [activePage, setActivePage] = useState<Page>("dash");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const [friendPhoto, setFriendPhoto] = useState<string | null>(null);
  const [friendName, setFriendName] = useState<string>("Martin");

  // Fetch my activities (Strava — full history)
  useEffect(() => {
    fetch("/api/activities")
      .then((r) => r.json())
      .then((data: Activity[]) => setMyActivities(data));
  }, []);

  // Fetch friend activities (full history, retries on cold start)
  useEffect(() => {
    const fetchFriend = (attempt = 0) => {
      fetch("/api/friend-activities")
        .then((r) => r.json())
        .then((data: Activity[]) => {
          if (Array.isArray(data) && data.length > 0) {
            setFriendActivities(data);
          } else if (attempt < 3) {
            setTimeout(() => fetchFriend(attempt + 1), 4000);
          }
        })
        .catch(() => {});
    };
    fetchFriend();
  }, []);

  // My athlete profile
  useEffect(() => {
    fetch("/api/athlete-profile")
      .then((r) => r.json())
      .then((d) => { if (d.photoUrl) setMyPhoto(d.photoUrl); })
      .catch(() => {});
  }, []);

  // Friend profile (name + photo)
  useEffect(() => {
    fetch("/api/friend-stats")
      .then((r) => r.json())
      .then((d) => {
        if (d?.name) setFriendName(d.name);
        if (d?.photo) setFriendPhoto(d.photo);
      })
      .catch(() => {});
  }, []);

  // Persist viewAs to URL (?view=martin) + localStorage
  useEffect(() => {
    persistViewAs(viewAs);
  }, [viewAs]);

  const openActivity = useCallback((a: Activity) => setSelectedActivity(a), []);
  const closeActivity = useCallback(() => setSelectedActivity(null), []);

  const isFriendView = viewAs === "martin";
  const activeActivities = isFriendView ? friendActivities : myActivities;
  const activePhoto       = isFriendView ? friendPhoto : myPhoto;
  const activeName        = isFriendView ? friendName.split(" ")[0] || "Martin" : "Honza";

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        activities={activeActivities}
        athletePhoto={activePhoto}
        viewAs={viewAs}
        onChangeViewAs={setViewAs}
        myPhoto={myPhoto}
        friendPhoto={friendPhoto}
        friendName={friendName.split(" ")[0] || "Martin"}
        activeName={activeName}
      />
      <main className="main-content">
        <div className="main-inner">
          {/* Mobile-only view-as switcher (sidebar je hidden ≤768px) */}
          <div className="mobile-viewas">
            <button
              type="button"
              className={`mobile-viewas-btn${!isFriendView ? " mobile-viewas-btn--active" : ""}`}
              onClick={() => setViewAs("honza")}
            >
              {myPhoto ? <img src={myPhoto} alt="Honza" /> : <span>H</span>}
              Honza
            </button>
            <button
              type="button"
              className={`mobile-viewas-btn${isFriendView ? " mobile-viewas-btn--active" : ""}`}
              onClick={() => setViewAs("martin")}
            >
              {friendPhoto ? <img src={friendPhoto} alt={friendName} /> : <span>{(friendName.split(" ")[0] || "M")[0]}</span>}
              {friendName.split(" ")[0] || "Martin"}
            </button>
          </div>
          {activePage === "dash" && (
            <CombinedActivityCalendarPage activities={activeActivities} onSelect={openActivity} />
          )}
          {activePage === "activities" && <AktivityPage activities={activeActivities} onSelect={openActivity} />}
          {activePage === "statistiky" && <StatsRecordsPage activities={activeActivities} onSelect={openActivity} />}
          {activePage === "heatmapa" && <HeatmapaPage activities={activeActivities} />}
          {activePage === "changelog" && <ChangelogPage />}
          {activePage === "sporty-mesice" && <SportyMesicePage activities={activeActivities} />}
        </div>
      </main>
      <BottomNav activePage={activePage} onNavigate={setActivePage} />
      {selectedActivity && (
        <ActivityModal activity={selectedActivity} onClose={closeActivity} isFriend={isFriendView} />
      )}
    </div>
  );
}

export default function App() {
  if (window.location.pathname === "/bet") return <BigBetPage />;
  return <Dashboard />;
}
