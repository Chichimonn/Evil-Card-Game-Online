// Coordinate system for 8x6 flat-topped hexagonal grid with odd columns shifted down
// Columns A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7
// Rows in SVG: rowIdx 0 = Row 6 (top), rowIdx 5 = Row 1 (bottom)

import { PlayerId } from '../types/game';
import { CardAbility } from '../types/card';

const COL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function parseHexId(hexId: string): { col: number; row: number; rowIdx: number; rowNum: number } | null {
  if (!hexId || hexId.length < 2) return null;
  const colLetter = hexId[0].toUpperCase();
  const rowNum = parseInt(hexId.slice(1), 10);
  const col = COL_LETTERS.indexOf(colLetter);
  const row = rowNum - 1; // 0-indexed: Row 1 -> 0, Row 6 -> 5
  if (col < 0 || col > 7 || isNaN(row) || row < 0 || row > 5) return null;
  const rowIdx = 6 - rowNum; // SVG row index: Row 6 -> 0 (top), Row 1 -> 5 (bottom)
  return { col, row, rowIdx, rowNum };
}

export function toHexId(col: number, rowNum: number): string {
  return `${COL_LETTERS[col]}${rowNum}`;
}

// Convert SVG offset coordinates (odd-q vertical offset: odd columns B, D, F, H shifted downwards) to cube coordinates
export function offsetToCube(col: number, rowIdx: number): { q: number; r: number; s: number } {
  const q = col;
  const r = rowIdx - Math.floor(col / 2);
  const s = -q - r;
  return { q, r, s };
}

// Convert cube coordinates back to SVG offset coordinates
export function cubeToOffset(q: number, r: number): { col: number; rowIdx: number; rowNum: number } {
  const col = q;
  const rowIdx = r + Math.floor(col / 2);
  const rowNum = 6 - rowIdx;
  return { col, rowIdx, rowNum };
}

// 6 cardinal cube unit directions on a flat-topped hexagonal grid
export const CUBE_DIRECTIONS = [
  { dq: 1, dr: 0, ds: -1 },
  { dq: 1, dr: -1, ds: 0 },
  { dq: 0, dr: -1, ds: 1 },
  { dq: -1, dr: 0, ds: 1 },
  { dq: -1, dr: 1, ds: 0 },
  { dq: 0, dr: 1, ds: -1 }
];

