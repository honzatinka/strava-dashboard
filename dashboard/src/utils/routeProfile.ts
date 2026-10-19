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
  /** Shown as a third stat when Strava reports it. */
  calories?: number | null;
  ink: ProfileInk;
  width?: number;
}

const INK: Record<ProfileInk, string> = { black: "#181614", white: "#FCFAF6" };
const INK_RGB: Record<ProfileInk, string> = { black: "24, 22, 20", white: "252, 250, 246" };
const VALUE_WEIGHT = 900;
/** Outline around the values as a fraction of font size — faux-bold past the font's heaviest weight; more closes the counters in 5/9. */
const VALUE_STROKE = 0.04;
const FONT = "Unbounded";
const ASPECT = 2 / 3;

/** Canvas can't wait for a webfont, so make sure it's in before the first draw. */
export async function ensureProfileFont(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`${VALUE_WEIGHT} 100px "${FONT}"`),
      document.fonts.load(`700 40px "${FONT}"`),
    ]);
  } catch {
    // falls back to the system sans — still legible, just narrower
  }
}

function fmtKm(m: number): string {
  return `${(m / 1000).toFixed(2)} KM`;
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
  if (opts.calories) stats.push(["CALORIES", `${Math.round(opts.calories)} KCAL`]);

  // Largest value size at which all stat columns fit side by side
  let valueSize = 112 * u;
  const widths = () => {
    ctx.font = `${VALUE_WEIGHT} ${valueSize}px "${FONT}", system-ui, sans-serif`;
    return stats.map(([, v]) => ctx.measureText(v).width + valueSize * VALUE_STROKE);
  };
  let ws = widths();
  while (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1) > W - 2 * padX && valueSize > 40 * u) {
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
    ctx.font = `${VALUE_WEIGHT} ${valueSize}px "${FONT}", system-ui, sans-serif`;
    ctx.fillText(value, x, valueY);
    ctx.lineWidth = valueSize * VALUE_STROKE;
    ctx.lineJoin = "round";
    ctx.strokeText(value, x, valueY);
    x += ws[i] + gap;
  });

  // Profile: x by distance, y normalised to its own min..max so even flat rides have shape
  const { distance, altitude } = opts.profile;
  const alt = smooth(altitude, 3);
  const dMin = distance[0], dMax = distance[distance.length - 1] || 1;
  const aMin = Math.min(...alt), aMax = Math.max(...alt);
  const top = valueY + 70 * u;
  const bottom = H - 130 * u;
  const left = padX, right = W - padX;
  const aRange = aMax - aMin || 1;

  const line = alt.map((a, i): [number, number] => [
    left + ((distance[i] - dMin) / (dMax - dMin || 1)) * (right - left),
    bottom - ((a - aMin) / aRange) * (bottom - top),
  ]);
  const trace = () => line.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));

  // Soft veil hugging the underside of the line: a short vertical gradient per pixel
  // column, starting at the line, so the glow follows the curve instead of filling to the floor
  const veil = 120 * u;
  let seg = 0;
  for (let px = Math.ceil(left); px <= Math.floor(right); px++) {
    while (seg < line.length - 2 && line[seg + 1][0] < px) seg++;
    const [x0, y0] = line[seg], [x1, y1] = line[seg + 1];
    const y = y0 + ((px - x0) / (x1 - x0 || 1)) * (y1 - y0);
    const g = ctx.createLinearGradient(0, y, 0, y + veil);
    g.addColorStop(0, `rgba(${INK_RGB[opts.ink]}, 0.24)`);
    g.addColorStop(0.45, `rgba(${INK_RGB[opts.ink]}, 0.08)`);
    g.addColorStop(1, `rgba(${INK_RGB[opts.ink]}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(px, y, 1, veil);
  }

  ctx.lineWidth = 5 * u;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  trace();
  ctx.stroke();

  return canvas;
}

export function downloadPng(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
