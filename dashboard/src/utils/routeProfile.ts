/**
 * Elevation-profile overlay — distance + elevation in a wide heavy face above a
 * single thin line of the ride's altitude, on a transparent canvas meant to be
 * dropped onto a photo in an Instagram story.
 */

export type ProfileInk = "black" | "white";

export interface ProfileData {
  distance: number[];
  altitude: number[];
}

export interface ProfileOptions {
  profile: ProfileData;
  distanceMeters: number;
  elevationMeters: number;
  ink: ProfileInk;
  width?: number;
}

const INK: Record<ProfileInk, string> = { black: "#181614", white: "#FCFAF6" };
const FONT = "Unbounded";
const ASPECT = 2 / 3;

/** Canvas can't wait for a webfont, so make sure it's in before the first draw. */
export async function ensureProfileFont(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`800 100px "${FONT}"`),
      document.fonts.load(`700 40px "${FONT}"`),
    ]);
  } catch {
    // falls back to the system sans — still legible, just narrower
  }
}

function fmtKm(m: number): string {
  return `${(m / 1000).toFixed(2).replace(".", ",")} KM`;
}

function fmtElev(m: number): string {
  return `${Math.round(m)} M`;
}

/** Light moving average — GPS altitude is jittery and the line should read as one gesture. */
function smooth(values: number[], radius: number): number[] {
  return values.map((_, i) => {
    let sum = 0, n = 0;
    for (let k = Math.max(0, i - radius); k <= Math.min(values.length - 1, i + radius); k++) {
      sum += values[k]; n++;
    }
    return sum / n;
  });
}

export function renderRouteProfile(opts: ProfileOptions): HTMLCanvasElement {
  const W = opts.width ?? 1080;
  const H = Math.round(W * ASPECT);
  const u = W / 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const color = INK[opts.ink];
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textBaseline = "alphabetic";

  const padX = 70 * u;
  const gap = 64 * u;
  const stats: [string, string][] = [
    ["DISTANCE", fmtKm(opts.distanceMeters)],
    ["ELEVATION", fmtElev(opts.elevationMeters)],
  ];

  // Largest value size at which both stat columns fit side by side
  let valueSize = 112 * u;
  const widths = () => {
    ctx.font = `800 ${valueSize}px "${FONT}", system-ui, sans-serif`;
    return stats.map(([, v]) => ctx.measureText(v).width);
  };
  let ws = widths();
  while (ws[0] + ws[1] + gap > W - 2 * padX && valueSize > 40 * u) {
    valueSize -= 2 * u;
    ws = widths();
  }
  const labelSize = valueSize * 0.34;
  const labelY = 90 * u + labelSize;
  const valueY = labelY + valueSize * 0.98;

  let x = padX;
  stats.forEach(([label, value], i) => {
    ctx.font = `700 ${labelSize}px "${FONT}", system-ui, sans-serif`;
    ctx.fillText(label, x, labelY);
    ctx.font = `800 ${valueSize}px "${FONT}", system-ui, sans-serif`;
    ctx.fillText(value, x, valueY);
    x += ws[i] + gap;
  });

  // Profile: x by distance, y normalised to its own min..max so even flat rides have shape
  const { distance, altitude } = opts.profile;
  const alt = smooth(altitude, 3);
  const dMin = distance[0], dMax = distance[distance.length - 1] || 1;
  const aMin = Math.min(...alt), aMax = Math.max(...alt);
  const top = valueY + 70 * u;
  const bottom = H - 60 * u;
  const left = padX, right = W - padX;
  const aRange = aMax - aMin || 1;

  ctx.lineWidth = 5 * u;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  alt.forEach((a, i) => {
    const px = left + ((distance[i] - dMin) / (dMax - dMin || 1)) * (right - left);
    const py = bottom - ((a - aMin) / aRange) * (bottom - top);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  return canvas;
}