// Hexagonal distance between two hex tiles
export function getHexDistance(hexA: string, hexB: string): number {
  const pA = parseHexId(hexA);
  const pB = parseHexId(hexB);
  if (!pA || !pB) return 999;

  const a = offsetToCube(pA.col, pA.rowIdx);
  const b = offsetToCube(pB.col, pB.rowIdx);
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

/**
 * Returns the direction index (0..5 in CUBE_DIRECTIONS) from fromHex to toHex,
 * or null if toHex is not in a straight line or same hex.
 */
export function getHexMovementDirection(fromHex: string, toHex: string): number | null {
  const pA = parseHexId(fromHex);
  const pB = parseHexId(toHex);
  if (!pA || !pB) return null;
  const a = offsetToCube(pA.col, pA.rowIdx);
  const b = offsetToCube(pB.col, pB.rowIdx);
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  const ds = b.s - a.s;
  const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
  if (dist === 0) return null;
  if (dq % dist === 0 && dr % dist === 0 && ds % dist === 0) {
    const unitDq = dq / dist;
    const unitDr = dr / dist;
    const unitDs = ds / dist;
    const dirIndex = CUBE_DIRECTIONS.findIndex(
      (d) => d.dq === unitDq && d.dr === unitDr && d.ds === unitDs
    );
    return dirIndex !== -1 ? dirIndex : null;
  }
  return null;
}

// Get the tile directly behind targetHex relative to fromHex
export function getHexBehind(fromHex: string, targetHex: string): string | null {
  const pFrom = parseHexId(fromHex);
  const pTarget = parseHexId(targetHex);
  if (!pFrom || !pTarget) return null;
  const cFrom = offsetToCube(pFrom.col, pFrom.rowIdx);
  const cTarget = offsetToCube(pTarget.col, pTarget.rowIdx);
  const dist = getHexDistance(fromHex, targetHex);
  if (dist === 0) return null;
  const dq = Math.round((cTarget.q - cFrom.q) / dist);
  const dr = Math.round((cTarget.r - cFrom.r) / dist);
  const behindQ = cTarget.q + dq;
  const behindR = cTarget.r + dr;
  const off = cubeToOffset(behindQ, behindR);
  if (off.col < 0 || off.col > 7 || off.rowNum < 1 || off.rowNum > 6) return null;
  return toHexId(off.col, off.rowNum);
}

/**
 * Returns the hex directly behind a unit based on its owner.
 * Units always face forward for "behind":
 * - Player 1 units face forward towards Row 6, so behind is Row - 1 (e.g. D1 is behind D2 for Player 1 / when Player 2 attacks).
 * - Player 2 units face forward towards Row 1, so behind is Row + 1 (e.g. D6 is behind D5 for Player 2 / when Player 1 attacks).
 */
export function getTileBehindUnit(hexId: string, unitOwner: PlayerId): string | null {
  const p = parseHexId(hexId);
  if (!p) return null;
  const rowNum = parseInt(hexId.slice(1), 10);
  const behindRowNum = unitOwner === 'player1' ? rowNum - 1 : rowNum + 1;
  if (behindRowNum < 1 || behindRowNum > 6) return null;
  return toHexId(p.col, behindRowNum);
}

/**
 * "Behind" by the rules: the tile 1 row closer to the enemy back row from the perspective of the effect's controller,
 * in the same column (none on that back row). For an enemy unit this is the same as getTileBehindUnit with its owner;
 * for a friendly one it is the tile on the far side of it from your own back row.
 */
export function getTileBehindFor(hexId: string, controller: PlayerId): string | null {
  return getTileBehindUnit(hexId, controller === 'player1' ? 'player2' : 'player1');
}

/**
 * Checks if an attack against targetHex is made from the tile behind the target unit.
 */
export function isAttackFromBehind(
  attackerHex: string | null | undefined,
  targetHex: string | null | undefined,
  targetOwner: PlayerId | null | undefined,
  ability?: CardAbility | null
): boolean {
  if (
    ability?.parentAbilityId === 'blink_strike' ||
    ability?.id?.startsWith('blink_strike__') ||
    (ability as any)?.treatAsFromBehind === true
  ) {
    return true;
  }
  if (!attackerHex || !targetHex || !targetOwner) return false;
  const behindHex = getTileBehindUnit(targetHex, targetOwner);
  return Boolean(behindHex && attackerHex === behindHex);
}

// Get all legal surrounding tiles (range 1) on the 8x6 board
export function getSurroundingHexes(hexId: string): string[] {
  const pos = parseHexId(hexId);
  if (!pos) return [];

  const neighbors: string[] = [];
  for (let c = 0; c < 8; c++) {
    for (let rNum = 1; rNum <= 6; rNum++) {
      const neighborId = toHexId(c, rNum);
      if (neighborId !== hexId && getHexDistance(hexId, neighborId) === 1) {
        neighbors.push(neighborId);
      }
    }
  }
  return neighbors;
}

// Get all hexes within given range [minRange, maxRange]
export function getHexesInRange(originHex: string, minRange: number = 1, maxRange: number = 1): string[] {
  const results: string[] = [];
  for (let c = 0; c < 8; c++) {
    for (let rNum = 1; rNum <= 6; rNum++) {
      const targetId = toHexId(c, rNum);
      const dist = getHexDistance(originHex, targetId);
      if (dist >= minRange && dist <= maxRange) {
        results.push(targetId);
      }
    }
  }
  return results;
}

// Get the up to 6 straight lines of hexes radiating outward from originHex up to the board edge
export function getAllStraightLinesFromHex(originHex: string): string[][] {
  const pos = parseHexId(originHex);
  if (!pos) return [];

  const originCube = offsetToCube(pos.col, pos.rowIdx);
  const lines: string[][] = [];

  for (const dir of CUBE_DIRECTIONS) {
    const line: string[] = [];
    let step = 1;
    while (true) {
      const q = originCube.q + step * dir.dq;
      const r = originCube.r + step * dir.dr;
      const { col, rowNum } = cubeToOffset(q, r);
      if (col < 0 || col > 7 || rowNum < 1 || rowNum > 6) break;
      line.push(toHexId(col, rowNum));
      step++;
    }
    if (line.length > 0) {
      lines.push(line);
    }
  }

  return lines;
}

// Get all hexes across all 6 straight lines around originHex
export function getStraightLineHexes(originHex: string): string[] {
  return getAllStraightLinesFromHex(originHex).flat();
}

// Check if an ability is a straight-line ability (e.g. Full Bore, Weighty Shot, Quartz Ray)
export function isStraightLineAbility(
  ability: { id?: string; straightLine?: boolean; target?: string; effects?: any[] } | null | undefined
): boolean {
  if (!ability) return false;
  if (ability.straightLine) return true;
  if (ability.target === 'direction') return true;
  if (ability.id === 'full_bore' || ability.id === 'weighty_shot' || ability.id === 'quartz_ray') return true;
  if (ability.effects?.some((e: any) => e.area === 'firstUnitInStraightLine' || e.area === 'allUnitsInLine')) return true;
  return false;
}

// Check if an ability targets an empty tile (e.g. Stone Wall, Build Structure, Pitch Camp, Shade Step, Vanish)
export function isAbilityTargetingEmptyTile(
  ability: { id?: string; target?: string; targetText?: string; text?: string; effects?: any[] } | null | undefined
): boolean {
  if (!ability) return false;
  if (ability.target === 'emptyTile') return true;
  // A unit target, even one described by the tile next to it (e.g. Shadow Emergence: "targets unit with an empty tile
  // behind it"), is a unit
  if (ability.target === 'unit' || ability.target === 'enemyUnit' || ability.target === 'anyUnit' || ability.target === 'friendlyUnit') {
    return false;
  }
  if (ability.targetText?.toLowerCase().includes('empty tile') || ability.targetText?.toLowerCase().includes('empty surrounding')) return true;
  if (ability.id === 'stone_wall' || ability.id === 'build_structure' || ability.id === 'pitch_camp' || ability.id === 'shade_step' || ability.id === 'vanish' || ability.id === 'reckless_leap') return true;
  // Abilities that deal damage target a unit, not an empty tile
  if (ability.effects?.some((e: any) => e.type === 'damage')) return false;
  if (ability.effects?.some((e: any) => e.tile === 'chosenEmptySurrounding' || e.tile === 'chosenEmptySurroundingSelf' || (e.type === 'createToken' && e.tile === 'target'))) return true;
  return false;
}

// Check if an ability targets ANY tile (including empty or occupied, e.g. Exploding Fireball, Powder Charge, Rain of Arrows, Acidic Bile, Starburst, Human Cannonball, Rainbow Geyser)
export function isAbilityTargetingAnyTile(
  ability: { id?: string; target?: string; targetText?: string; text?: string; effects?: any[] } | null | undefined
): boolean {
  if (!ability) return false;
  if (ability.target === 'tile') return true;
  if (ability.effects?.some((e: any) => e.area === 'targetTile' || e.tile === 'target')) {
    if (!isAbilityTargetingEmptyTile(ability)) return true;
  }
  return false;
}

// Check if an ability requires selecting a target on the board (unit or tile)
export function isTargetedAbility(
  ability: { id?: string; name?: string; target?: string; targetText?: string; tags?: string[]; text?: string; effects?: any[]; range?: number[]; rangeText?: string; isMultiStage?: boolean } | null | undefined
): boolean {
  if (!ability) return false;
  if (ability.target === 'self') return false;
  // A tile to click (e.g. Reckless Leap), even when its only damage is to itself
  if (ability.target === 'emptyTile') return true;
  if (
    ability.id === 'fortress_stance' ||
    ability.id === 'gird_for_battle' ||
    ability.id === 'flawless_parry' ||
    ability.id === 'roast_a_marshmallow' ||
    ability.id === 'profane_insight' ||
    ability.id === 'ready_stance' ||
    ability.id === 'deep_research' ||
    ability.id === 'field_notes' ||
    ability.name?.toLowerCase().includes('field notes') ||
    (ability.effects?.some((e: any) => e.type === 'revealTop') &&
      !ability.effects?.some((e2: any) => e2.type === 'damage') &&
      !ability.tags?.includes('melee') &&
      !ability.tags?.includes('ranged') &&
      !ability.text?.toLowerCase().includes('damage'))
  ) {
    return false;
  }
  // Check if all damage effects are strictly self-directed (e.g. Profane Insight)
  const damageEffects = (ability.effects || []).filter((e: any) => e.type === 'damage');
  if (
    damageEffects.length > 0 &&
    damageEffects.every((e: any) => e.target === 'self' || e.target === 'caster') &&
    !ability.tags?.includes('melee') &&
    !ability.tags?.includes('ranged')
  ) {
    return false;
  }
  // Check if ability is a self-buff or self-reaction (like reflect stances or armour up)
  const isReflectStanceAbility =
    ability.effects?.some((e) => e.type === 'setReact' && e.effects?.some((re: any) => re.type === 'reflect')) ||
    (ability.text?.toLowerCase().includes('reflect') && !ability.text?.toLowerCase().includes('deal'));
  if (isReflectStanceAbility) {
    return false;
  }
  if (
    ability.effects?.some((e) => e.type === 'armour' && (e.target === 'self' || !e.target)) &&
    !ability.effects?.some((e) => e.type === 'damage') &&
    !ability.tags?.includes('melee') &&
    !ability.tags?.includes('ranged') &&
    ability.target !== 'tile' &&
    ability.target !== 'enemyUnit' &&
    ability.target !== 'friendlyUnit' &&
    !isAbilityTargetingEmptyTile(ability) &&
    !isAbilityTargetingAnyTile(ability)
  ) {
    return false;
  }
  if (ability.isMultiStage || ability.id === 'buddy_tag' || ability.id === 'tactical_swap' || ability.id === 'nexus_displacement' || ability.id === 'mounted_charge' || ability.id === 'drakes_flight' || (ability as any).isChargeFlight) return true;
  if (ability.effects?.some((e) => e.type === 'removeArmour')) return true;
  if (isStraightLineAbility(ability)) return true;
  if (isAbilityTargetingEmptyTile(ability)) return true;
  if (isAbilityTargetingAnyTile(ability)) return true;
  if (ability.target === 'obstructingWall') return true;
  if (ability.target && ability.target !== 'self') return true;
  if (ability.targetText?.toLowerCase().includes('tile') || ability.targetText?.toLowerCase().includes('target')) return true;
  if (
    ability.tags?.includes('melee') ||
    ability.tags?.includes('ranged') ||
    ability.tags?.includes('attack') ||
    ability.text?.toLowerCase().includes('deal') ||
    ability.text?.toLowerCase().includes('damage')
  ) {
    return true;
  }
  if ((ability.range && ability.range.length > 0) || ability.rangeText) {
    if (ability.target !== 'self') return true;
  }
  return false;
}

// Check if a tile is scorched (e.g. by surrounding a Raging Bonfire or via Volatile Hexes / Echoing Incantation)
export function isTileScorched(
  hexId: string,
  unitsOnBoard: Record<string, { card?: { id?: string; name?: string; passives?: { effects?: unknown[] }[] }; statuses?: string[] }>,
  scorchedTiles?: Record<string, { expiresOnTurnEndFor?: string; turnsRemaining?: number; casterPlayer?: string }> | null
): boolean {
  const surrounding = getSurroundingHexes(hexId);
  // "As soon as a scorched tile is surrounding this unit, it is no longer scorched. This effect overrides other
  // effects" (e.g. Deep Freeze, { type: 'unscorchTiles' }): wins over a Raging Bonfire too (unless its passives are off)
  const frozen = surrounding.some((h) => {
    const u = unitsOnBoard[h];
    if (!u || u.statuses?.some((s) => s === 'passives_removed' || s === 'passives_removed_this_turn')) return false;
    return Boolean(u.card?.passives?.some((p) => (p.effects || []).some((e: any) => e?.type === 'unscorchTiles')));
  });
  if (frozen) return false;
  if (scorchedTiles && scorchedTiles[hexId]) {
    return true;
  }
  for (const surrHex of surrounding) {
    const u = unitsOnBoard[surrHex];
    if (u && (u.card?.id === 'raging_bonfire' || u.card?.name === 'Raging Bonfire')) {
      return true;
    }
  }
  return false;
}

// Knockback logic:
// Moves the target unit `distance` tiles in a straight line directly away from the attacker `originHex`.
// Applies ONLY on melee or range 1 abilities (i.e. originHex and targetHex must be distance 1).
export function getKnockbackDestination(
  originHex: string,
  targetHex: string,
  distance: number,
  occupiedHexes: Set<string> | Record<string, unknown>
): { finalHex: string; tilesMoved: number; blockedCount: number; path: string[] } {
  const pOrigin = parseHexId(originHex);
  const pTarget = parseHexId(targetHex);
  if (!pOrigin || !pTarget || distance <= 0) {
    return { finalHex: targetHex, tilesMoved: 0, blockedCount: 0, path: [] };
  }

  // Only allowed if distance is 1 (adjacent / melee)
  if (getHexDistance(originHex, targetHex) !== 1) {
    return { finalHex: targetHex, tilesMoved: 0, blockedCount: 0, path: [] };
  }

  const cOrigin = offsetToCube(pOrigin.col, pOrigin.rowIdx);
  const cTarget = offsetToCube(pTarget.col, pTarget.rowIdx);

  // Unit direction vector from attacker to target
  const dq = cTarget.q - cOrigin.q;
  const dr = cTarget.r - cOrigin.r;

  const isOccupied = (hexId: string) => {
    if (occupiedHexes instanceof Set) {
      return occupiedHexes.has(hexId);
    }
    return Boolean(occupiedHexes[hexId]);
  };

  let currentHex = targetHex;
  let tilesMoved = 0;
  let blockedCount = 0;
  const path: string[] = [];

  for (let step = 1; step <= distance; step++) {
    const q = cTarget.q + step * dq;
    const r = cTarget.r + step * dr;
    const { col, rowNum } = cubeToOffset(q, r);

    // Check board bounds
    if (col < 0 || col > 7 || rowNum < 1 || rowNum > 6) {
      blockedCount += (distance - step + 1);
      break;
    }

    const nextHexId = toHexId(col, rowNum);
    // Check if occupied by another unit (target itself is vacating targetHex)
    if (isOccupied(nextHexId) && nextHexId !== targetHex) {
      blockedCount += (distance - step + 1);
      break;
    }

    currentHex = nextHexId;
    tilesMoved++;
    path.push(nextHexId);
  }

  return {
    finalHex: currentHex,
    tilesMoved,
    blockedCount,
    path
  };
}

