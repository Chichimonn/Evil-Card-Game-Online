import { CardAbility } from '../types/card';
import { getSurroundingHexes, parseHexId, offsetToCube, cubeToOffset, toHexId } from './hexGridMath';

/**
 * Path rules. An ability opts in with card data:
 *   "usesPath": true,
 *   "pathRule": "straight"   (optional: path must be a straight line; otherwise any connected path)
 *   "pathRule": "noSameDirectionTwice"   (each step turns: never the same direction twice in a row, e.g. Twisting Beam)
 *   "range": [min, max]      (path length limits)
 * Units along a path never block it (per the rules), so no blocking logic here.
 */
export interface PathSpec {
  minLength: number;
  maxLength: number;
  straight: boolean;
  zigzag?: boolean;
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
  if (lineMove) return { minLength: lineMove.minTiles, maxLength: lineMove.maxTiles, straight: true };
  if (!a.usesPath) return null;
  const range: number[] | undefined = Array.isArray(a.range) && a.range.length > 0 ? a.range : undefined;
  const pathLength: number | undefined = typeof a.pathLength === 'number' ? a.pathLength : undefined;
  return {
    minLength: pathLength ?? (range ? range[0] : 1),
    maxLength: pathLength ?? (range ? range[1] ?? range[0] : 1),
    straight: a.pathRule === 'straight',
    zigzag: a.pathRule === 'noSameDirectionTwice'
  };
}

/**
 * An ability whose first effect moves this unit in a straight line: up to N tiles (e.g. Spitfire Landing:
 * { type: 'move', target: 'self', distance: { max: 3 }, straightLine: true, free: true }), or exactly N tiles with a
 * number distance (e.g. Lunar Leap). ignoreUnits: it may pass over units on the way (e.g. Rift Leap).
 * Not for a line move that strikes the enemy in the direction moved (see getChargeLineMove).
 */
export function getSelfStraightLineMove(
  ability?: CardAbility | null
): { minTiles: number; maxTiles: number; ignoreUnits: boolean } | null {
  const effects: any[] = ability?.effects || [];
  const move = effects.find((e) => e.type === 'move');
  if (!move || move.target !== 'self' || !move.straightLine) return null;
  // The move must come first (an armour effect before it is fine, e.g. Skillful Joust)
  if (effects.slice(0, effects.indexOf(move)).some((e) => e.type !== 'armour')) return null;
  if (getChargeLineMove(ability)) return null;
  const max = typeof move.distance === 'number' ? move.distance : move.distance?.max;
  if (typeof max !== 'number' || max <= 0) return null;
  return { minTiles: typeof move.distance === 'number' ? max : 1, maxTiles: max, ignoreUnits: Boolean(move.ignoreUnitsInWay) };
}

/**
 * "Move up to N tiles in a chosen direction. Then, if there is an enemy in that direction, deal X to it" (e.g. Silver
 * Charge, Piercing Charge, Skillful Joust): a straight move followed by a damage effect on 'enemyInDirectionMoved'.
 * The player picks either the tile to stop on, or an enemy further along the line (the unit stops next to it, which
 * may be 0 tiles).
 */
export function getChargeLineMove(ability?: CardAbility | null): { maxTiles: number } | null {
  const effects: any[] = ability?.effects || [];
  const move = effects.find((e) => e.type === 'move');
  if (!move || move.target !== 'self' || !move.straightLine) return null;
  if (!effects.some((e) => e.type === 'damage' && e.target === 'enemyInDirectionMoved')) return null;
  const max = typeof move.distance === 'number' ? move.distance : move.distance?.max;
  return typeof max === 'number' && max > 0 ? { maxTiles: max } : null;
}

/**
 * Tiles to click for a charge line move from casterHex: each empty tile it can stop on (up to maxTiles away along an
 * empty line), mapped to its path, and the first enemy on each line within maxTiles + 1, mapped to the path that stops
 * next to it.
 */
export function getChargeLineChoices(
  casterHex: string,
  maxTiles: number,
  units: Record<string, { owner: string }>,
  owner: string
): Map<string, { path: string[]; strike: boolean }> {
  const out = new Map<string, { path: string[]; strike: boolean }>();
  for (const first of getSurroundingHexes(casterHex)) {
    const path: string[] = [];
    let prev = casterHex;
    let cur: string | null = first;
    while (cur && path.length <= maxTiles) {
      const u = units[cur];
      if (u) {
        if (u.owner !== owner) out.set(cur, { path: [...path], strike: true });
        break;
      }
      if (path.length === maxTiles) break;
      path.push(cur);
      out.set(cur, { path: [...path], strike: false });
      const next = stepBeyond(prev, cur);
      prev = cur;
      cur = next;
    }
  }
  return out;
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
  // (a zigzag path can't continue in the direction of its last step)
  const prev = path.length > 1 ? path[path.length - 2] : casterHex;
  const straightOn = spec.zigzag && path.length > 0 ? stepBeyond(prev, from) : null;
  return getSurroundingHexes(from).filter((h) => h !== casterHex && !path.includes(h) && h !== straightOn);
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
  if (spec.zigzag) {
    for (let i = 1; i < path.length; i++) {
      if (stepBeyond(i === 1 ? casterHex : path[i - 2], path[i - 1]) === path[i]) {
        return { valid: false, reason: 'This path can never go the same direction twice in a row.' };
      }
    }
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
