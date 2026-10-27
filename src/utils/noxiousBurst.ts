import { BattlefieldUnit } from '../types/game';
import { getSurroundingHexes } from './hexGridMath';
import { getUnitPassives } from './unitPassives';

export const NOXIOUS_BURST = 'noxious_burst';

/**
 * Checks if a unit has the Noxious Burst passive.
 */
export function hasNoxiousBurstPassive(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some(
    (p) =>
      p.id?.toLowerCase() === 'noxious_burst' ||
      p.name?.toLowerCase().includes('noxious burst') ||
      p.effects?.some(
        (e: any) =>
          e.type === 'loseAP' &&
          (e.target === 'unitsSurroundingDeathTile' || e.target === 'surroundingEnemies')
      )
  );
}

/**
 * Checks if a unit currently has the Noxious Burst status effect applied to it.
 */
export function hasNoxiousBurstEffect(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  return Boolean(unit.statuses?.includes(NOXIOUS_BURST));
}

/**
 * Checks if a unit currently has Death Mark applied.
 */
export function hasDeathMark(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  return Boolean(unit.deathMark || unit.statuses?.includes('death_mark'));
}

/**
 * Applies the Noxious Burst status effect to any surrounding enemy units
 * around the tile where an enemy unit was killed by a unit with Noxious Burst,
 * or when an enemy unit marked with Death Mark is slain.
 */
export function applyNoxiousBurst(
  killer: BattlefieldUnit | null | undefined,
  killedUnit: BattlefieldUnit | null | undefined,
  deathHex: string,
  board: Record<string, BattlefieldUnit>
): {
  updatedBoard: Record<string, BattlefieldUnit>;
  affectedUnits: BattlefieldUnit[];
} {
  const killerHasPassive = Boolean(killer && hasNoxiousBurstPassive(killer));
  const killedHadDeathMark = Boolean(
    killedUnit && (killedUnit.statuses?.includes('death_mark') || killedUnit.deathMark)
  );

  if (!killerHasPassive && !killedHadDeathMark) {
    return { updatedBoard: board, affectedUnits: [] };
  }
  if (!killedUnit) {
    return { updatedBoard: board, affectedUnits: [] };
  }

  // Determine killer or caster owner
  const killerOwner = killer?.owner || killedUnit.deathMark?.casterOwner;
  if (killerOwner && killedUnit.owner === killerOwner) {
    return { updatedBoard: board, affectedUnits: [] };
  }

  const surroundingHexes = getSurroundingHexes(deathHex);
  const updatedBoard = { ...board };
  const affectedUnits: BattlefieldUnit[] = [];

  for (const sHex of surroundingHexes) {
    const neighbor = updatedBoard[sHex];
    // Affects enemy units relative to the killer / caster (opponents)
    if (neighbor && (!killerOwner || neighbor.owner !== killerOwner)) {
      if (!neighbor.statuses?.includes(NOXIOUS_BURST)) {
        updatedBoard[sHex] = {
          ...neighbor,
          statuses: [...(neighbor.statuses || []), NOXIOUS_BURST]
        };
        affectedUnits.push(updatedBoard[sHex]);
      }
    }
  }

  return { updatedBoard, affectedUnits };
}

/**
 * Calculates the starting AP for a unit when it begins its turn,
 * taking into account any Noxious Burst penalty (1 less AP).
 */
export function getStartingApForTurn(unit: BattlefieldUnit): {
  startingAp: number;
  hadNoxiousBurst: boolean;
} {
  const hadNoxiousBurst = hasNoxiousBurstEffect(unit);
  const baseAp = unit.card.ap;
  // "Must spend an additional 1AP to take its first action" (Terrifying Roar, Glacial Bolt): AP left unspent is lost
  // at turn end, so this is the same as starting the turn with 1 less AP
  const actionTax = unit.statuses?.includes('action_tax') ? 1 : 0;
  const startingAp = Math.max(0, baseAp - (hadNoxiousBurst ? 1 : 0) - actionTax);
  return { startingAp, hadNoxiousBurst };
}

/**
 * Clears the Noxious Burst status from a unit once it has started / taken its turn.
 */
export function consumeNoxiousBurstStatus(unit: BattlefieldUnit): BattlefieldUnit {
  if (!unit.statuses?.includes(NOXIOUS_BURST)) return unit;
  return {
    ...unit,
    statuses: unit.statuses.filter((s) => s !== NOXIOUS_BURST)
  };
}
