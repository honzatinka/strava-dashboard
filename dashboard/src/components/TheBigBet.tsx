import type { Activity } from "../types";
import { SPORT_ICONS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistanceKm } from "../utils";
import { useBigBetData } from "../hooks/useBigBetData";
import "../pages/CombinedActivityCalendarPage.css";

type IconComp = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

interface SportCellProps {
  Icon: IconComp;
  dist: number;
  isLeader: boolean;
  gap: number; // positive value: how much this participant leads by (only meaningful when isLeader)
}

function SportCell({ Icon, dist, isLeader, gap }: SportCellProps) {
  return (
    <div className={`cp-bigbet-cell${isLeader ? " cp-bigbet-cell--leader" : ""}`}>
      <span className="cp-bigbet-cell-icon">
        <Icon size={20} strokeWidth={1.6} color="var(--color-text-primary)" />
      </span>
      <div className="cp-bigbet-cell-text">
        <span className="cp-bigbet-cell-km">{formatDistanceKm(dist)}</span>
        {isLeader && gap > 0 && (
          <span className="cp-bigbet-cell-gap">+{formatDistanceKm(gap)}</span>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  photo: string | null;
  name: string;
  bike: number; swim: number; run: number;
  bikeLeader: boolean; swimLeader: boolean; runLeader: boolean;
  bikeGap: number; swimGap: number; runGap: number;
  BikeIcon: IconComp; SwimIcon: IconComp; RunIcon: IconComp;
}

function ParticipantRow({
  photo, name,
  bike, swim, run,
  bikeLeader, swimLeader, runLeader,
  bikeGap, swimGap, runGap,
  BikeIcon, SwimIcon, RunIcon,
}: RowProps) {
  return (
    <div className="cp-bigbet-row">
      {photo ? (
        <img className="cp-bigbet-row-avatar" src={photo} alt={name} />
      ) : (
        <div className="cp-bigbet-row-avatar cp-bigbet-row-avatar--fb">{name[0]}</div>
      )}
      <div className="cp-bigbet-row-sports">
        <SportCell Icon={BikeIcon} dist={bike} isLeader={bikeLeader} gap={bikeGap} />
        <SportCell Icon={SwimIcon} dist={swim} isLeader={swimLeader} gap={swimGap} />
        <SportCell Icon={RunIcon}  dist={run}  isLeader={runLeader}  gap={runGap}  />
      </div>
    </div>
  );
}

/**
 * The Big Bet — FULL variant (/bet page).
 * 3-column CSS grid for sports (consistent alignment between rows),
 * leader highlight via accent color, gap (+X km) shown under leader's value.
 */
export function TheBigBet({ activities }: { activities: Activity[] }) {
  const {
    bikeDist, runDist, swimDist,
    friendBike, friendRun, friendSwim,
    friend, myPhoto,
  } = useBigBetData(activities);

  const BikeIcon = (SPORT_ICONS["GravelRide"] || FALLBACK_SPORT_ICON) as IconComp;
  const RunIcon  = (SPORT_ICONS["Run"]        || FALLBACK_SPORT_ICON) as IconComp;
  const SwimIcon = (SPORT_ICONS["Swim"]       || FALLBACK_SPORT_ICON) as IconComp;

  const friendName = friend?.name?.split(" ")[0] || "Martin";

  // Per-sport leader & gap (positive = ahead). Tie or both 0 → no leader.
  const meBikeLeads     = bikeDist > friendBike && bikeDist > 0;
  const friendBikeLeads = friendBike > bikeDist && friendBike > 0;
  const meSwimLeads     = swimDist > friendSwim && swimDist > 0;
  const friendSwimLeads = friendSwim > swimDist && friendSwim > 0;
  const meRunLeads      = runDist > friendRun && runDist > 0;
  const friendRunLeads  = friendRun > runDist && friendRun > 0;

  const bikeGap = Math.abs(bikeDist - friendBike);
  const swimGap = Math.abs(swimDist - friendSwim);
  const runGap  = Math.abs(runDist - friendRun);

  return (
    <div className="cp-bigbet">
      <div className="cp-bigbet-year">2026</div>
      <div className="cp-bigbet-title">The Big Bet</div>

      <ParticipantRow
        photo={myPhoto} name="Honza"
        bike={bikeDist} swim={swimDist} run={runDist}
        bikeLeader={meBikeLeads} swimLeader={meSwimLeads} runLeader={meRunLeads}
        bikeGap={meBikeLeads ? bikeGap : 0}
        swimGap={meSwimLeads ? swimGap : 0}
        runGap={meRunLeads ? runGap : 0}
        BikeIcon={BikeIcon} SwimIcon={SwimIcon} RunIcon={RunIcon}
      />
      <ParticipantRow
        photo={friend?.photo ?? null} name={friendName}
        bike={friendBike} swim={friendSwim} run={friendRun}
        bikeLeader={friendBikeLeads} swimLeader={friendSwimLeads} runLeader={friendRunLeads}
        bikeGap={friendBikeLeads ? bikeGap : 0}
        swimGap={friendSwimLeads ? swimGap : 0}
        runGap={friendRunLeads ? runGap : 0}
        BikeIcon={BikeIcon} SwimIcon={SwimIcon} RunIcon={RunIcon}
      />
    </div>
  );
}
