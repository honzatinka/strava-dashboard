/**
 * Route stamp — renders an activity's GPS track as a distressed rubber-stamp PNG.
 *
 * Everything is drawn on a canvas in the browser (no backend): two rings, the sport
 * name curved along the top arc, distance + elevation along the bottom, and the route
 * itself as the central motif. The ink is then eroded with value noise so it prints
 * unevenly like a real stamp, and the whole thing is rotated slightly off-square.
 */

import { decodePolyline } from "../utils";

export type StampInk = "black" | "white";

const INK: Record<StampInk, string> = {
  black: "#181614",
  white: "#FCFAF6",
};

/** "GravelRide" → "GRAVEL RIDE" — reads better on the arc than the raw sport key. */
export function stampSportLabel(sportType: string): string {
  return sportType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^E Bike/, "E-BIKE")
    .toUpperCase();
}

function fmtKm(meters: number): string {
  return `${(meters / 1000).toFixed(1).replace(".", ",")} KM`;
}

/** Lay text around a circle, one glyph at a time. `flip` runs it along the bottom arc. */
function arcText(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  text: string, startDeg: number, spacing: number, flip: boolean,
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const angTotal = (widths.reduce((a, b) => a + b, 0) * spacing) / radius;
  let ang = (startDeg * Math.PI) / 180 - (flip ? -angTotal / 2 : angTotal / 2);

  [...text].forEach((ch, i) => {
    const step = (widths[i] * spacing) / radius;
    // the advance direction flips on the bottom arc, so the glyph centre must follow it
    const a = flip ? ang - step / 2 : ang + step / 2;
    ctx.save();
    ctx.translate(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    ctx.rotate(flip ? a - Math.PI / 2 : a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    ang += flip ? -step : step;
  });
}

/** Smooth value noise + a few dry scratches, as a greyscale canvas. */
function inkNoise(size: number, seed: number): HTMLCanvasElement {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const small = document.createElement("canvas");
  const step = 4;
  small.width = Math.ceil(size / step);
  small.height = Math.ceil(size / step);
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(small.width, small.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 256);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);

  const big = document.createElement("canvas");
  big.width = big.height = size;
  const bctx = big.getContext("2d")!;
  bctx.filter = "blur(1.5px)";
  bctx.drawImage(small, 0, 0, size, size);
  bctx.filter = "none";

  // dry patches where the pad didn't touch
  bctx.strokeStyle = "rgba(0,0,0,0.75)";
  bctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const x = rnd() * size, y = rnd() * size;
    const len = 40 + rnd() * 150, ang = rnd() * Math.PI;
    bctx.lineWidth = 2 + rnd() * 5;
    bctx.beginPath();
    bctx.moveTo(x, y);
    bctx.lineTo(x + len * Math.cos(ang), y + len * Math.sin(ang));
    bctx.stroke();
  }
  return big;
}

/** Multiply the layer's alpha by the noise so the ink breaks up. */
function applyDistress(canvas: HTMLCanvasElement, seed: number, cut = 88) {
  const ctx = canvas.getContext("2d")!;
  const size = canvas.width;
  const layer = ctx.getImageData(0, 0, size, size);
  const noise = inkNoise(size, seed).getContext("2d")!.getImageData(0, 0, size, size);
  for (let i = 0; i < layer.data.length; i += 4) {
    const v = noise.data[i];
    const keep = v > cut ? 1 : (v * 0.35) / 255;
    layer.data[i + 3] = Math.round(layer.data[i + 3] * keep);
  }
  ctx.putImageData(layer, 0, 0);
}

export interface StampOptions {
  polyline: string;
  sportType: string;
  distanceMeters: number;
  elevationMeters: number;
  ink: StampInk;
  size?: number;
  seed?: number;
}

/** Render the stamp and return the canvas (transparent outside the ink). */
export function renderRouteStamp(opts: StampOptions): HTMLCanvasElement {
  const S = opts.size ?? 1080;
  const ink = INK[opts.ink];
  const seed = opts.seed ?? 7;

  const inner = document.createElement("canvas");
  inner.width = inner.height = S;
  const ctx = inner.getContext("2d")!;
  const cx = S / 2, cy = S / 2;

  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // rings
  const R = S * 0.44;
  ctx.lineWidth = S * 0.016;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  const R2 = R - S * 0.038;
  ctx.lineWidth = S * 0.007;
  ctx.beginPath(); ctx.arc(cx, cy, R2, 0, Math.PI * 2); ctx.stroke();

  // arc text — slab serif keeps its weight once the ink breaks up
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(S * 0.082)}px Rockwell, "Roboto Slab", Georgia, serif`;
  arcText(ctx, cx, cy, R2 - S * 0.07, stampSportLabel(opts.sportType), -90, 1.06, false);
  ctx.font = `bold ${Math.round(S * 0.062)}px Rockwell, "Roboto Slab", Georgia, serif`;
  arcText(
    ctx, cx, cy, R2 - S * 0.058,
    `${fmtKm(opts.distanceMeters)}  ·  ${Math.round(opts.elevationMeters)} M`,
    90, 1.08, true,
  );

  // side squares
  for (const deg of [0, 180]) {
    const a = (deg * Math.PI) / 180;
    const x = cx + (R2 - S * 0.048) * Math.cos(a);
    const y = cy + (R2 - S * 0.048) * Math.sin(a);
    ctx.fillRect(x - S * 0.014, y - S * 0.014, S * 0.028, S * 0.028);
  }

  // route as the central motif, aspect-corrected so it isn't stretched
  const pts = decodePolyline(opts.polyline);
  if (pts.length > 1) {
    const lats = pts.map((p) => p[0]);
    const cosLat = Math.cos((lats.reduce((a, b) => a + b, 0) / lats.length) * Math.PI / 180);
    const xs = pts.map((p) => p[1] * cosLat);
    const ys = lats;
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = maxX - minX || 1e-9, spanY = maxY - minY || 1e-9;
    const bw = S * 0.58, bh = S * 0.30;
    const sc = Math.min(bw / spanX, bh / spanY);
    const w = spanX * sc, h = spanY * sc;
    const ox = cx - S * 0.29 + (bw - w) / 2;
    const oy = cy - S * 0.15 + (bh - h) / 2;

    ctx.lineWidth = S * 0.016;
    ctx.beginPath();
    xs.forEach((x, i) => {
      const px = ox + (x - minX) * sc;
      const py = oy + h - (ys[i] - minY) * sc;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    const sx = ox + (xs[0] - minX) * sc;
    const sy = oy + h - (ys[0] - minY) * sc;
    ctx.beginPath(); ctx.arc(sx, sy, S * 0.017, 0, Math.PI * 2); ctx.fill();
  }

  applyDistress(inner, seed);

  // tilt it so it never looks machine-placed
  const out = document.createElement("canvas");
  out.width = out.height = S;
  const octx = out.getContext("2d")!;
  octx.translate(S / 2, S / 2);
  octx.rotate((-7 * Math.PI) / 180);
  octx.drawImage(inner, -S / 2, -S / 2);
  return out;
}

export function downloadStamp(canvas: HTMLCanvasElement, filename: string) {
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
