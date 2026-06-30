import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";
import type { Activity } from "../types";
import { buildScoreSeries } from "../utils/bigBetScore";
import type { ScorePoint } from "../utils/bigBetScore";
import "./BigBetScoreChart.css";

type Tab = "overall" | "bike" | "swim" | "run";

const DISC_THRESHOLDS = { bike: 100, run: 20, swim: 5 } as const;

function BbscTooltip({
  active, payload, tab, meKey, friendKey, friendFirstName,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScorePoint }>;
  tab: Tab;
  meKey: string;
  friendKey: string;
  friendFirstName: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const dateStr = new Date(d.date).toLocaleDateString("cs-CZ", {
    day: "numeric", month: "long",
  });

  if (tab === "overall") {
    const discs = [
      { label: "Bike", me_km: d.bike_me_km, fr_km: d.bike_friend_km, me_pts: d.bike_me, fr_pts: d.bike_friend, threshold: 100 },
      { label: "Run",  me_km: d.run_me_km,  fr_km: d.run_friend_km,  me_pts: d.run_me,  fr_pts: d.run_friend,  threshold: 20  },
      { label: "Swim", me_km: d.swim_me_km, fr_km: d.swim_friend_km, me_pts: d.swim_me, fr_pts: d.swim_friend, threshold: 5   },
    ];
    return (
      <div className="bbsc-tooltip">
        <div className="bbsc-tt-date">{dateStr}</div>
        <div className="bbsc-tt-main">
          <span className="bbsc-tt-me">Honza <strong>{d.meScore}</strong> b</span>
          <span className="bbsc-tt-sep">·</span>
          <span className="bbsc-tt-friend">{friendFirstName} <strong>{d.friendScore}</strong> b</span>
        </div>
        <div className="bbsc-tt-divider" />
        {discs.map(({ label, me_km, fr_km, me_pts, fr_pts, threshold }) => {
          const disciplineActive = Math.max(me_km, fr_km) >= threshold;
          return (
            <div key={label} className={`bbsc-tt-disc${disciplineActive ? "" : " bbsc-tt-disc--inactive"}`}>
              <span className="bbsc-tt-disc-label">{label}</span>
              <span className="bbsc-tt-disc-km">{me_km} vs {fr_km} km</span>
              <span className="bbsc-tt-disc-pts">{disciplineActive ? `${me_pts} : ${fr_pts}` : "—"}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const meKm = (d[meKey     as keyof ScorePoint] as number) ?? 0;
  const frKm = (d[friendKey as keyof ScorePoint] as number) ?? 0;
  const absDelta = Math.round(Math.abs(meKm - frKm) * 10) / 10;
  const leadsName = meKm >= frKm ? "Honza" : friendFirstName;

  const sportKey = tab;
  const mePts = (d[`${sportKey}_me`     as keyof ScorePoint] as number) ?? 0;
  const frPts = (d[`${sportKey}_friend` as keyof ScorePoint] as number) ?? 0;
  const threshold = DISC_THRESHOLDS[sportKey];
  const disciplineActive = Math.max(meKm, frKm) >= threshold;

  const leaderKm = Math.max(meKm, frKm);
  const loserKm  = Math.min(meKm, frKm);
  const deficit  = disciplineActive && loserKm > 0 && leaderKm >= 2 * loserKm
    ? Math.round((leaderKm / 2 - loserKm) * 10) / 10 : 0;
  const deficitOwner = deficit > 0 ? (meKm < frKm ? "Honza" : friendFirstName) : null;

  return (
    <div className="bbsc-tooltip">
      <div className="bbsc-tt-date">{dateStr}</div>
      <div className="bbsc-tt-main">
        <span className="bbsc-tt-me">Honza <strong>{meKm}</strong> km</span>
        <span className="bbsc-tt-sep">·</span>
        <span className="bbsc-tt-friend">{friendFirstName} <strong>{frKm}</strong> km</span>
      </div>
      {absDelta > 0 && (
        <div className="bbsc-tt-delta">+{absDelta} km ({leadsName})</div>
      )}
      <div className="bbsc-tt-divider" />
      <div className="bbsc-tt-pts">
        {disciplineActive ? `Body: ${mePts} : ${frPts}` : `Neaktivní (threshold ${threshold} km)`}
      </div>
      {deficit > 0 && (
        <div className="bbsc-tt-deficit">Chybí {deficit} km k 50 % ({deficitOwner})</div>
      )}
    </div>
  );
}

interface Props {
  myActivities: Activity[];
  friendActivities: Activity[];
  friendName: string;
}

export function BigBetScoreChart({ myActivities, friendActivities, friendName }: Props) {
  const data = useMemo(
    () => buildScoreSeries(myActivities, friendActivities),
    [myActivities, friendActivities],
  );

  const [tab, setTab] = useState<Tab>("overall");

  // Score tab → points. Sport tabs → cumulative km.
  const isKmMode = tab !== "overall";
  const meKey =
    tab === "overall" ? "meScore" :
    tab === "bike"    ? "bike_me_km" :
    tab === "swim"    ? "swim_me_km" :
                        "run_me_km";
  const friendKey =
    tab === "overall" ? "friendScore" :
    tab === "bike"    ? "bike_friend_km" :
    tab === "swim"    ? "swim_friend_km" :
                        "run_friend_km";

  const last = data[data.length - 1];
  const meCurrent = (last?.[meKey as keyof typeof last] as number) ?? 0;
  const friendCurrent = (last?.[friendKey as keyof typeof last] as number) ?? 0;
  const unitSuffix = isKmMode ? " km" : "";

  // Kolik chybí aktuálně poraženému (v km), aby měl VÍCE než polovinu vedoucího
  // — skórovací pravidlo dává vedoucímu 2 body místo 1, dokud loser <= leader/2.
  // Relevantní jen na km tabech (Bike/Swim/Run), ne na celkovém Score.
  const leaderKm = Math.max(meCurrent, friendCurrent);
  const loserKm  = Math.min(meCurrent, friendCurrent);
  const deficitKm = isKmMode && loserKm > 0 && leaderKm >= 2 * loserKm
    ? Math.round((leaderKm / 2 - loserKm) * 10) / 10
    : 0;
  const meDeficit     = deficitKm > 0 && meCurrent < friendCurrent ? deficitKm : 0;
  const friendDeficit = deficitKm > 0 && friendCurrent < meCurrent ? deficitKm : 0;

  // Score tab: Y 0–6 (capped); km tabs: Y dynamic to max value + 10% headroom.
  const yMax = useMemo(() => {
    if (!isKmMode) {
      let m = 2;
      for (const p of data) m = Math.max(m, p.meScore, p.friendScore);
      return Math.min(6, m + 1);
    }
    let m = 0;
    for (const p of data) {
      m = Math.max(m, (p[meKey as keyof typeof p] as number), (p[friendKey as keyof typeof p] as number));
    }
    if (m === 0) return 10; // empty data: show small axis
    // Round up to nice number
    const padded = m * 1.1;
    const exponent = Math.pow(10, Math.floor(Math.log10(padded)));
    return Math.ceil(padded / exponent) * exponent;
  }, [data, tab, isKmMode, meKey, friendKey]);

  const yTicks = useMemo(() => {
    if (!isKmMode) {
      return Array.from({ length: yMax + 1 }, (_, i) => i);
    }
    // 5 ticks for km axis
    const step = yMax / 4;
    return [0, step, step * 2, step * 3, yMax].map(v => Math.round(v));
  }, [yMax, isKmMode]);

  // Info popover state — toggle on icon click, close on outside click
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showInfo) return;
    const onClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showInfo]);

  return (
    <div className="bbsc-card">
      <div className="bbsc-header">
        <div className="bbsc-titlerow">
          <h3 className="bbsc-title">Score Progress</h3>
          <div className="bbsc-info-wrap" ref={infoRef}>
            <button
              type="button"
              className="bbsc-info-btn"
              onClick={() => setShowInfo(v => !v)}
              aria-label="Jak se počítá skóre"
            >
              <span className="material-symbols-outlined">info</span>
            </button>
            {showInfo && (
              <>
                <div className="bbsc-info-backdrop" onClick={() => setShowInfo(false)} />
                <div className="bbsc-info-popover" role="dialog">
                  <h4 className="bbsc-info-title">Jak se počítá skóre?</h4>
                  <ol className="bbsc-info-list">
                    <li>
                      Tři disciplíny mají thresholdy:
                      <ul>
                        <li><strong>Bike</strong> 100 km</li>
                        <li><strong>Run</strong> 20 km</li>
                        <li><strong>Swim</strong> 5 km</li>
                      </ul>
                    </li>
                    <li>Disciplína se stane <em>aktivní</em>, jakmile alespoň jeden účastník překročí svůj threshold.</li>
                    <li>
                      V aktivní disciplíně dostane vedoucí:
                      <ul>
                        <li><strong>2 body</strong> pokud má aspoň 2× tolik vzdálenosti než druhý</li>
                        <li><strong>1 bod</strong> pokud vede těsně (méně než 2×)</li>
                        <li>0 bodů při přesné remíze</li>
                      </ul>
                    </li>
                    <li>Maximum 6 bodů (3 disciplíny × 2 body).</li>
                    <li>U kola se nezapočítávají trainer jízdy (Technogym, Zwift).</li>
                  </ol>
                </div>
              </>
            )}
          </div>
          <p className="bbsc-subtitle">Týdenní vývoj v roce 2026</p>
        </div>
        <div className="bbsc-currentblock">
          <div className="bbsc-current bbsc-current--me">
            <div className="bbsc-current-label">
              <span className="bbsc-dot bbsc-dot--me" />
              <span>Honza</span>
            </div>
            <div className="bbsc-current-value">{meCurrent}{unitSuffix}</div>
            <div className="bbsc-current-sub">{isKmMode ? "Total distance" : "Current Score"}</div>
            {meDeficit > 0 && (
              <div className="bbsc-current-deficit" title="Missing to cross half the leader's distance — otherwise they lead 2:0">
                Missing {meDeficit} km to 50%
              </div>
            )}
          </div>
          <div className="bbsc-current bbsc-current--friend">
            <div className="bbsc-current-label">
              <span className="bbsc-dot bbsc-dot--friend" />
              <span>{friendName.split(" ")[0] || "Soupeř"}</span>
            </div>
            <div className="bbsc-current-value">{friendCurrent}{unitSuffix}</div>
            <div className="bbsc-current-sub">{isKmMode ? "Total distance" : "Current Score"}</div>
            {friendDeficit > 0 && (
              <div className="bbsc-current-deficit" title="Missing to cross half the leader's distance — otherwise they lead 2:0">
                Missing {friendDeficit} km to 50%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sport tabs — filter chart series */}
      <div className="bbsc-tabs" role="tablist">
        {([
          ["overall", "Score"],
          ["bike",    "Bike"],
          ["swim",    "Swim"],
          ["run",     "Run"],
        ] as Array<[Tab, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`bbsc-tab${tab === key ? " bbsc-tab--active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="rgba(33,33,31,0.08)" strokeDasharray="3 3" />
          <Tooltip
            content={(props) => (
              <BbscTooltip
                active={props.active}
                payload={props.payload as unknown as Array<{ payload: ScorePoint }>}
                tab={tab}
                meKey={meKey}
                friendKey={friendKey}
                friendFirstName={friendName.split(" ")[0] || "Soupeř"}
              />
            )}
            cursor={{ stroke: "rgba(33,33,31,0.15)", strokeWidth: 1, strokeDasharray: "3 3" }}
          />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "rgba(33,33,31,0.5)" }}
            axisLine={{ stroke: "rgba(33,33,31,0.12)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, yMax]}
            ticks={yTicks}
            tick={{ fontSize: 11, fill: "rgba(33,33,31,0.5)" }}
            axisLine={false}
            tickLine={false}
            width={isKmMode ? 40 : 28}
          />
          <Line
            type="monotone"
            dataKey={meKey}
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--color-accent)" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey={friendKey}
            stroke="rgba(33,33,31,0.45)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "rgba(33,33,31,0.45)" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
