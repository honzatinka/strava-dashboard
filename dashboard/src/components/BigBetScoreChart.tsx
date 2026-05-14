import { useMemo } from "react";
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

  return (
    <div className="bbsc-card">
      <div className="bbsc-header">
        <div className="bbsc-titleblock">
          <h3 className="bbsc-title">Score Progress</h3>
          <p className="bbsc-subtitle">Týdenní vývoj v roce 2026</p>
        </div>
        <div className="bbsc-currentblock">
          <div className="bbsc-current bbsc-current--me">
            <div className="bbsc-current-label">
              <span className="bbsc-dot bbsc-dot--me" />
              <span>Já</span>
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
            domain={[0, 6]}
            ticks={[0, 1, 2, 3, 4, 5, 6]}
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
              const display = name === "meScore" ? "Já" : (friendName.split(" ")[0] || "Soupeř");
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
