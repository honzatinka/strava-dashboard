import { useEffect, useState } from "react";
import { SPORT_ICONS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance } from "../utils";
import "../pages/CombinedActivityCalendarPage.css";

type ViewAs = "honza" | "martin";

interface AthleteStats {
  name: string;
  photo: string | null;
  sports: { sport: string; dist: number; time: number }[];
}

interface DeltaBadgeProps {
  myDist: number;
  oppDist: number;
  oppPhoto: string | null;
  oppName: string;
}

function DeltaBadge({ myDist, oppDist, oppPhoto, oppName }: DeltaBadgeProps) {
  const delta = myDist - oppDist;
  const absDist = Math.abs(delta);
  const label =
    (delta >= 0 ? "+" : "–") +
    (absDist >= 1000 ? `${(absDist / 1000).toFixed(1)}km` : `${Math.round(absDist)}m`);
  return (
    <div className={`cp-bigbet-badge${delta < 0 ? " cp-bigbet-badge--behind" : ""}`}>
      {oppPhoto ? (
        <img className="cp-bigbet-badge-avatar" src={oppPhoto} alt={oppName} />
      ) : (
        <div className="cp-bigbet-badge-avatar cp-bigbet-badge-avatar--fb">{oppName[0]}</div>
      )}
      <span className="cp-bigbet-badge-label">{label}</span>
    </div>
  );
}

const distOf = (s: AthleteStats | null, sport: string) =>
  s?.sports.find((x) => x.sport === sport)?.dist ?? 0;

/**
 * The Big Bet — COMPACT variant (used in 200px-wide homepage sidebar).
 * Shows the currently-viewed athlete's distance large, with a delta badge
 * comparing against the OTHER athlete.
 *
 * Both athletes' 2026 stats are fetched independently of the active view
 * (Honza from /api/my-stats, Martin from /api/friend-stats), so the delta is
 * always primary − opponent — never primary − itself (the old view=martin bug).
 */
export function TheBigBetCompact({ viewAs }: { viewAs: ViewAs }) {
  const [me, setMe] = useState<AthleteStats | null>(null);         // Honza
  const [friend, setFriend] = useState<AthleteStats | null>(null); // Martin

  useEffect(() => {
    fetch("/api/my-stats")
      .then((r) => r.json())
      .then((d) => !d.error && setMe(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/friend-stats")
      .then((r) => r.json())
      .then((d) => !d.error && setFriend(d))
      .catch(() => {});
  }, []);

  const BikeIcon = SPORT_ICONS["GravelRide"] || FALLBACK_SPORT_ICON;
  const RunIcon  = SPORT_ICONS["Run"]        || FALLBACK_SPORT_ICON;
  const SwimIcon = SPORT_ICONS["Swim"]       || FALLBACK_SPORT_ICON;

  const isMartin = viewAs === "martin";
  const primary = isMartin ? friend : me;
  const opp     = isMartin ? me : friend;
  const oppName  = opp?.name?.split(" ")[0] || (isMartin ? "Honza" : "Martin");
  const oppPhoto = opp?.photo ?? null;
  const hasOpp = !!opp;

  const bikeDist = distOf(primary, "Ride");
  const swimDist = distOf(primary, "Swim");
  const runDist  = distOf(primary, "Run");

  return (
    <div className="cp-bigbet">
      <div className="cp-bigbet-year">2026</div>
      <a className="cp-bigbet-title cp-bigbet-title--link" href="/bet" title="Otevřít detail Big Bet">
        The Big Bet
        <span className="cp-bigbet-title-arrow material-symbols-outlined">arrow_outward</span>
      </a>

      {/* Bike */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><BikeIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(bikeDist)}</div>
        {hasOpp && <DeltaBadge myDist={bikeDist} oppDist={distOf(opp, "Ride")} oppPhoto={oppPhoto} oppName={oppName} />}
      </div>

      <div className="cp-bigbet-divider" />

      {/* Swim */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><SwimIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(swimDist)}</div>
        {hasOpp && <DeltaBadge myDist={swimDist} oppDist={distOf(opp, "Swim")} oppPhoto={oppPhoto} oppName={oppName} />}
      </div>

      <div className="cp-bigbet-divider" />

      {/* Run */}
      <div className="cp-bigbet-sport">
        <span className="cp-bigbet-sport-icon"><RunIcon size={22} strokeWidth={1.6} /></span>
        <div className="cp-bigbet-value">{formatDistance(runDist)}</div>
        {hasOpp && <DeltaBadge myDist={runDist} oppDist={distOf(opp, "Run")} oppPhoto={oppPhoto} oppName={oppName} />}
      </div>
    </div>
  );
}
