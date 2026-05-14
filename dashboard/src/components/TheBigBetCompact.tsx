import type { Activity } from "../types";
import { SPORT_ICONS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance } from "../utils";
import { useBigBetData } from "../hooks/useBigBetData";
import "../pages/CombinedActivityCalendarPage.css";

interface DeltaBadgeProps {
  myDist: number;
  friendDist: number;
  friendPhoto: string | null;
  friendName: string;
}

function DeltaBadge({ myDist, friendDist, friendPhoto, friendName }: DeltaBadgeProps) {
  const delta = myDist - friendDist;
  const absDist = Math.abs(delta);
  const label =
    (delta >= 0 ? "+" : "–") +
    (absDist >= 1000 ? `${(absDist / 1000).toFixed(1)}km` : `${Math.round(absDist)}m`);
  return (
    <div className={`cp-bigbet-badge${delta < 0 ? " cp-bigbet-badge--behind" : ""}`}>
      {friendPhoto ? (
        <img className="cp-bigbet-badge-avatar" src={friendPhoto} alt={friendName} />
      ) : (
        <div className="cp-bigbet-badge-avatar cp-bigbet-badge-avatar--fb">{friendName[0]}</div>
      )}
      <span className="cp-bigbet-badge-label">{label}</span>
    </div>
  );
}

/**
 * The Big Bet — COMPACT variant (used in 200px-wide homepage sidebar).
 * Shows my distance large, with a small badge for delta vs friend.
 * Data is shared with TheBigBet via the useBigBetData hook.
 */
export function TheBigBetCompact({ activities }: { activities: Activity[] }) {
  const {
    bikeDist, runDist, swimDist,
    friendBike, friendRun, friendSwim,
    friend,
  } = useBigBetData(activities);

  const BikeIcon = SPORT_ICONS["GravelRide"] || FALLBACK_SPORT_ICON;
  const RunIcon  = SPORT_ICONS["Run"]        || FALLBACK_SPORT_ICON;
  const SwimIcon = SPORT_ICONS["Swim"]       || FALLBACK_SPORT_ICON;

  const friendName  = friend?.name?.split(" ")[0] || "Martin";
  const friendPhoto = friend?.photo ?? null;

  return (
    <div className="cp-bigbet">
      <div className="cp-bigbet-year">2026</div>
      <div className="cp-bigbet-title">The Big Bet</div>

      {/* Bike */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><BikeIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(bikeDist)}</div>
        {friend && <DeltaBadge myDist={bikeDist} friendDist={friendBike} friendPhoto={friendPhoto} friendName={friendName} />}
      </div>

      <div className="cp-bigbet-divider" />

      {/* Swim */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><SwimIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(swimDist)}</div>
        {friend && <DeltaBadge myDist={swimDist} friendDist={friendSwim} friendPhoto={friendPhoto} friendName={friendName} />}
      </div>

      <div className="cp-bigbet-divider" />

      {/* Run */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><RunIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(runDist)}</div>
        {friend && <DeltaBadge myDist={runDist} friendDist={friendRun} friendPhoto={friendPhoto} friendName={friendName} />}
      </div>
    </div>
  );
}
