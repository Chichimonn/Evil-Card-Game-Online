import { parseHexId, offsetToCube, cubeToOffset, toHexId, getSurroundingHexes, getHexDistance, getHexesInRange } from './hexGridMath';
import { BattlefieldUnit } from '../types/game';
import { getUnitPassives } from './unitPassives';

/**
 * Calculates the hex directly in the same direction when moving from fromHex to toHex.
 * Uses cube coordinates vector continuation on flat-topped hex grid.
 */
export function getSameDirectionNextHex(fromHex: string, toHex: string): string | null {
  const pFrom = parseHexId(fromHex);
  const pTo = parseHexId(toHex);
  if (!pFrom || !pTo) return null;

  const cFrom = offsetToCube(pFrom.col, pFrom.rowIdx);
  const cTo = offsetToCube(pTo.col, pTo.rowIdx);

  const dq = cTo.q - cFrom.q;
  const dr = cTo.r - cFrom.r;

  const nextQ = cTo.q + dq;
  const nextR = cTo.r + dr;

  const off = cubeToOffset(nextQ, nextR);
  if (off.col < 0 || off.col > 7 || off.rowNum < 1 || off.rowNum > 6) {
    return null;
  }

  return toHexId(off.col, off.rowNum);
}

/**
 * Finds all intermediate hexes between fromHex and toHex that lie on a shortest path.
 * For distance 2, returns tiles that are adjacent to both fromHex and toHex.
 */
export function getIntermediateHexes(fromHex: string, toHex: string): string[] {
  const surrFrom = getSurroundingHexes(fromHex);
  const surrTo = getSurroundingHexes(toHex);
  return surrFrom.filter((h) => surrTo.includes(h));
}

/**
 * Checks if a unit can use the Momentum Charge passive.
 * "The first time this unit moves on its turn, it may move an additional tile in the same direction."
 */
export function checkMomentumCharge(
  unit: BattlefieldUnit,
  fromHex: string,
  toHex: string,
  unitsOnBoard: Record<string, BattlefieldUnit>,
  wasFirstMove: boolean
): string | null {
  if (!wasFirstMove) return null;

  // "The first time this unit moves on its turn, it may move an additional tile in the same direction" from data
  // (e.g. Momentum Charge, Momentum Slide): trigger 'self.firstMoveOnOwnTurn', move { extraTiles, direction: 'same' }
  const passives = getUnitPassives(unit);
  const hasMomentum = passives.some(
    (p) =>
      p.trigger === 'self.firstMoveOnOwnTurn' &&
      (p.effects || []).some((e: any) => e.type === 'move' && e.direction === 'same' && e.extraTiles)
  );
  if (!hasMomentum) return null;

  const nextHex = getSameDirectionNextHex(fromHex, toHex);
  if (!nextHex) return null;

  // Next tile in the same direction must be unoccupied
  if (unitsOnBoard[nextHex]) return null;

  return nextHex;
}

/**
 * Checks if a unit has the "Esoteric Pathways" passive.
 * "This unit can move into a board boundary if there is an empty tile on the opposite board boundary in the same row or column.
 * Doing so moves it to that tile (without passing through any units in the way. Still pay the AP cost for this unit to move)."
 */
export function hasEsotericPathways(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some((p) => {
    const id = p.id?.toLowerCase() || '';
    const name = p.name?.toLowerCase() || '';
    if (id === 'esoteric_pathways' || name.includes('esoteric pathways')) return true;
    return Boolean(p.effects?.some((e: any) => e.type === 'wrapAroundMove'));
  });
}

/**
 * Returns valid opposite-boundary hexes in the same row or column
 * for a unit with Esoteric Pathways.
 */
export function getEsotericPathwaysHexes(
  fromHex: string,
  unitsOnBoard: Record<string, BattlefieldUnit>
): string[] {
  const parsed = parseHexId(fromHex);
  if (!parsed) return [];
  const col = parsed.col;
  const rowNum = parsed.rowNum ?? (parsed.row + 1);
  const candidates: string[] = [];

  // Left boundary (col 0 / Column A): opposite boundary in same row is col 7 (Column H)
  if (col === 0) {
    const opp = toHexId(7, rowNum);
    if (!unitsOnBoard[opp]) candidates.push(opp);
  }

  // Right boundary (col 7 / Column H): opposite boundary in same row is col 0 (Column A)
  if (col === 7) {
    const opp = toHexId(0, rowNum);
    if (!unitsOnBoard[opp]) candidates.push(opp);
  }

  // Bottom boundary (rowNum 1): opposite boundary in same column is rowNum 6
  if (rowNum === 1) {
    const opp = toHexId(col, 6);
    if (!unitsOnBoard[opp]) candidates.push(opp);
  }

  // Top boundary (rowNum 6): opposite boundary in same column is rowNum 1
  if (rowNum === 6) {
    const opp = toHexId(col, 1);
    if (!unitsOnBoard[opp]) candidates.push(opp);
  }

  return candidates;
}

/**
 * A once-per-turn "move 2 tiles at a time, through units" passive (e.g. Rabble Rouse). Read from
 * { type: 'modifyMove', moveTwoTilesAtATime: true, mayMoveThroughUnits?, damageToEnemiesMovedThrough? }.
 * Returns null if the unit has none or already used it this turn (passiveTurnMarks vs the current turn number).
 */
