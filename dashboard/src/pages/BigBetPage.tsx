import { useEffect, useState, useCallback } from "react";
import type { Activity } from "../types";
import { TheBigBet } from "../components/TheBigBet";
import { BigBetScoreChart } from "../components/BigBetScoreChart";
import { RecentActivitiesPair } from "../components/RecentActivitiesPair";
import { ActivityModal } from "../components/ActivityModal";
import "./BigBetPage.css";

interface FriendInfo { name: string; photo: string | null }

export function BigBetPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [friendActivities, setFriendActivities] = useState<Activity[]>([]);
  const [friendName, setFriendName] = useState<string>("Soupeř");
  const [friendPhoto, setFriendPhoto] = useState<string | null>(null);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [selectedFriendActivity, setSelectedFriendActivity] = useState<Activity | null>(null);

  useEffect(() => {
    fetch("/api/activities")
      .then(r => r.json())
      .then(setActivities)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/athlete-profile")
      .then(r => r.json())
      .then(d => { if (d?.photoUrl) setMyPhoto(d.photoUrl); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Friend raw activities (for score chart + recent feed) — may return [] on cold start while preload runs.
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

    // Friend name + photo from /api/friend-stats (already cached)
    fetch("/api/friend-stats")
      .then(r => r.json())
      .then((d: FriendInfo) => {
        if (d?.name) setFriendName(d.name);
        if (d?.photo) setFriendPhoto(d.photo);
      })
      .catch(() => {});
  }, []);

  const closeActivity = useCallback(() => setSelectedActivity(null), []);
  const closeFriendActivity = useCallback(() => setSelectedFriendActivity(null), []);

  return (
    <div className="bb-standalone">
      <a className="bb-back" href="/" title="Zpět na dashboard">
        <span className="bb-back-arrow material-symbols-outlined">arrow_back</span>
        Dashboard
      </a>
      <TheBigBet activities={activities} />
      {activities.length > 0 && friendActivities.length > 0 && (
        <>
          <BigBetScoreChart
            myActivities={activities}
            friendActivities={friendActivities}
            friendName={friendName}
          />
          <RecentActivitiesPair
            myActivities={activities}
            friendActivities={friendActivities}
            friendName={friendName.split(" ")[0] || "Soupeř"}
            myPhoto={myPhoto}
            friendPhoto={friendPhoto}
            onMyActivityClick={setSelectedActivity}
            onFriendActivityClick={(a) => setSelectedFriendActivity(a as Activity)}
          />
        </>
      )}
      {selectedActivity && (
        <ActivityModal activity={selectedActivity} onClose={closeActivity} />
      )}
      {selectedFriendActivity && (
        <ActivityModal activity={selectedFriendActivity} onClose={closeFriendActivity} isFriend />
      )}
    </div>
  );
}
