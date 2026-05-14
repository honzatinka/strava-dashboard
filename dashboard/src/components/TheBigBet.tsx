import { useState, useEffect } from "react";
import type { Activity } from "../types";
import { SPORT_ICONS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance } from "../utils";
import "../pages/CombinedActivityCalendarPage.css";

interface FriendStats {
  name: string;
  photo: string | null;
  sports: { sport: string; dist: number; time: number }[];
}

interface ParticipantStatProps {
  name: string;
  dist: number;
  photo: string | null;
  isLeader: boolean;
}

function ParticipantStat({ name, dist, photo, isLeader }: ParticipantStatProps) {
  return (
    <div className={`cp-bigbet-pstat${isLeader ? " cp-bigbet-pstat--leader" : ""}`}>
      {photo ? (
        <img className="cp-bigbet-pstat-avatar" src={photo} alt={name} />
      ) : (
        <div className="cp-bigbet-pstat-avatar cp-bigbet-pstat-avatar--fb">{name[0]}</div>
      )}
      <span className="cp-bigbet-pstat-name">{name}</span>
      <span className="cp-bigbet-pstat-value">{formatDistance(dist)}</span>
    </div>
  );
}

interface SportRowProps {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  label: string;
  myDist: number;
  friendDist: number;
  friendName: string;
  friendPhoto: string | null;
  myPhoto: string | null;
}

function SportRow({ Icon, label, myDist, friendDist, friendName, friendPhoto, myPhoto }: SportRowProps) {
  // No leader if both 0 or exact tie with both > 0
  const myLeads = myDist > friendDist;
  const friendLeads = friendDist > myDist;

  return (
    <div className="cp-bigbet-sport">
      <div className="cp-bigbet-sport-head">
        <span className="cp-bigbet-sport-icon"><Icon size={20} strokeWidth={1.6} /></span>
        <span className="cp-bigbet-sport-label">{label}</span>
      </div>
      <div className="cp-bigbet-versus">
        <ParticipantStat name="Honza" dist={myDist} photo={myPhoto} isLeader={myLeads} />
        <ParticipantStat name={friendName} dist={friendDist} photo={friendPhoto} isLeader={friendLeads} />
      </div>
    </div>
  );
}

export function TheBigBet({ activities }: { activities: Activity[] }) {
  const [friend, setFriend] = useState<FriendStats | null>(null);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/friend-stats")
      .then(r => r.json())
      .then(d => !d.error && setFriend(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/athlete-profile")
      .then(r => r.json())
      .then(d => { if (d?.photoUrl) setMyPhoto(d.photoUrl); })
      .catch(() => {});
  }, []);

  const ytd = activities.filter(a => a.start_date_local.startsWith("2026"));
  // Trainer flag excluded ONLY for bike (Technogym/Zwift). Pool swims & treadmill runs count.
  const bikeDist = ytd.filter(a => ["Ride","GravelRide","MountainBikeRide","VirtualRide"].includes(a.sport_type) && a.trainer !== true).reduce((s,a) => s + a.distance, 0);
  const swimDist = ytd.filter(a => a.sport_type === "Swim").reduce((s,a) => s + a.distance, 0);
  const runDist  = ytd.filter(a => ["Run","VirtualRun","TrailRun"].includes(a.sport_type)).reduce((s,a) => s + a.distance, 0);

  const friendBike = friend?.sports.find(s => s.sport === "Ride")?.dist ?? 0;
  const friendRun  = friend?.sports.find(s => s.sport === "Run")?.dist  ?? 0;
  const friendSwim = friend?.sports.find(s => s.sport === "Swim")?.dist ?? 0;

  const BikeIcon = SPORT_ICONS["GravelRide"] || FALLBACK_SPORT_ICON;
  const RunIcon  = SPORT_ICONS["Run"]        || FALLBACK_SPORT_ICON;
  const SwimIcon = SPORT_ICONS["Swim"]       || FALLBACK_SPORT_ICON;

  const friendName = friend?.name?.split(" ")[0] || "Martin";
  const friendPhoto = friend?.photo ?? null;

  return (
    <div className="cp-bigbet">
      <div className="cp-bigbet-year">2026</div>
      <div className="cp-bigbet-title">The Big Bet</div>

      <SportRow Icon={BikeIcon} label="Bike"
        myDist={bikeDist} friendDist={friendBike}
        friendName={friendName} friendPhoto={friendPhoto} myPhoto={myPhoto} />

      <div className="cp-bigbet-divider" />

      <SportRow Icon={SwimIcon} label="Swim"
        myDist={swimDist} friendDist={friendSwim}
        friendName={friendName} friendPhoto={friendPhoto} myPhoto={myPhoto} />

      <div className="cp-bigbet-divider" />

      <SportRow Icon={RunIcon} label="Run"
        myDist={runDist} friendDist={friendRun}
        friendName={friendName} friendPhoto={friendPhoto} myPhoto={myPhoto} />
    </div>
  );
}
