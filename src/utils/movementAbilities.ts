import { parseHexId, offsetToCube, cubeToOffset, toHexId, getSurroundingHexes, getHexDistance, getHexesInRange } from './hexGridMath';
import { BattlefieldUnit, PlayerId } from '../types/game';
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
 * "May move another tile in the same direction for free" passives, beyond the first-move kind (checkMomentumCharge):
 *   own, trigger 'self.firstActionIsMove' (e.g. Daybreak Charge: its first action this turn is this move),
 *   own, trigger 'self.spendsApToMove' (e.g. Extreme Momentum: every paid move; it may also armour up to N first),
 *   a surrounding friendly unit's, trigger 'friendlyUnitSurroundingSelfSpendsApToMoveFirstTimeEachTurn' (e.g. Tailwind:
 *   the mover's first paid move this turn, starting next to it).
 * unitBefore is the mover as it was before this move; paid: the move cost AP.
 */
export function getExtraSameDirectionMove(
  unitBefore: BattlefieldUnit,
  fromHex: string,
  toHex: string,
  unitsOnBoard: Record<string, BattlefieldUnit>,
  paid: boolean
): { nextHex: string; name: string; armourUpTo: number } | null {
  const nextHex = getSameDirectionNextHex(fromHex, toHex);
  if (!nextHex || unitsOnBoard[nextHex]) return null;
  const sameDir = (p: any) =>
    (p.effects || []).some((e: any) => e.type === 'move' && e.direction === 'same' && e.extraTiles);
  const actionsBefore =
    Object.entries(unitBefore.usedTurnCounts || {}).some(([k, v]) => v > 0 && k !== 'universal:move') ||
    (unitBefore.usedTurnCounts?.['universal:move'] || 0) > 0 ||
    Boolean(unitBefore.usedUniversalDrawThisTurn);
  const firstPaidMove = !(unitBefore.usedTurnCounts?.['universal:move'] || 0);
  for (const p of getUnitPassives(unitBefore)) {
    if (!sameDir(p)) continue;
    if ((p.trigger === 'self.firstActionIsMove' && !actionsBefore) || (p.trigger === 'self.spendsApToMove' && paid)) {
      const armour: any = (p.effects || []).find((e: any) => e.type === 'armour' && typeof e.upTo === 'number');
      return { nextHex, name: p.name, armourUpTo: armour ? armour.upTo : 0 };
    }
  }
  if (paid && firstPaidMove) {
    for (const h of getSurroundingHexes(fromHex)) {
      const n = unitsOnBoard[h];
      if (!n || n.owner !== unitBefore.owner || n.instanceId === unitBefore.instanceId) continue;
      const p = getUnitPassives(n).find(
        (q) => q.trigger === 'friendlyUnitSurroundingSelfSpendsApToMoveFirstTimeEachTurn' && sameDir(q)
      );
      if (p) return { nextHex, name: `${n.card.name}'s ${p.name}`, armourUpTo: 0 };
    }
  }
  return null;
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
): {
  key: string;
  name: string;
  damage: number;
  throughUnits: boolean;
  everyMove?: boolean;
  anyUnit?: boolean;
  // Only enemies on the tile take the damage (e.g. Aerial Apex); otherwise any unit there does (e.g. Pirate's Curse)
  damageEnemiesOnly?: boolean;
  // What happens to/for the unit on the tile moved onto, before this unit moves off it again (see applyMoveOntoUnit)
  onMoveOntoUnit?: any[];
  // "...if it is on a tile with another unit on it, that unit moves with it" (e.g. Hidden Strings): moving onto a unit
  // picks it up (like Engulf) instead of landing around it
  carriesUnit?: boolean;
} | null {
  if (!unit) return null;
  for (const p of getUnitPassives(unit)) {
    // "This unit may move over other units. If this unit would end its turn while it is not alone on its tile, [...],
    // then move this unit to an empty surrounding tile for free" (the ghosts, Aerial Apex, Rabble Rouse):
    // { type: 'modifyMove', moveOverUnits: 'any' | 'enemy', relocateToEmptySurroundingTile: true, onMoveOntoUnit: [...] }.
    // Only one unit fits on a tile here, so a move onto a unit resolves its effects at once and then lands on an empty
    // tile around it.
    const over: any = p.effects?.find((e: any) => e.type === 'modifyMove' && (e.moveOverUnits === 'any' || e.moveOverUnits === 'enemy'));
    if (over) {
      const dmg: any = (over.onMoveOntoUnit || []).find((e: any) => e.type === 'damage' && e.target === 'otherUnitOnTile');
      return {
        key: p.id || p.name,
        name: p.name,
        damage: typeof dmg?.amount === 'number' ? dmg.amount : 0,
        damageEnemiesOnly: Boolean(dmg?.ifOtherIsEnemy) || over.moveOverUnits === 'enemy',
        throughUnits: true,
        everyMove: true,
        anyUnit: over.moveOverUnits === 'any',
        onMoveOntoUnit: over.onMoveOntoUnit || [],
        carriesUnit: Boolean(over.carriesUnitOnTile)
      };
    }
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

/**
 * The non-damage parts of a move-over passive's onMoveOntoUnit effects, for `mover` sharing a tile with `other`:
 *   { type: 'armour', target: 'self', upTo }                              (e.g. Haunting Clank)
 *   { type: 'loot', amount }                                              (e.g. Pirate's Curse: loot once it moves off)
 *   { type: 'denyTurnSelection', target: 'otherUnitOnTile', if: 'target.tookLastTurn' }  (e.g. Haunting Cacophony)
 *   { type: 'reduceDamageStatus', amount, from: 'attack' }                (e.g. Ethereal Guard: 2 less from attacks until
 *                                                                          the end of the opponent's next turn)
 */
export function applyMoveOntoUnit(
  mover: BattlefieldUnit,
  other: BattlefieldUnit,
  effects: any[] | undefined,
  lastTurnUnitIds: Record<PlayerId, string | null>,
  passiveName: string,
  turnDeniedStatus: string
): { mover: BattlefieldUnit; other: BattlefieldUnit; loot: number; notes: string[] } {
  let m = mover;
  let o = other;
  let loot = 0;
  const notes: string[] = [];
  for (const e of effects || []) {
    if (e.type === 'armour' && e.target === 'self' && typeof e.upTo === 'number') {
      if (m.armour < e.upTo) {
        m = { ...m, armour: e.upTo };
        notes.push(`armoured up to ${e.upTo}`);
      }
    } else if (e.type === 'loot' && typeof e.amount === 'number') {
      loot += e.amount;
    } else if (e.type === 'denyTurnSelection' && e.target === 'otherUnitOnTile') {
      if (e.if === 'target.tookLastTurn' && lastTurnUnitIds[o.owner] !== o.instanceId) continue;
      if (!(o.statuses || []).includes(turnDeniedStatus)) {
        o = { ...o, statuses: [...(o.statuses || []), turnDeniedStatus] };
        notes.push(`${o.card.name} can't be chosen to take its controller's next turn`);
      }
    } else if (e.type === 'reduceDamageStatus' && typeof e.amount === 'number') {
      m = { ...m, attackDamageReduction: { amount: e.amount, sourceName: passiveName, setOnTurnOf: m.owner } };
      notes.push(`takes ${e.amount} less damage from attacks until the end of the opponent's next turn`);
    }
  }
  return { mover: m, other: o, loot, notes };
}

/**
 * "While moving, this unit may choose a tile occupied by an enemy unit. If it does, apply knockback 1 to the unit on
 * that tile. Then, if it is empty, armour up to 4 and move this unit to the tile" (e.g. Trampling Path):
 * { type: 'tramplingMove', knockback, armourUpTo }.
 */
export function getTramplingMove(unit: BattlefieldUnit | null | undefined): { name: string; knockback: number; armourUpTo: number } | null {
  if (!unit) return null;
  for (const p of getUnitPassives(unit)) {
    const e: any = (p.effects || []).find((x: any) => x.type === 'tramplingMove');
    if (e) return { name: p.name, knockback: typeof e.knockback === 'number' ? e.knockback : 1, armourUpTo: typeof e.armourUpTo === 'number' ? e.armourUpTo : 0 };
  }
  return null;
}

/**
 * "The first time this unit moves each turn, it does not take damage from scorched tiles, and it may move an additional
 * N tiles for free" (e.g. Burning Trail): { trigger: 'self.firstMoveOnOwnTurn', effects: [{ type:
 * 'firstMoveScorchImmunity' }, { type: 'move', target: 'self', extraTiles: N, direction: 'any', free: true }] }.
 */
export function getFirstMoveBonus(unit: BattlefieldUnit | null | undefined): { name: string; scorchImmune: boolean; extraTiles: number } | null {
  if (!unit) return null;
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.firstMoveOnOwnTurn') continue;
    const fx: any[] = p.effects || [];
    const extra = fx.find((e) => e.type === 'move' && e.target === 'self' && typeof e.extraTiles === 'number');
    return { name: p.name, scorchImmune: fx.some((e) => e.type === 'firstMoveScorchImmunity'), extraTiles: extra ? extra.extraTiles : 0 };
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
 * Returns the scorch effect a unit leaves on the tile it just exited for this move, if any. Read from
 * { type: 'scorchTile', tile: 'lastTileLeft' } with onMoveNumbers: [..] (only on those moves of the turn) or
 * if: 'self.tilesMovedThisTurn>=N' (Elemental Wake: once it has moved 2 or more tiles this turn, counting this move as
 * at least 1 tile).
 */
export function getMoveScorchEffect(
  unit: BattlefieldUnit | null | undefined,
  moveNumber: number
): { damage: number; duration?: string; passiveName: string } | null {
  if (!unit) return null;
  const tilesAfterMove = Math.max(moveNumber, (unit.tilesMovedThisTurn || 0) + 1);
  const tilesConditionHolds = (cond: unknown) => {
    const m = typeof cond === 'string' ? cond.match(/^self\.tilesMovedThisTurn>=(\d+)$/) : null;
    return !m || tilesAfterMove >= parseInt(m[1], 10);
  };
  for (const p of getUnitPassives(unit)) {
    const eff: any = p.effects?.find(
      (e: any) =>
        e.type === 'scorchTile' &&
        e.tile === 'lastTileLeft' &&
        (!Array.isArray(e.onMoveNumbers) || e.onMoveNumbers.includes(moveNumber)) &&
        tilesConditionHolds(e.if)
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