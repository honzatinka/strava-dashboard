import { useEffect, useState } from "react";
import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { formatDistance, formatDuration, sportLabel } from "../utils";
import "./FriendComparison.css";

interface FriendSport {
  sport: string;
  count: number;
  dist: number;
  time: number;
  elev: number;
}

interface FriendData {
  name: string;
  photo: string | null;
  totalActivities: number;
  sports: FriendSport[];
  error?: string;
  authUrl?: string;
}

const BIKE_TYPES = new Set(["Ride","GravelRide","MountainBikeRide","VirtualRide","EBikeRide"]);
const RUN_TYPES  = new Set(["Run","VirtualRun","TrailRun"]);
const SWIM_TYPES = new Set(["Swim"]);
function normalizeSport(s: string): string | null {
  if (BIKE_TYPES.has(s)) return "Ride";
  if (RUN_TYPES.has(s))  return "Run";
  if (SWIM_TYPES.has(s)) return "Swim";
  return null;
}

// Aggregate my activities by sport for 2026 — only Bike/Run/Swim
function myStats(activities: Activity[]): FriendSport[] {
  const ytd = activities.filter(a => a.start_date_local.startsWith("2026"));
  const map: Record<string, FriendSport> = {};
  for (const a of ytd) {
    const s = normalizeSport(a.sport_type || a.type || "");
    if (!s) continue;
    if (!map[s]) map[s] = { sport: s, count: 0, dist: 0, time: 0, elev: 0 };
    map[s].count++;
    map[s].dist += a.distance || 0;
    map[s].time += a.moving_time || 0;
    map[s].elev += a.total_elevation_gain || 0;
  }
  return Object.values(map).sort((a, b) => b.time - a.time);
}

// Merge both sport lists, align by sport key
function mergedSports(mine: FriendSport[], theirs: FriendSport[]) {
  const sports = new Set([...mine.map(s => s.sport), ...theirs.map(s => s.sport)]);
  return Array.from(sports)
    .map(sport => ({
      sport,
      me: mine.find(s => s.sport === sport) || { sport, count: 0, dist: 0, time: 0, elev: 0 },
      friend: theirs.find(s => s.sport === sport) || { sport, count: 0, dist: 0, time: 0, elev: 0 },
    }))
    .filter(r => r.me.time > 0 || r.friend.time > 0)
    .sort((a, b) => (b.me.time + b.friend.time) - (a.me.time + a.friend.time));
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="fc-bar-track">
      <div className="fc-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

interface Props {
  activities: Activity[];
  myName: string;
  myPhoto: string | null;
}

export function FriendComparison({ activities, myName, myPhoto }: Props) {
  const [friend, setFriend] = useState<FriendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:3001/api/friend-stats")
      .then(r => r.json())
      .then(d => { setFriend(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const mine = myStats(activities);
  const myTotal = activities.filter(a => a.start_date_local.startsWith("2026")).length;
  const myTime = mine.reduce((s, a) => s + a.time, 0);
  const myDist = mine.reduce((s, a) => s + a.dist, 0);

  return (
    <div className="fc-root">
      <div className="fc-header">
        <h2 className="fc-title">2026 — Head to Head</h2>
      </div>

      {/* Totals */}
      <div className="fc-totals">
        {/* Me */}
        <div className="fc-athlete">
          {myPhoto
            ? <img className="fc-avatar" src={myPhoto} alt={myName} />
            : <div className="fc-avatar fc-avatar--fallback">{myName[0]}</div>
          }
          <span className="fc-athlete-name">{myName || "Me"}</span>
        </div>

        <div className="fc-total-stats">
          <div className="fc-total-stat">
            <span className="fc-total-label">Activities</span>
            <div className="fc-total-values">
              <span className="fc-total-mine">{myTotal}</span>
              <span className="fc-total-sep">vs</span>
              <span className="fc-total-friend">{friend?.totalActivities ?? "—"}</span>
            </div>
          </div>
          <div className="fc-total-stat">
            <span className="fc-total-label">Time</span>
            <div className="fc-total-values">
              <span className="fc-total-mine">{formatDuration(myTime)}</span>
              <span className="fc-total-sep">vs</span>
              <span className="fc-total-friend">
                {friend ? formatDuration(friend.sports.reduce((s, a) => s + a.time, 0)) : "—"}
              </span>
            </div>
          </div>
          <div className="fc-total-stat">
            <span className="fc-total-label">Distance</span>
            <div className="fc-total-values">
              <span className="fc-total-mine">{formatDistance(myDist)}</span>
              <span className="fc-total-sep">vs</span>
              <span className="fc-total-friend">
                {friend ? formatDistance(friend.sports.reduce((s, a) => s + a.dist, 0)) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Friend */}
        <div className="fc-athlete fc-athlete--right">
          {loading
            ? <div className="fc-avatar fc-avatar--loading" />
            : friend?.photo
              ? <img className="fc-avatar" src={friend.photo} alt={friend.name} />
              : <div className="fc-avatar fc-avatar--fallback">{friend?.name?.[0] || "?"}</div>
          }
          <span className="fc-athlete-name">{friend?.name ?? "..."}</span>
        </div>
      </div>

      {/* Per-sport bars */}
      {!loading && friend && !friend.error && (
        <div className="fc-sports">
          {mergedSports(mine, friend.sports).map(({ sport, me, friend: f }) => {
            const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
            const color = SPORT_COLORS[sport] || "#FF4400";
            const maxTime = Math.max(me.time, f.time);
            const maxDist = Math.max(me.dist, f.dist);
            const winner = me.time > f.time ? "me" : me.time < f.time ? "friend" : "tie";

            return (
              <div key={sport} className="fc-sport-row">
                <div className="fc-sport-header">
                  <span className="fc-sport-icon" style={{ color }}>
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="fc-sport-name">{sportLabel(sport)}</span>
                  {winner !== "tie" && (
                    <span className={`fc-winner-badge fc-winner-badge--${winner}`}>
                      {winner === "me" ? "🏆 ty" : `🏆 ${friend.name.split(" ")[0]}`}
                    </span>
                  )}
                </div>

                <div className="fc-bars">
                  {/* Me */}
                  <div className="fc-bar-row">
                    <span className="fc-bar-label">{me.time > 0 ? formatDuration(me.time) : "—"}</span>
                    <Bar value={me.time} max={maxTime} color={color} />
                    <span className="fc-bar-sublabel">{me.dist > 0 ? formatDistance(me.dist) : ""}</span>
                  </div>
                  {/* Friend */}
                  <div className="fc-bar-row fc-bar-row--friend">
                    <span className="fc-bar-label">{f.time > 0 ? formatDuration(f.time) : "—"}</span>
                    <Bar value={f.time} max={maxTime} color="#B0ADA8" />
                    <span className="fc-bar-sublabel">{f.dist > 0 ? formatDistance(f.dist) : ""}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && <div className="fc-loading">Načítám Martinova data…</div>}
    </div>
  );
}