export function getMoveThroughPassive(
  unit: BattlefieldUnit | null | undefined,
  turnNumber: number
): { key: string; name: string; damage: number; throughUnits: boolean; everyMove?: boolean; anyUnit?: boolean } | null {
  if (!unit) return null;
  for (const p of getUnitPassives(unit)) {
    // "When moving, this unit ignores other units and obstacles... must end its turn alone on its tile" (e.g. Aerial
    // Apex): every move may pass over any unit or obstacle, landing on an empty tile around it; only enemies take damage
    const fly: any = p.effects?.find((e: any) => e.type === 'modifyMove' && e.ignoreUnitsAndObstacles);
    if (fly) {
      return {
        key: p.id || p.name,
        name: p.name,
        damage: typeof fly.damageToEnemiesPassedThrough === 'number' ? fly.damageToEnemiesPassedThrough : 0,
        throughUnits: true,
        everyMove: true,
        anyUnit: true
      };
    }
    const eff: any = p.effects?.find((e: any) => e.type === 'modifyMove' && e.moveTwoTilesAtATime);
    if (!eff) continue;
    const key = p.id || p.name;
    if (unit.passiveTurnMarks?.[key] === turnNumber) return null;
    return {
      key,
      name: p.name,
      damage: typeof eff.damageToEnemiesMovedThrough === 'number' ? eff.damageToEnemiesMovedThrough : 0,
      throughUnits: Boolean(eff.mayMoveThroughUnits)
    };
  }
  return null;
}

/** Empty tiles a unit could land on after passing through throughHex (its own current tile counts as empty). */
export function getLandingTilesAround(
  throughHex: string,
  moverHex: string,
  unitsOnBoard: Record<string, BattlefieldUnit>
): string[] {
  return getSurroundingHexes(throughHex).filter((h) => h !== throughHex && (!unitsOnBoard[h] || h === moverHex));
}

/**
 * Returns the scorch effect a unit leaves on the tile it just exited for this move, if any
 * (e.g. Elemental Wake: { type: 'scorchTile', tile: 'lastTileLeft', onMoveNumbers: [2, 3] }).
 */
export function getMoveScorchEffect(
  unit: BattlefieldUnit | null | undefined,
  moveNumber: number
): { damage: number; duration?: string; passiveName: string } | null {
  if (!unit) return null;
  for (const p of getUnitPassives(unit)) {
    const eff: any = p.effects?.find(
      (e: any) =>
        e.type === 'scorchTile' &&
        e.tile === 'lastTileLeft' &&
        (!Array.isArray(e.onMoveNumbers) || e.onMoveNumbers.includes(moveNumber))
    );
    if (eff) return { damage: typeof eff.damage === 'number' ? eff.damage : 4, duration: eff.duration, passiveName: p.name };
  }
  return null;
}

/**
 * Checks if a unit has the "Magical Omnipresence" passive.
 * "This unit may only move once per turn, but it may move to any empty tile within Range 2 (ignoring units in the way)."
 */
export function hasMagicalOmnipresence(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some((p) => {
    const id = p.id?.toLowerCase() || '';
    const name = p.name?.toLowerCase() || '';
    if (id === 'magical_omnipresence' || name.includes('magical omnipresence')) return true;
    return Boolean(
      p.effects?.some(
        (e: any) =>
          e.type === 'modifyMove' &&
          (e.moveToAnyEmptyTileWithinRange !== undefined || e.maxMovesPerTurn === 1)
      )
    );
  });
}

/**
 * Returns whether a unit with Magical Omnipresence is allowed to move right now.
 * Units with Magical Omnipresence may only move once per turn.
 */
export function canOmnipresenceUnitMove(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return true;
  if (!hasMagicalOmnipresence(unit)) return true;
  return !unit.movedThisTurn;
}

/**
 * Returns all unoccupied hexes within Range 2 for a unit with Magical Omnipresence.
 */
export function getMagicalOmnipresenceHexes(
  fromHex: string,
  unitsOnBoard: Record<string, BattlefieldUnit>
): string[] {
  return getHexesInRange(fromHex, 1, 2).filter((hexId) => !unitsOnBoard[hexId]);
}


/**
 * "Whenever this unit moves 2 or more tiles in a straight line during a turn, its next attack deals an additional
 * N damage per hit and inflicts knockback 1 on its last hit" (e.g. Unstoppable Charge). Read from a passive with
 * trigger 'self.movedTwoOrMoreTilesInStraightLine' and a 'buffNextAttack' effect. Call with the unit after a move
 * (its movedDirectionsThisTurn already including it): the last two moves in the same direction grant the buff.
 * Returns the unit (with the buff if granted) and the passive's name when it was newly granted.
 */
export function applyStraightLineMoveBuff(unit: BattlefieldUnit): { unit: BattlefieldUnit; granted: string | null } {
  const dirs = unit.movedDirectionsThisTurn || [];
  if (dirs.length < 2 || dirs[dirs.length - 1] !== dirs[dirs.length - 2]) return { unit, granted: null };
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.movedTwoOrMoreTilesInStraightLine') continue;
    const eff: any = (p.effects || []).find((e: any) => e.type === 'buffNextAttack');
    if (!eff) continue;
    // Doesn't stack: a buff from this passive that is still waiting stays as it is
    if (unit.nextAttackBonus?.source === p.name) return { unit, granted: null };
    const amount = typeof eff.addDamage?.amount === 'number' ? eff.addDamage.amount : 0;
    const scope = eff.addDamage?.scope === 'firstHit' ? 'firstHit' : 'allHits';
    return {
      unit: {
        ...unit,
        nextAttackBonus: {
          amount,
          scope,
          source: p.name,
          ...(typeof eff.knockbackOnLastHit === 'number' ? { knockbackOnLastHit: eff.knockbackOnLastHit } : {})
        }
      },
      granted: p.name
    };
  }
  return { unit, granted: null };
}