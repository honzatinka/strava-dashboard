import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Activity } from "../types";
import { buildScoreSeries } from "../utils/bigBetScore";
import "./BigBetScoreChart.css";

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

  const last = data[data.length - 1];
  const meCurrent = last?.meScore ?? 0;
  const friendCurrent = last?.friendScore ?? 0;

  // Dynamic Y-axis: clamp to the highest score reached (min 2 so axis isn't flat near zero),
  // capped at 6 (max possible: 3 disciplines × 2 points).
  const yMax = useMemo(() => {
    let m = 2;
    for (const p of data) m = Math.max(m, p.meScore, p.friendScore);
    return Math.min(6, m + 1);
  }, [data]);

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
            <div className="bbsc-current-value">{meCurrent}</div>
            <div className="bbsc-current-sub">Current Score</div>
          </div>
          <div className="bbsc-current bbsc-current--friend">
            <div className="bbsc-current-label">
              <span className="bbsc-dot bbsc-dot--friend" />
              <span>{friendName.split(" ")[0] || "Soupeř"}</span>
            </div>
            <div className="bbsc-current-value">{friendCurrent}</div>
            <div className="bbsc-current-sub">Current Score</div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="rgba(33,33,31,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "rgba(33,33,31,0.5)" }}
            axisLine={{ stroke: "rgba(33,33,31,0.12)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, yMax]}
            ticks={Array.from({ length: yMax + 1 }, (_, i) => i)}
            tick={{ fontSize: 11, fill: "rgba(33,33,31,0.5)" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ stroke: "rgba(33,33,31,0.15)", strokeWidth: 1 }}
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid rgba(33,33,31,0.08)",
              borderRadius: 8,
              fontFamily: "inherit",
              padding: "8px 12px",
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4, color: "#21211F" }}
            formatter={(value, name) => {
              const display = name === "meScore" ? "Honza" : (friendName.split(" ")[0] || "Soupeř");
              return [`${value} b.`, display] as [string, string];
            }}
          />
          <Line
            type="monotone"
            dataKey="meScore"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--color-accent)" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="friendScore"
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
