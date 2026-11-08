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
 * Applies the Noxious Burst status (1 less AP if they take the next turn) around the tile where the killer's victim died,
 * read from the killer's passive: { type: 'loseAP', target, if? }.
 *   target 'unitsSurroundingDeathTile': every unit surrounding that tile (friendly or enemy); 'surroundingEnemies': only
 *   the killer's enemies
 *   if 'killedUnit.hadStatus:<status>': only when the killed unit had that status (Blight Phantom: Death Mark)
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
  const none = { updatedBoard: board, affectedUnits: [] as BattlefieldUnit[] };
  if (!killer || !killedUnit || killedUnit.owner === killer.owner) return none;
  let eff: any = null;
  for (const p of getUnitPassives(killer)) {
    eff = (p.effects || []).find(
      (e: any) => e.type === 'loseAP' && (e.target === 'unitsSurroundingDeathTile' || e.target === 'surroundingEnemies')
    );
    if (eff) break;
  }
  if (!eff) return none;
  const statusReq = typeof eff.if === 'string' ? eff.if.match(/^killedUnit\.hadStatus:(\w+)$/) : null;
  if (statusReq) {
    const status = statusReq[1];
    const had = killedUnit.statuses?.includes(status) || (status === 'death_mark' && Boolean(killedUnit.deathMark));
    if (!had) return none;
  }
  const enemiesOnly = eff.target === 'surroundingEnemies';

  const updatedBoard = { ...board };
  const affectedUnits: BattlefieldUnit[] = [];
  for (const sHex of getSurroundingHexes(deathHex)) {
    const neighbor = updatedBoard[sHex];
    if (!neighbor || neighbor.instanceId === killedUnit.instanceId) continue;
    if (enemiesOnly && neighbor.owner === killer.owner) continue;
    if (neighbor.statuses?.includes(NOXIOUS_BURST)) continue;
    updatedBoard[sHex] = { ...neighbor, statuses: [...(neighbor.statuses || []), NOXIOUS_BURST] };
    affectedUnits.push(updatedBoard[sHex]);
  }
  return { updatedBoard, affectedUnits };
}

/**
 * Calculates the starting AP for a unit when it begins its turn,
 * taking into account any Noxious Burst penalty (1 less AP).
 */
export function getStartingApForTurn(
  unit: BattlefieldUnit,
  board?: Record<string, BattlefieldUnit>
): {
  startingAp: number;
  hadNoxiousBurst: boolean;
  windchill?: string;
} {
  const hadNoxiousBurst = hasNoxiousBurstEffect(unit);
  const baseAp = unit.card.ap;
  // "Must spend an additional 1AP to take its first action" (Terrifying Roar, Glacial Bolt): AP left unspent is lost
  // at turn end, so this is the same as starting the turn with 1 less AP
  const actionTax = unit.statuses?.includes('action_tax') ? 1 : 0;
  let startingAp = Math.max(0, baseAp - (hadNoxiousBurst ? 1 : 0) - actionTax);
  // "Whenever an enemy unit begins its turn surrounding this unit, it starts its turn with 1 less AP (to a minimum of 1)"
  // (e.g. Windchill): { type: 'loseAP', target: 'thatUnit', amount, minAP } on a passive with trigger
  // 'enemyUnitStartsTurnSurroundingSelf'
  const windchill = board ? getWindchill(unit, board) : null;
  if (windchill) startingAp = Math.max(Math.min(startingAp, windchill.minAP), startingAp - windchill.amount);
  return { startingAp, hadNoxiousBurst, windchill: windchill?.name };
}

function getWindchill(
  unit: BattlefieldUnit,
  board: Record<string, BattlefieldUnit>
): { amount: number; minAP: number; name: string } | null {
  const hex = Object.keys(board).find((h) => board[h].instanceId === unit.instanceId) || unit.hexId;
  for (const h of getSurroundingHexes(hex)) {
    const n = board[h];
    if (!n || n.owner === unit.owner) continue;
    for (const p of getUnitPassives(n)) {
      if (p.trigger !== 'enemyUnitStartsTurnSurroundingSelf') continue;
      const eff: any = (p.effects || []).find((e: any) => e.type === 'loseAP' && typeof e.amount === 'number');
      if (eff) return { amount: eff.amount, minAP: typeof eff.minAP === 'number' ? eff.minAP : 0, name: p.name };
    }
  }
  return null;
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
