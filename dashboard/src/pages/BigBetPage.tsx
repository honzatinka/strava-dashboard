import { useEffect, useState } from "react";
import type { Activity } from "../types";
import { TheBigBet } from "../components/TheBigBet";
import "./BigBetPage.css";

export function BigBetPage() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetch("/activities.json")
      .then(r => r.json())
      .then(setActivities)
      .catch(() => {});
  }, []);

  return (
    <div className="bb-standalone">
      <TheBigBet activities={activities} />
    </div>
  );
}
