import { useState, useEffect } from "react";
import { Sparkles, Loader } from "lucide-react";
import type { Activity } from "../types";
import "./AIOverview.css";

const SPORT_COLOR_MAP: Record<string, string> = {
  EBikeRide: "#8B5CF6",
  Hike: "#10B981",
  GravelRide: "#F59E0B",
  Workout: "#EF4444",
  Padel: "#EC4899",
  Run: "#3B82F6",
  Ride: "#6B7280",
  Swim: "#06B6D4",
  Walk: "#84CC16",
  Surfing: "#0EA5E9",
};

const SPORT_EMOJIS: Record<string, string> = {
  Run: "🏃",
  VirtualRun: "🏃",
  Ride: "🚴",
  EBikeRide: "🚴",
  VirtualRide: "🚴",
  Walk: "🚶",
  Hike: "🥾",
  Workout: "💪",
  WeightTraining: "💪",
  Swim: "🏊",
  Kayaking: "🛶",
  Elliptical: "🏃",
  Surfing: "🏄",
  Padel: "🎾",
  GravelRide: "🚵",
  Tennis: "🎾",
  Basketball: "🏀",
  Soccer: "⚽",
  Football: "🏈",
  Skiing: "⛷️",
  Snowboarding: "🏂",
  Climbing: "🧗",
  Crossfit: "💪",
  Yoga: "🧘",
};

interface InsightData {
  overview: {
    hours: number;
    disciplines: number;
    disciplineNames: string[];
    hasMore: boolean;
  };
  topSports: Array<{ sport: string; hours: number; percent: number }>;
  sportProgress: { completed: number; total: number };
  characteristic: string;
}

export function AIOverview({ activities }: { activities: Activity[] }) {
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch AI analysis on mount (with 24h cache)
  useEffect(() => {
    const generateInsight = async () => {
      setLoading(true);
      setError(null);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const recent = activities.filter((a) => {
        const date = new Date(a.start_date_local);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });

      if (!recent.length) {
        setError("Žádné aktivity v tomto měsíci.");
        setLoading(false);
        return;
      }

      // Check cache (24h TTL)
      const cacheKey = "ai-overview-cache";
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const { insight: cachedInsight, timestamp, activityCount } = parsed;
          const age = Date.now() - timestamp;
          const ttl = 24 * 60 * 60 * 1000; // 24 hours
          // Ignore cache if activity count changed
          if (age < ttl && activityCount === recent.length && cachedInsight) {
            setInsight(cachedInsight as InsightData);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Cache is corrupted, ignore it
          localStorage.removeItem(cacheKey);
        }
      }

      // Calculate sports breakdown locally
      const sportTimeMap: Record<string, number> = {};
      recent.forEach((a) => {
        const sport = a.sport_type || a.type || "Other";
        sportTimeMap[sport] = (sportTimeMap[sport] || 0) + a.moving_time;
      });

      const topSports = Object.entries(sportTimeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([sport, seconds]) => {
          const hours = Math.round((seconds / 3600) * 10) / 10;
          const totalSeconds = recent.reduce((s, a) => s + a.moving_time, 0);
          return {
            sport,
            hours,
            percent: Math.round((seconds / totalSeconds) * 100),
          };
        });

      const uniqueSports = [...new Set(recent.map((a) => a.sport_type || a.type || "Other"))];
      const totalSeconds = recent.reduce((s, a) => s + a.moving_time, 0);
      const totalHours = Math.round(totalSeconds / 3600);
      const activityCount = recent.length;

      // Fetch characteristic from API
      try {
        const response = await fetch("http://localhost:3001/api/analyze-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activities: recent }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        const characteristic = data.insight || "";

        const insight: InsightData = {
          overview: {
            hours: totalHours,
            disciplines: activityCount,
            disciplineNames: uniqueSports.slice(0, 3) as string[],
            hasMore: uniqueSports.length > 3,
          },
          topSports,
          sportProgress: {
            completed: uniqueSports.length,
            total: 10,
          },
          characteristic,
        };

        setInsight(insight);
        setError(null);

        // Cache for 24h
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            insight,
            timestamp: Date.now(),
            activityCount: recent.length,
          })
        );
      } catch (err) {
        setError(`Chyba: ${err instanceof Error ? err.message : "Neznámá chyba"}`);
        setInsight(null);
      } finally {
        setLoading(false);
      }
    };

    generateInsight();
  }, [activities]);

  return (
    <div className="ai-overview">
      <div className="ai-header">
        <div className="ai-title-group">
          <Sparkles size={18} strokeWidth={2} className="ai-icon" />
          <h3 className="ai-title">Přehled za tento měsíc</h3>
        </div>
      </div>

      {loading && (
        <div className="ai-content ai-loading">
          <Loader size={20} strokeWidth={2} className="ai-spinner" />
          <span>Generuji analýzu...</span>
        </div>
      )}

      {error && (
        <div className="ai-content ai-error">
          <p className="ai-text">{error}</p>
        </div>
      )}

      {insight && !loading && (
        <div className="ai-content">
          {/* Overview */}
          <div className="ai-overview-header">
            <div>
              <div className="ai-stat-label">Tréninku</div>
              <div className="ai-stat-value">{insight.overview.hours}h</div>
            </div>
            <div>
              <div className="ai-stat-label">Aktivit</div>
              <div className="ai-stat-value">{insight.overview.disciplines}</div>
            </div>
          </div>

          {/* Characteristic */}
          <div className="ai-characteristic">
            <p className="ai-text">{insight.characteristic}</p>
          </div>

          {/* Sport breakdown - compact legend only */}
          {insight.topSports.length > 0 && (
            <div className="ai-sport-list">
              {insight.topSports.map((s) => (
                <div key={s.sport} className="ai-sport-item">
                  <span className="ai-sport-emoji">{SPORT_EMOJIS[s.sport] || "⚽"}</span>
                  <span className="ai-sport-name">{s.sport}</span>
                  <span className="ai-sport-percent">{s.percent}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Sport progress */}
          <div className="ai-progress-section">
            <h4 className="ai-section-title">🎯 Sporty v měsíci</h4>
            <div className="ai-progress-bar">
              <div
                className="ai-progress-fill"
                style={{
                  width: `${(insight.sportProgress.completed / insight.sportProgress.total) * 100}%`,
                }}
              />
            </div>
            <div className="ai-progress-text">
              {insight.sportProgress.completed} z {insight.sportProgress.total} sportů
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
