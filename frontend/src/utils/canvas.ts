// ─────────────────────────────────────────────────────────────
//  canvas.ts – Canvas utility functions
//  AkashaVyom Labs / Rekha
// ─────────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import type {
  BoundingBox,
  CanvasObject,
  InkStroke,
  Point2D,
  StrokePoint,
  UUID,
} from '@/types';

// ───────────────────── ID generation ─────────────────────────
export function generateObjectId(): UUID {
  return uuidv4();
}

// ───────────────────── Bounding box ──────────────────────────

/**
 * Compute the axis-aligned bounding box for a canvas object.
 * For stroke objects we scan all stroke points.
 */
export function getBoundingBox(obj: CanvasObject): BoundingBox {
  if (obj.type === 'stroke') {
    const pts = obj.stroke.points;
    if (pts.length === 0) {
      return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of pts) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
    const pad = (obj.stroke.size / 2) * 1.5;
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    };
  }
  return { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
}

/**
 * Merge multiple bounding boxes into one enclosing box.
 */
export function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes) {
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ─────────────────────── Hit testing ─────────────────────────

/**
 * Test whether a point (canvas coordinates) hits a canvas object.
 * Uses an expanded bounding box for usability.
 */
export function hitTest(point: Point2D, obj: CanvasObject, padding = 4): boolean {
  const bb = getBoundingBox(obj);
  return (
    point.x >= bb.x - padding &&
    point.x <= bb.x + bb.width + padding &&
    point.y >= bb.y - padding &&
    point.y <= bb.y + bb.height + padding
  );
}

/**
 * Test whether a bounding box selection rect fully contains a canvas object.
 */
export function hitTestRect(selectionRect: BoundingBox, obj: CanvasObject): boolean {
  const bb = getBoundingBox(obj);
  return (
    bb.x >= selectionRect.x &&
    bb.y >= selectionRect.y &&
    bb.x + bb.width <= selectionRect.x + selectionRect.width &&
    bb.y + bb.height <= selectionRect.y + selectionRect.height
  );
}

/**
 * Find all objects whose bounding box intersects with a given rect.
 */
export function hitTestAll(rect: BoundingBox, objects: CanvasObject[]): CanvasObject[] {
  return objects.filter((obj) => {
    const bb = getBoundingBox(obj);
    return !(
      bb.x > rect.x + rect.width ||
      bb.x + bb.width < rect.x ||
      bb.y > rect.y + rect.height ||
      bb.y + bb.height < rect.y
    );
  });
}

// ─────────────────────── Snapping ────────────────────────────

/**
 * Snap a point to the nearest grid intersection.
 */
export function snapToGrid(point: Point2D, gridSize: number): Point2D {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Snap a value to the nearest increment.
 */
export function snapValue(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

// ─────────────────── Coordinate transforms ───────────────────

/**
 * Convert a screen-space point to canvas-space coordinates
 * given the current view transform (zoom + pan).
 */
export function screenToCanvas(
  screenPt: Point2D,
  zoom: number,
  panX: number,
  panY: number,
): Point2D {
  return {
    x: (screenPt.x - panX) / zoom,
    y: (screenPt.y - panY) / zoom,
  };
}

/**
 * Convert a canvas-space point to screen-space coordinates.
 */
export function canvasToScreen(
  canvasPt: Point2D,
  zoom: number,
  panX: number,
  panY: number,
): Point2D {
  return {
    x: canvasPt.x * zoom + panX,
    y: canvasPt.y * zoom + panY,
  };
}

// ───────────────── Stroke serialization ──────────────────────

/**
 * Serialize an InkStroke to a compact JSON-safe representation.
 * Points are stored as flat [x, y, pressure?] tuples to minimize size.
 */
export function serializeStroke(stroke: InkStroke): {
  pts: number[][];
  cfg: Omit<InkStroke, 'points'>;
} {
  const pts = stroke.points.map((p) => {
    const arr: number[] = [p.x, p.y];
    if (p.pressure !== undefined) arr.push(p.pressure);
    return arr;
  });
  const { points: _pts, ...cfg } = stroke;
  return { pts, cfg };
}

/**
 * Deserialize a serialized stroke back to InkStroke.
 */
export function deserializeStroke(data: {
  pts: number[][];
  cfg: Omit<InkStroke, 'points'>;
}): InkStroke {
  const points: StrokePoint[] = data.pts.map((arr) => ({
    x: arr[0] ?? 0,
    y: arr[1] ?? 0,
    pressure: arr[2],
  }));
  return { ...data.cfg, points };
}

// ─────────────────── Geometry helpers ────────────────────────

/** Euclidean distance between two points */
export function distance(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Midpoint between two points */
export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Clamp a value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Rotate a point around an origin */
export function rotatePoint(pt: Point2D, origin: Point2D, angleDeg: number): Point2D {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = pt.x - origin.x;
  const dy = pt.y - origin.y;
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

/** Normalize an angle to [0, 360) */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// ─────────────────── Zoom utilities ──────────────────────────

/** Compute zoom so that a bounding box fits inside a viewport */
export function zoomToFit(
  bbox: BoundingBox,
  viewportW: number,
  viewportH: number,
  padding = 32,
): number {
  if (bbox.width === 0 || bbox.height === 0) return 1;
  const scaleX = (viewportW - padding * 2) / bbox.width;
  const scaleY = (viewportH - padding * 2) / bbox.height;
  return Math.min(scaleX, scaleY, 5);
}

/** Clamp zoom level to sensible limits */
export function clampZoom(zoom: number): number {
  return clamp(zoom, 0.1, 5);
}

// ─────────────────── Color utilities ─────────────────────────

/** Convert hex color to rgba() CSS string */
export function hexToRgba(hex: string, alpha = 1): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten/darken a hex color by a percentage */
export function adjustHexBrightness(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  const r = clamp(parseInt(clean.substring(0, 2), 16) + Math.round(255 * percent / 100), 0, 255);
  const g = clamp(parseInt(clean.substring(2, 4), 16) + Math.round(255 * percent / 100), 0, 255);
  const b = clamp(parseInt(clean.substring(4, 6), 16) + Math.round(255 * percent / 100), 0, 255);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
