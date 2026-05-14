import { useEffect, useState } from "react";
import type { Activity } from "../types";
import { TheBigBet } from "../components/TheBigBet";
import { BigBetScoreChart } from "../components/BigBetScoreChart";
import "./BigBetPage.css";

interface FriendInfo { name: string; }

export function BigBetPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [friendActivities, setFriendActivities] = useState<Activity[]>([]);
  const [friendName, setFriendName] = useState<string>("Soupeř");

  useEffect(() => {
    fetch("/api/activities")
      .then(r => r.json())
      .then(setActivities)
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Friend raw activities (for score chart) — may return [] on cold start while preload runs.
    // Retry after 4s if empty.
    const fetchFriend = (attempt = 0) => {
      fetch("/api/friend-activities")
        .then(r => r.json())
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

    // Friend name from /api/friend-stats (already cached)
    fetch("/api/friend-stats")
      .then(r => r.json())
      .then((d: FriendInfo) => { if (d?.name) setFriendName(d.name); })
      .catch(() => {});
  }, []);

  return (
    <div className="bb-standalone">
      <TheBigBet activities={activities} />
      {activities.length > 0 && friendActivities.length > 0 && (
        <BigBetScoreChart
          myActivities={activities}
          friendActivities={friendActivities}
          friendName={friendName}
        />
      )}
    </div>
  );
}
