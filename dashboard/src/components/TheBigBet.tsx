import { useState, useEffect } from "react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance } from "../utils";
import "../pages/CombinedActivityCalendarPage.css";

interface FriendStats { name: string; photo: string | null; sports: { sport: string; dist: number; time: number }[] }

function DeltaBadge({ myDist, friendDist, friendPhoto, friendName, sportColor }: {
  myDist: number; friendDist: number; friendPhoto: string | null; friendName: string; sportColor: string;
}) {
  const delta = myDist - friendDist;
  const absDist = Math.abs(delta);
  const label = (delta >= 0 ? "+" : "–") + (absDist >= 1000
    ? `${(absDist / 1000).toFixed(1)}km`
    : `${Math.round(absDist)}m`);
  const ahead = delta >= 0;
  return (
    <div className="cp-bigbet-badge">
      {friendPhoto
        ? <img className="cp-bigbet-badge-avatar" src={friendPhoto} alt={friendName} />
        : <div className="cp-bigbet-badge-avatar cp-bigbet-badge-avatar--fb">{friendName[0]}</div>
      }
      <span
        className="cp-bigbet-badge-label"
        style={{ color: ahead ? sportColor : "var(--color-text-muted)" }}
      >{label}</span>
    </div>
  );
}

export function TheBigBet({ activities }: { activities: Activity[] }) {
  const [friend, setFriend] = useState<FriendStats | null>(null);

  useEffect(() => {
    fetch("/api/friend-stats")
      .then(r => r.json())
      .then(d => !d.error && setFriend(d))
      .catch(() => {});
  }, []);

  const ytd = activities.filter(a => a.start_date_local.startsWith("2026"));
  const bikeDist  = ytd.filter(a => ["Ride","GravelRide","MountainBikeRide","VirtualRide"].includes(a.sport_type)).reduce((s,a)=>s+a.distance,0);
  const ebikeDist = ytd.filter(a => a.sport_type==="EBikeRide").reduce((s,a)=>s+a.distance,0);
  const swimDist  = ytd.filter(a => a.sport_type==="Swim").reduce((s,a)=>s+a.distance,0);
  const runDist   = ytd.filter(a => ["Run","VirtualRun","TrailRun"].includes(a.sport_type)).reduce((s,a)=>s+a.distance,0);
  const combined  = bikeDist + ebikeDist * 0.25;

  const friendBike = friend?.sports.find(s => s.sport === "Ride")?.dist ?? 0;
  const friendRun  = friend?.sports.find(s => s.sport === "Run")?.dist  ?? 0;
  const friendSwim = friend?.sports.find(s => s.sport === "Swim")?.dist ?? 0;

  const BikeIcon = SPORT_ICONS["GravelRide"] || FALLBACK_SPORT_ICON;
  const RunIcon  = SPORT_ICONS["Run"]        || FALLBACK_SPORT_ICON;
  const SwimIcon = SPORT_ICONS["Swim"]       || FALLBACK_SPORT_ICON;

  const bikeColor = SPORT_COLORS["GravelRide"] || "#FFD580";
  const swimColor = SPORT_COLORS["Swim"]       || "#A0D4F5";
  const runColor  = SPORT_COLORS["Run"]        || "#FFAFA3";

  return (
    <div className="cp-bigbet">
      <div className="cp-bigbet-year">2026</div>
      <div className="cp-bigbet-title">The Big Bet</div>

      {/* Bike */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><BikeIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(combined)}</div>
        <div className="cp-bigbet-breakdown">
          <span>Bike <strong>{formatDistance(bikeDist)}</strong></span>
          <span>Ebike <strong>{formatDistance(ebikeDist)}</strong></span>
        </div>
        {friend && <DeltaBadge myDist={combined} friendDist={friendBike} friendPhoto={friend.photo} friendName={friend.name} sportColor={bikeColor} />}
      </div>

      <div className="cp-bigbet-divider" />

      {/* Swim */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><SwimIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(swimDist)}</div>
        {friend && <DeltaBadge myDist={swimDist} friendDist={friendSwim} friendPhoto={friend.photo} friendName={friend.name} sportColor={swimColor} />}
      </div>

      <div className="cp-bigbet-divider" />

      {/* Run */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><RunIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(runDist)}</div>
        {friend && <DeltaBadge myDist={runDist} friendDist={friendRun} friendPhoto={friend.photo} friendName={friend.name} sportColor={runColor} />}
      </div>
    </div>
  );
}
