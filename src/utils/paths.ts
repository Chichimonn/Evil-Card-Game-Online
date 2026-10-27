import { CardAbility } from '../types/card';
import { getSurroundingHexes, parseHexId, offsetToCube, cubeToOffset, toHexId } from './hexGridMath';

/**
 * Path rules. An ability opts in with card data:
 *   "usesPath": true,
 *   "pathRule": "straight"   (optional: path must be a straight line; otherwise any connected path)
 *   "range": [min, max]      (path length limits)
 * Units along a path never block it (per the rules), so no blocking logic here.
 */
export interface PathSpec {
  minLength: number;
  maxLength: number;
  straight: boolean;
}

export function getPathSpec(ability?: CardAbility | null): PathSpec | null {
  const a = ability as any;
  if (!a) return null;
  if (a.id === 'bananarang') {
    return {
      minLength: 3,
      maxLength: 3,
      straight: false
    };
  }
  // "Move up to N tiles in a straight line for free, then ..." (e.g. Spitfire Landing): the move is drawn as a path
  const lineMove = getSelfStraightLineMove(ability);
  if (lineMove) return { minLength: 1, maxLength: lineMove.maxTiles, straight: true };
  if (!a.usesPath) return null;
  const range: number[] | undefined = Array.isArray(a.range) && a.range.length > 0 ? a.range : undefined;
  const pathLength: number | undefined = typeof a.pathLength === 'number' ? a.pathLength : undefined;
  return {
    minLength: pathLength ?? (range ? range[0] : 1),
    maxLength: pathLength ?? (range ? range[1] ?? range[0] : 1),
    straight: a.pathRule === 'straight'
  };
}

/**
 * An ability whose first effect moves this unit up to N tiles in a straight line (e.g. Spitfire Landing:
 * { type: 'move', target: 'self', distance: { max: 3 }, straightLine: true, free: true }).
 */
export function getSelfStraightLineMove(ability?: CardAbility | null): { maxTiles: number } | null {
  const first: any = (ability?.effects || [])[0];
  if (!first || first.type !== 'move' || first.target !== 'self' || !first.straightLine) return null;
  const max = typeof first.distance === 'number' ? first.distance : first.distance?.max;
  return typeof max === 'number' && max > 0 ? { maxTiles: max } : null;
}

/** The tile directly past `throughHex` when travelling from `fromHex` (adjacent tiles). */
function stepBeyond(fromHex: string, throughHex: string): string | null {
  const a = parseHexId(fromHex);
  const b = parseHexId(throughHex);
  if (!a || !b) return null;
  const ca = offsetToCube(a.col, a.rowIdx);
  const cb = offsetToCube(b.col, b.rowIdx);
  const { col, rowNum } = cubeToOffset(cb.q + (cb.q - ca.q), cb.r + (cb.r - ca.r));
  if (col < 0 || col >= 8 || rowNum < 1 || rowNum > 6) return null;
  return toHexId(col, rowNum);
}

/** Every tile on the 6 straight lines out of the caster, mapped to the full path that reaches it. */
function getStraightLines(casterHex: string, maxLength: number): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const first of getSurroundingHexes(casterHex)) {
    const line = [first];
    out.set(first, [...line]);
    let prev = casterHex;
    let cur = first;
    while (line.length < maxLength) {
      const next = stepBeyond(prev, cur);
      if (!next) break;
      line.push(next);
      out.set(next, [...line]);
      prev = cur;
      cur = next;
    }
  }
  return out;
}

/** Tiles that can legally be clicked next. */
export function getNextPathHexes(casterHex: string, path: string[], spec: PathSpec): string[] {
  if (spec.straight) return Array.from(getStraightLines(casterHex, spec.maxLength).keys());
  if (path.length >= spec.maxLength) return [];
  const from = path.length > 0 ? path[path.length - 1] : casterHex;
  return getSurroundingHexes(from).filter((h) => h !== casterHex && !path.includes(h));
}

/**
 * Returns the new path after a click.
 * Straight paths: the clicked tile is the end, the whole line is filled in.
 * Other paths: the click adds a tile; clicking the last tile again removes it.
 */
export function extendPath(casterHex: string, path: string[], clicked: string, spec: PathSpec): string[] {
  if (spec.straight) return getStraightLines(casterHex, spec.maxLength).get(clicked) ?? path;
  if (path.length > 0 && path[path.length - 1] === clicked) return path.slice(0, -1);
  return [...path, clicked];
}

/** Final check when the player confirms. */
export function validatePath(casterHex: string, path: string[], spec: PathSpec): { valid: boolean; reason?: string } {
  if (path.length < spec.minLength) {
    return { valid: false, reason: `This path needs at least ${spec.minLength} tile(s).` };
  }
  if (path.length > spec.maxLength) {
    return { valid: false, reason: `This path can be at most ${spec.maxLength} tile(s) long.` };
  }
  let prev = casterHex;
  const seen = new Set<string>();
  for (const h of path) {
    if (h === casterHex || seen.has(h)) return { valid: false, reason: 'A path cannot revisit a tile.' };
    if (!getSurroundingHexes(prev).includes(h)) {
      return { valid: false, reason: 'Path tiles must connect one after another.' };
    }
    seen.add(h);
    prev = h;
  }
  if (spec.straight) {
    const line = getStraightLines(casterHex, spec.maxLength).get(path[path.length - 1]);
    if (!line || line.join(',') !== path.join(',')) {
      return { valid: false, reason: 'This ability needs a straight line.' };
    }
  }
  return { valid: true };
}

export const formatPath = (path: string[]): string => path.join(' → ');
