import type { Activity } from "../types";
import { SPORT_ICONS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance } from "../utils";
import { useBigBetData } from "../hooks/useBigBetData";
import "../pages/CombinedActivityCalendarPage.css";

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

/**
 * The Big Bet — FULL variant (used on /bet page).
 * Wide layout with side-by-side Honza vs Martin participant rows.
 */
export function TheBigBet({ activities }: { activities: Activity[] }) {
  const {
    bikeDist, runDist, swimDist,
    friendBike, friendRun, friendSwim,
    friend, myPhoto,
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
