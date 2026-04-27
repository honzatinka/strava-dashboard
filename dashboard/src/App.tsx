import { useEffect, useState, useCallback } from "react";
import type { Activity, Page } from "./types";
import { Sidebar } from "./components/Sidebar";
import { ActivityModal } from "./components/ActivityModal";
import { CombinedActivityCalendarPage } from "./pages/CombinedActivityCalendarPage";
import { StatsRecordsPage } from "./pages/StatsRecordsPage";
import { SportyPage } from "./pages/SportyPage";
import { HeatmapaPage } from "./pages/HeatmapaPage";
import { SportyMesicePage } from "./pages/SportyMesicePage";
import { BigBetPage } from "./pages/BigBetPage";
import "./App.css";

function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activePage, setActivePage] = useState<Page>("aktivity");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [athletePhoto, setAthletePhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/activities.json")
      .then((r) => r.json())
      .then((data: Activity[]) => setActivities(data));
  }, []);

  useEffect(() => {
    fetch("/api/athlete-profile")
      .then((r) => r.json())
      .then((d) => { if (d.photoUrl) setAthletePhoto(d.photoUrl); })
      .catch(() => {});
  }, []);

  const openActivity = useCallback((a: Activity) => setSelectedActivity(a), []);
  const closeActivity = useCallback(() => setSelectedActivity(null), []);

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        activities={activities}
        athletePhoto={athletePhoto}
      />
      <main className="main-content">
        <div className="main-inner">
          {activePage === "aktivity" && (
            <CombinedActivityCalendarPage activities={activities} onSelect={openActivity} />
          )}
          {activePage === "statistiky" && <StatsRecordsPage activities={activities} onSelect={openActivity} />}
          {activePage === "sporty" && <SportyPage activities={activities} onSelect={openActivity} />}
          {activePage === "heatmapa" && <HeatmapaPage activities={activities} />}
          {activePage === "sporty-mesice" && <SportyMesicePage activities={activities} />}
        </div>
      </main>
      {selectedActivity && (
        <ActivityModal activity={selectedActivity} onClose={closeActivity} />
      )}
    </div>
  );
}

export default function App() {
  if (window.location.pathname === "/bet") return <BigBetPage />;
  return <Dashboard />;
}
