export interface Activity {
  id: number;
  name: string;
  sport_type: string;
  type: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_temp?: number;
  kudos_count: number;
  achievement_count: number;
  pr_count: number;
  start_latlng?: number[];
  end_latlng?: number[];
  gear_id?: string | null;
  has_heartrate: boolean;
  elev_high?: number;
  elev_low?: number;
  map?: { summary_polyline?: string };
  timezone?: string;
  device_name?: string;
  total_photo_count?: number;
}

import type { LucideIcon } from "lucide-react";
import { ClipboardList, BarChart3, Target, Map } from "lucide-react";
import React from "react";

export type Page = "aktivity" | "statistiky" | "sporty" | "heatmapa" | "sporty-mesice";

export const PAGE_CONFIG: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "aktivity", label: "Aktivity", icon: ClipboardList },
  { id: "statistiky", label: "Přehledy", icon: BarChart3 },
  { id: "sporty", label: "Sporty", icon: Target },
  { id: "heatmapa", label: "Mapa", icon: Map },
];

// Material Symbols icon component — drop-in replacement for LucideIcon
function makeMIcon(name: string) {
  return function MIcon({ size = 18, color }: { size?: number; strokeWidth?: number; color?: string }) {
    return React.createElement(
      "span",
      {
        className: "material-symbols-outlined",
        style: { fontSize: size, lineHeight: 1, userSelect: "none", display: "inline-flex", ...(color ? { color } : {}) },
      },
      name,
    );
  };
}

export const SPORT_ICONS: Record<string, ReturnType<typeof makeMIcon>> = {
  Run:              makeMIcon("directions_run"),
  VirtualRun:       makeMIcon("directions_run"),
  TrailRun:         makeMIcon("hiking"),
  GravelRide:       makeMIcon("directions_bike"),
  Ride:             makeMIcon("directions_bike"),
  MountainBikeRide: makeMIcon("directions_bike"),
  EBikeRide:        makeMIcon("electric_bike"),
  Hike:             makeMIcon("hiking"),
  Walk:             makeMIcon("directions_walk"),
  Swim:             makeMIcon("pool"),
  Surfing:          makeMIcon("surfing"),
  StandUpPaddling:  makeMIcon("kayaking"),
  Snowboard:        makeMIcon("snowboarding"),
  Skiing:           makeMIcon("downhill_skiing"),
  Workout:          makeMIcon("fitness_center"),
  WeightTraining:   makeMIcon("fitness_center"),
  Tennis:           makeMIcon("sports_tennis"),
  Padel:            makeMIcon("sports_tennis"),
  Yoga:             makeMIcon("self_improvement"),
  RockClimbing:     makeMIcon("landscape"),
};

export const FALLBACK_SPORT_ICON = makeMIcon("sports");

export const SPORT_COLORS: Record<string, string> = {
  // Běh
  Run: "#FFAFA3", VirtualRun: "#FFAFA3",
  // Kolo (vše)
  GravelRide: "#FFD580", Ride: "#FFD580", MountainBikeRide: "#FFD580", EBikeRide: "#FFD580",
  // Turistika / chůze
  Hike: "#A8E6C0", Walk: "#A8E6C0",
  // Vodní sporty
  Swim: "#A0D4F5", Surfing: "#A0D4F5", StandUpPaddling: "#A0D4F5",
  // Zimní
  Snowboard: "#C8B8F0",
  // Gym / síla — tmavě fialová
  Workout: "#9B8FD4", WeightTraining: "#9B8FD4",
  // Raketové sporty — limetková
  Tennis: "#C5E880", Padel: "#C5E880",
  // Ostatní
  Yoga: "#F5C2E0",
};

/** Sports where GPS distance / pace doesn't make sense (court, gym, indoor) */
export const COURT_SPORTS = new Set([
  "Padel", "Tennis", "Squash", "TableTennis", "Badminton",
  "Yoga", "WeightTraining", "Workout", "Crossfit", "RockClimbing",
]);
