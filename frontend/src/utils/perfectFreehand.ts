// ─────────────────────────────────────────────────────────────
//  perfectFreehand.ts – Wrapper around perfect-freehand
//  Converts ink strokes to SVG path data with configurable
//  thinning, smoothing, and streamlining.
//  AkashaVyom Labs / Rekha
// ─────────────────────────────────────────────────────────────

import getStroke from 'perfect-freehand';
import type { StrokePoint } from '@/types';

export interface FreehandOptions {
  /** Brush size in px */
  size?: number;
  /** How much the stroke thins towards the end (0–1) */
  thinning?: number;
  /** How much to smooth the stroke (0–1) */
  smoothing?: number;
  /** How much to streamline the stroke (0–1) */
  streamline?: number;
  /** Simulate pressure if real pressure data is unavailable */
  simulatePressure?: boolean;
  /** Whether the stroke is finished (affects end cap) */
  last?: boolean;
  /** Cap the start of the stroke */
  start?: {
    cap?: boolean;
    taper?: number | boolean;
    easing?: (t: number) => number;
  };
  /** Cap the end of the stroke */
  end?: {
    cap?: boolean;
    taper?: number | boolean;
    easing?: (t: number) => number;
  };
}

/** Default pen options – realistic ink feel */
export const PEN_OPTIONS: FreehandOptions = {
  size: 4,
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: true,
  last: true,
  start: { cap: true, taper: 0 },
  end: { cap: true, taper: 0 },
};

/** Highlighter options – flat, wide, blunt ends */
export const HIGHLIGHTER_OPTIONS: FreehandOptions = {
  size: 20,
  thinning: 0,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: false,
  last: true,
  start: { cap: false, taper: 0 },
  end: { cap: false, taper: 0 },
};

/** Calligraphy pen – dramatic thinning */
export const CALLIGRAPHY_OPTIONS: FreehandOptions = {
  size: 8,
  thinning: 0.9,
  smoothing: 0.7,
  streamline: 0.4,
  simulatePressure: true,
  last: true,
  start: { cap: true, taper: 20, easing: easeOutSine },
  end: { cap: true, taper: 40, easing: easeOutSine },
};

/** Marker – chunky, uniform width */
export const MARKER_OPTIONS: FreehandOptions = {
  size: 12,
  thinning: 0.1,
  smoothing: 0.4,
  streamline: 0.3,
  simulatePressure: false,
  last: true,
  start: { cap: true, taper: 0 },
  end: { cap: true, taper: 0 },
};

// ─────────────────── Easing functions ────────────────────────
function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export { easeOutSine, easeInOutQuad };

// ─────────────────── Core conversion ─────────────────────────

/**
 * Convert an array of StrokePoints to SVG path data string.
 *
 * @param points  - Raw points from pointer events
 * @param options - FreehandOptions (overrides PEN_OPTIONS defaults)
 * @returns  SVG path `d` attribute string ready for <path d="…">
 */
export function strokeToSvgPath(
  points: StrokePoint[],
  options: FreehandOptions = {},
): string {
  if (points.length === 0) return '';

  const opts: FreehandOptions = { ...PEN_OPTIONS, ...options };

  // perfect-freehand expects [x, y, pressure?]
  const inputPoints: [number, number, number][] = points.map((p) => [
    p.x,
    p.y,
    p.pressure ?? 0.5,
  ]);

  const outlinePoints = getStroke(inputPoints, {
    size:             opts.size ?? 4,
    thinning:         opts.thinning ?? 0.6,
    smoothing:        opts.smoothing ?? 0.5,
    streamline:       opts.streamline ?? 0.5,
    simulatePressure: opts.simulatePressure ?? true,
    last:             opts.last ?? true,
    start:            opts.start,
    end:              opts.end,
  });

  return outlineToSvgPath(outlinePoints);
}

/**
 * Convert the polygon outline returned by perfect-freehand
 * into an SVG path `d` string using quadratic bezier curves.
 */
export function outlineToSvgPath(points: number[][]): string {
  if (points.length < 3) return '';

  let path = '';
  const len = points.length;

  path += `M ${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;

  for (let i = 1; i < len - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const mx = ((curr[0] + (next[0] ?? curr[0])) / 2).toFixed(2);
    const my = ((curr[1] + (next[1] ?? curr[1])) / 2).toFixed(2);
    path += ` Q ${curr[0].toFixed(2)},${curr[1].toFixed(2)} ${mx},${my}`;
  }

  const last = points[len - 1];
  if (last) {
    path += ` L ${last[0].toFixed(2)},${last[1].toFixed(2)}`;
  }

  path += ' Z';
  return path;
}

// ───────────────── Highlighter path ──────────────────────────

/**
 * Generate a simple polyline path for highlighter strokes.
 * We use a straight polyline rather than a filled outline
 * so we can apply CSS opacity for transparency.
 */
export function highlighterToSvgPath(points: StrokePoint[], size: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const { x, y } = points[0];
    const r = size / 2;
    return `M ${x - r},${y} a ${r},${r} 0 1,0 ${size},0 a ${r},${r} 0 1,0 -${size},0`;
  }

  const inputPoints: [number, number, number][] = points.map((p) => [p.x, p.y, 0.5]);
  const outline = getStroke(inputPoints, {
    ...HIGHLIGHTER_OPTIONS,
    size,
  });
  return outlineToSvgPath(outline);
}

// ───────────────── Eraser region ─────────────────────────────

/**
 * Build an SVG path for the eraser cursor indicator.
 */
export function eraserCursorPath(x: number, y: number, size: number): string {
  const r = size / 2;
  return `M ${x - r},${y} a ${r},${r} 0 1,0 ${size},0 a ${r},${r} 0 1,0 -${size},0`;
}

// ──────────────── Pressure normalization ─────────────────────

/**
 * Normalize pressure values from a PointerEvent into [0.1, 1.0].
 * Falls back to 0.5 when device doesn't report pressure.
 */
export function normalizePressure(rawPressure: number): number {
  if (rawPressure === 0) return 0.5;
  return Math.min(1, Math.max(0.1, rawPressure));
}

/**
 * Smooth a sequence of pressure values using a simple moving average.
 */
export function smoothPressure(pressures: number[], windowSize = 3): number[] {
  if (pressures.length <= windowSize) return pressures;
  return pressures.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end   = Math.min(pressures.length, start + windowSize);
    const slice = pressures.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
