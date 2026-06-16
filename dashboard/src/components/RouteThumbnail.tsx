import { useMemo } from "react";
import type { Activity } from "../types";
import { resolveSportColor } from "../types";
import { decodePolyline } from "../utils";

const VB = 100;   // square viewBox
const PAD = 12;   // inner padding so the shape never touches the edge

/**
 * RouteThumbnail — a lightweight SVG outline of an activity's GPS track.
 * No map tiles, just the route shape (Runna-style), stroked in the sport color.
 *
 * Projection is aspect-corrected (longitude compressed by cos(meanLat)) so loops
 * and out-and-backs keep their real proportions instead of being stretched.
 * North is up (Y inverted). Reusable — can drop into any card/grid.
 */
export function RouteThumbnail({ activity }: { activity: Activity }) {
  const d = useMemo(() => {
    const enc = activity.map?.summary_polyline;
    if (!enc) return null;
    const pts = decodePolyline(enc);
    if (pts.length < 2) return null;

    const meanLat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const k = Math.cos((meanLat * Math.PI) / 180);
    const proj = pts.map(([lat, lng]) => [lng * k, lat] as [number, number]);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of proj) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);
    const avail = VB - 2 * PAD;
    const scale = Math.min(avail / spanX, avail / spanY);
    const offX = (VB - spanX * scale) / 2;
    const offY = (VB - spanY * scale) / 2;

    let s = "";
    for (let i = 0; i < proj.length; i++) {
      const [x, y] = proj[i];
      const sx = offX + (x - minX) * scale;
      const sy = offY + (maxY - y) * scale; // invert Y → north up
      s += (i === 0 ? "M" : "L") + sx.toFixed(1) + " " + sy.toFixed(1) + " ";
    }
    return s.trim();
  }, [activity]);

  const color = resolveSportColor(activity.sport_type || activity.type, activity.name);

  if (!d) {
    return <div className="route-thumb route-thumb--empty" aria-hidden="true" />;
  }

  return (
    <svg
      className="route-thumb"
      viewBox={`0 0 ${VB} ${VB}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Trasa: ${activity.name}`}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
