import { useEffect, useState } from "react";
import { Bike, Waves } from "lucide-react";
import { Footprints } from "lucide-react";
import { formatDistance } from "../utils";
import "./BigBetPage.css";

interface SportStat { sport: string; dist: number; time: number; count: number; }
interface AthleteData { name: string; photo: string | null; sports: SportStat[]; }

function fetchJSON<T>(url: string): Promise<T> {
  return fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
}

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m > 0 ? m+"m" : ""}`.trim() : `${m}m`;
}

const SPORT_META: Record<string, { label: string; Icon: typeof Bike; color: string }> = {
  Ride: { label: "Cycling",  Icon: Bike,      color: "#FF4400" },
  Run:  { label: "Running",  Icon: Footprints, color: "#FF4400" },
  Swim: { label: "Swimming", Icon: Waves,      color: "#FF4400" },
};

function SportBar({ label, myVal, friendVal, max, unit }: {
  label: string; myVal: number; friendVal: number; max: number; unit: string;
}) {
  const myPct   = max > 0 ? (myVal / max) * 100 : 0;
  const frdPct  = max > 0 ? (friendVal / max) * 100 : 0;
  return (
    <div className="bb-bar-group">
      <div className="bb-bar-label">{label}</div>
      <div className="bb-bars">
        <div className="bb-bar-row">
          <div className="bb-bar-track">
            <div className="bb-bar-fill bb-bar-fill--me" style={{ width: `${myPct}%` }} />
          </div>
          <span className="bb-bar-val">{unit === "km" ? formatDistance(myVal) : fmtTime(myVal)}</span>
        </div>
        <div className="bb-bar-row bb-bar-row--friend">
          <div className="bb-bar-track">
            <div className="bb-bar-fill bb-bar-fill--friend" style={{ width: `${frdPct}%` }} />
          </div>
          <span className="bb-bar-val">{unit === "km" ? formatDistance(friendVal) : fmtTime(friendVal)}</span>
        </div>
      </div>
    </div>
  );
}

export function BigBetPage() {
  const [me, setMe]       = useState<AthleteData | null>(null);
  const [friend, setFriend] = useState<AthleteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const base = window.location.origin;
    Promise.all([
      fetchJSON<{ sports: SportStat[]; name: string; photo: string | null; updatedAt?: string }>(`${base}/api/my-stats`),
      fetchJSON<{ sports: SportStat[]; name: string; photo: string | null }>(`${base}/api/friend-stats`),
    ]).then(([myData, friendData]) => {
      setMe({ name: myData.name, photo: myData.photo, sports: myData.sports });
      setFriend({ name: friendData.name, photo: friendData.photo, sports: friendData.sports });
      if (myData.updatedAt) setLastUpdated(myData.updatedAt);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const SPORTS = ["Ride", "Run", "Swim"] as const;

  function getStat(data: AthleteData | null, sport: string, field: "dist" | "time") {
    return data?.sports.find(s => s.sport === sport)?.[field] ?? 0;
  }

  return (
    <div className="bb-root">
      <header className="bb-header">
        <div className="bb-header-label">2026</div>
        <h1 className="bb-header-title">The Big Bet</h1>
        {lastUpdated && (
          <div className="bb-header-updated">Updated {new Date(lastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
        )}
      </header>

      {loading && <div className="bb-loading">Loading data…</div>}

      {!loading && me && friend && (
        <>
          {/* Athletes header */}
          <div className="bb-athletes">
            <div className="bb-athlete">
              {me.photo
                ? <img className="bb-avatar" src={me.photo} alt={me.name} />
                : <div className="bb-avatar bb-avatar--fb">{me.name[0]}</div>
              }
              <span className="bb-athlete-name">{me.name}</span>
            </div>
            <div className="bb-vs">vs</div>
            <div className="bb-athlete bb-athlete--right">
              {friend.photo
                ? <img className="bb-avatar" src={friend.photo} alt={friend.name} />
                : <div className="bb-avatar bb-avatar--fb">{friend.name[0]}</div>
              }
              <span className="bb-athlete-name">{friend.name}</span>
            </div>
          </div>

          {/* Sport sections */}
          {SPORTS.map(sport => {
            const meta = SPORT_META[sport];
            const myDist   = getStat(me, sport, "dist");
            const frdDist  = getStat(friend, sport, "dist");
            const myTime   = getStat(me, sport, "time");
            const frdTime  = getStat(friend, sport, "time");
            const delta    = myDist - frdDist;
            const absDelta = Math.abs(delta);
            const deltaStr = (delta >= 0 ? "+" : "–") + formatDistance(absDelta);
            const winner   = myDist > frdDist ? "me" : myDist < frdDist ? "friend" : null;

            return (
              <div key={sport} className="bb-sport-section">
                <div className="bb-sport-header">
                  <span className="bb-sport-icon"><meta.Icon size={20} strokeWidth={1.6} /></span>
                  <span className="bb-sport-label">{meta.label}</span>
                  {winner && (
                    <span className={`bb-winner ${winner === "me" ? "bb-winner--me" : "bb-winner--friend"}`}>
                      🏆 {winner === "me" ? me.name.split(" ")[0] : friend.name.split(" ")[0]}
                    </span>
                  )}
                </div>

                <div className="bb-sport-totals">
                  <div className="bb-sport-total">
                    <span className="bb-sport-total-val">{formatDistance(myDist)}</span>
                    <span className="bb-sport-total-sub">{fmtTime(myTime)}</span>
                  </div>
                  <div className={`bb-delta ${delta >= 0 ? "bb-delta--ahead" : "bb-delta--behind"}`}>
                    {myDist === 0 && frdDist === 0 ? "0" : deltaStr}
                  </div>
                  <div className="bb-sport-total bb-sport-total--right">
                    <span className="bb-sport-total-val">{formatDistance(frdDist)}</span>
                    <span className="bb-sport-total-sub">{fmtTime(frdTime)}</span>
                  </div>
                </div>

                <SportBar
                  label="Distance"
                  myVal={myDist} friendVal={frdDist}
                  max={Math.max(myDist, frdDist, 1)} unit="km"
                />
                <SportBar
                  label="Time"
                  myVal={myTime} friendVal={frdTime}
                  max={Math.max(myTime, frdTime, 1)} unit="time"
                />

                <div className="bb-sport-divider" />
              </div>
            );
          })}
        </>
      )}

      <footer className="bb-footer">
        <a href="/" className="bb-footer-link">← Back to dashboard</a>
      </footer>
    </div>
  );
}
