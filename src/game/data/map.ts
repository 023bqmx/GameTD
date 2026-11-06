import type { Cell, Vec } from '../engine/types';

/**
 * Logical map in grid cells. Landscape screens render it as 16×9; portrait
 * screens render it transposed (9×16) so the path stays large on phones.
 * Game logic only ever works in these logical coordinates.
 */
export const COLS = 16;
export const ROWS = 9;

export const PATH: Vec[] = [
  { x: -0.8, y: 1.5 },
  { x: 3.5, y: 1.5 },
  { x: 3.5, y: 6.5 },
  { x: 7.5, y: 6.5 },
  { x: 7.5, y: 2.5 },
  { x: 11.5, y: 2.5 },
  { x: 11.5, y: 6.5 },
  { x: 13.5, y: 6.5 },
  { x: 13.5, y: 4.5 },
  { x: 14.7, y: 4.5 },
];

export const CORE_POS: Vec = { x: 14.75, y: 4.5 };
export const RIFT_POS: Vec = { x: 0.7, y: 1.5 };

const key = (c: number, r: number) => `${c},${r}`;

function rasterizePath(): Set<string> {
  const cells = new Set<string>();
  for (let i = 0; i < PATH.length - 1; i++) {
    const a = PATH[i], b = PATH[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.ceil(len * 8);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const c = Math.floor(a.x + (b.x - a.x) * t);
      const r = Math.floor(a.y + (b.y - a.y) * t);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) cells.add(key(c, r));
    }
  }
  return cells;
}

export const PATH_CELLS = rasterizePath();

function blocked(c: number, r: number) {
  // core platform & rift area
  if (c >= 14 && r >= 3 && r <= 5) return true;
  if (c === 0 && r <= 2) return true;
  return false;
}

/** Build pads: free cells touching the path (8-neighbourhood). */
function computePads(): Cell[] {
  const pads: Cell[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (PATH_CELLS.has(key(c, r)) || blocked(c, r)) continue;
      let touches = false;
      for (let dr = -1; dr <= 1 && !touches; dr++)
        for (let dc = -1; dc <= 1; dc++)
          if (PATH_CELLS.has(key(c + dc, r + dr))) { touches = true; break; }
      if (touches) pads.push({ c, r });
    }
  }
  return pads;
}

export const PADS: Cell[] = computePads();
export const isPad = (c: number, r: number) => PADS.some((p) => p.c === c && p.r === r);
