import type { Activity } from "../types";
import { SPORT_ICONS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance } from "../utils";
import { useBigBetData } from "../hooks/useBigBetData";
import "../pages/CombinedActivityCalendarPage.css";

type IconComp = React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;

interface SportCellProps {
  Icon: IconComp;
  dist: number;
}

function SportCell({ Icon, dist }: SportCellProps) {
  return (
    <div className="cp-bigbet-row-sport">
      <Icon size={26} strokeWidth={1.6} color="var(--color-text-primary)" />
      <span className="cp-bigbet-row-km">{formatDistance(dist)}</span>
    </div>
  );
}

interface ParticipantRowProps {
  photo: string | null;
  name: string;
  bike: number;
  run: number;
  swim: number;
  BikeIcon: IconComp;
  RunIcon: IconComp;
  SwimIcon: IconComp;
}

function ParticipantRow({
  photo, name, bike, run, swim, BikeIcon, RunIcon, SwimIcon,
}: ParticipantRowProps) {
  return (
    <div className="cp-bigbet-row">
      {photo ? (
        <img className="cp-bigbet-row-avatar" src={photo} alt={name} />
      ) : (
        <div className="cp-bigbet-row-avatar cp-bigbet-row-avatar--fb">{name[0]}</div>
      )}
      <div className="cp-bigbet-row-sports">
        <SportCell Icon={BikeIcon} dist={bike} />
        <div className="cp-bigbet-row-sep" />
        <SportCell Icon={SwimIcon} dist={swim} />
        <div className="cp-bigbet-row-sep" />
        <SportCell Icon={RunIcon}  dist={run} />
      </div>
    </div>
  );
}

/**
 * The Big Bet — FULL variant (used on /bet page).
 * Two stacked horizontal participant rows with avatar + 3 sport cells.
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

  return (
    <div className="cp-bigbet">
      <div className="cp-bigbet-year">2026</div>
      <div className="cp-bigbet-title">The Big Bet</div>

      <ParticipantRow
        photo={myPhoto} name="Honza"
        bike={bikeDist} run={runDist} swim={swimDist}
        BikeIcon={BikeIcon} RunIcon={RunIcon} SwimIcon={SwimIcon}
      />
      <ParticipantRow
        photo={friend?.photo ?? null} name={friendName}
        bike={friendBike} run={friendRun} swim={friendSwim}
        BikeIcon={BikeIcon} RunIcon={RunIcon} SwimIcon={SwimIcon}
      />
    </div>
  );
}
