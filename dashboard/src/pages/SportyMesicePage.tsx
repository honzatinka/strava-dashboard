import type { Activity } from "../types";
import { SPORT_ICONS, SPORT_COLORS, FALLBACK_SPORT_ICON } from "../types";
import { groupBySport, formatDistance, formatDuration, sportLabel, czechMonth } from "../utils";

function darken(hex: string, f = 0.5) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

export function SportyMesicePage({ activities }: { activities: Activity[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthActs = activities.filter(a => a.start_date_local.startsWith(prefix));

  const byDate = groupBySport(monthActs);
  const totalTime = monthActs.reduce((s, a) => s + a.moving_time, 0);

  const sportStats = Array.from(byDate.entries())
    .map(([sport, acts]) => ({
      sport,
      count: acts.length,
      totalDist: acts.reduce((s, a) => s + a.distance, 0),
      totalDur:  acts.reduce((s, a) => s + a.moving_time, 0),
      percentage: totalTime > 0 ? Math.round((acts.reduce((s, a) => s + a.moving_time, 0) / totalTime) * 100) : 0,
    }))
    .sort((a, b) => b.totalDur - a.totalDur);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1A1A1A", marginBottom: 4 }}>
        Sporty v měsíci
      </h2>
      <p style={{ fontSize: 13, color: "#A8A29E", marginBottom: 32 }}>
        {czechMonth(month)} {year} · {monthActs.length} aktivit · {Math.floor(totalTime / 3600)} hod.
      </p>

      {monthActs.length === 0 ? (
        <p style={{ color: "#A8A29E", textAlign: "center", padding: "60px 0" }}>
          Žádné aktivity v tomto měsíci.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {sportStats.map(({ sport, count, totalDist, totalDur, percentage }) => {
            const Icon = SPORT_ICONS[sport] || FALLBACK_SPORT_ICON;
            const color = SPORT_COLORS[sport] || "#E8E4DE";
            const textColor = darken(color, 0.5);
            return (
              <div
                key={sport}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: 16,
                  borderRadius: 12,
                  background: "#FAFAF8",
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <span style={{ color: textColor, display: "flex", alignItems: "center" }}>
                  <Icon size={16} strokeWidth={2} />
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                    {sportLabel(sport)}
                  </span>
                  <span style={{ fontSize: 11, color: "#A8A29E" }}>
                    {count}× · {formatDistance(totalDist)} · {formatDuration(totalDur)}
                  </span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#E8825C" }}>
                  {percentage}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
