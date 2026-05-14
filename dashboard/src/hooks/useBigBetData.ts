/**
 * Shared data source for The Big Bet — used by both the full /bet page widget
 * and the compact widget on the homepage dashboard.
 *
 * Returns the same numbers in both contexts; UI formatting is independent.
 */

import { useEffect, useState } from "react";
import type { Activity } from "../types";

export interface FriendStats {
  name: string;
  photo: string | null;
  sports: { sport: string; dist: number; time: number }[];
}

export interface BigBetData {
  bikeDist: number;
  runDist: number;
  swimDist: number;
  friendBike: number;
  friendRun: number;
  friendSwim: number;
  friend: FriendStats | null;
  myPhoto: string | null;
}

const BIKE_TYPES = ["Ride", "GravelRide", "MountainBikeRide", "VirtualRide"];
const RUN_TYPES  = ["Run", "VirtualRun", "TrailRun"];

export function useBigBetData(activities: Activity[]): BigBetData {
  const [friend, setFriend] = useState<FriendStats | null>(null);
  const [myPhoto, setMyPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/friend-stats")
      .then(r => r.json())
      .then(d => !d.error && setFriend(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/athlete-profile")
      .then(r => r.json())
      .then(d => { if (d?.photoUrl) setMyPhoto(d.photoUrl); })
      .catch(() => {});
  }, []);

  const ytd = activities.filter(a => a.start_date_local.startsWith("2026"));
  // Trainer flag excluded ONLY for bike (Technogym/Zwift). Pool swims & treadmill runs count.
  const bikeDist = ytd
    .filter(a => BIKE_TYPES.includes(a.sport_type) && a.trainer !== true)
    .reduce((s, a) => s + a.distance, 0);
  const swimDist = ytd
    .filter(a => a.sport_type === "Swim")
    .reduce((s, a) => s + a.distance, 0);
  const runDist  = ytd
    .filter(a => RUN_TYPES.includes(a.sport_type))
    .reduce((s, a) => s + a.distance, 0);

  const friendBike = friend?.sports.find(s => s.sport === "Ride")?.dist ?? 0;
  const friendRun  = friend?.sports.find(s => s.sport === "Run")?.dist  ?? 0;
  const friendSwim = friend?.sports.find(s => s.sport === "Swim")?.dist ?? 0;

  return { bikeDist, runDist, swimDist, friendBike, friendRun, friendSwim, friend, myPhoto };
}
