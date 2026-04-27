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
import {
  ClipboardList, BarChart3, Target, Map,
  Footprints, Bike, Mountain, MountainSnow, Waves, Snowflake,
  Dumbbell, CircleDot, Heart, Activity,
} from "lucide-react";

export type Page = "aktivity" | "statistiky" | "sporty" | "heatmapa" | "sporty-mesice";

export const PAGE_CONFIG: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "aktivity", label: "Aktivity", icon: ClipboardList },
  { id: "statistiky", label: "Přehledy", icon: BarChart3 },
  { id: "sporty", label: "Sporty", icon: Target },
  { id: "heatmapa", label: "Mapa", icon: Map },
];

export const SPORT_ICONS: Record<string, LucideIcon> = {
  Run: Footprints, GravelRide: Bike, Ride: Bike, MountainBikeRide: Mountain,
  EBikeRide: Bike, Hike: MountainSnow, Walk: Footprints, Swim: Waves,
  Surfing: Waves, Snowboard: Snowflake, Workout: Dumbbell, WeightTraining: Dumbbell,
  Tennis: CircleDot, Padel: CircleDot, Yoga: Heart, VirtualRun: Footprints,
};

export const FALLBACK_SPORT_ICON = Activity;

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
