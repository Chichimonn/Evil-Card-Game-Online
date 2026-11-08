import { BattlefieldUnit } from '../types/game';
import { isTileScorched } from './hexGridMath';

/**
 * A read-only snapshot of board-wide state that rules deep inside the damage math need but aren't passed (e.g. "units
 * on scorched tiles", "the first ranged attack against this unit each turn"). App.tsx refreshes it on every render.
 */
interface BoardContext {
  scorchedTiles: Record<string, unknown>;
  unitsOnBoard: Record<string, BattlefieldUnit>;
  turnNumber: number;
}

let context: BoardContext = { scorchedTiles: {}, unitsOnBoard: {}, turnNumber: 0 };

export function setBoardContext(next: BoardContext) {
  context = next;
}

export const getCurrentTurnNumber = (): number => context.turnNumber;

export const getCurrentScorchedTiles = (): Record<string, unknown> => context.scorchedTiles;

export const getCurrentUnitsOnBoard = (): Record<string, BattlefieldUnit> => context.unitsOnBoard;

/** Whether a tile is scorched right now (a scorched-tile entry, or next to a Raging Bonfire). */
export function isHexScorchedNow(hexId: string | null | undefined, units?: Record<string, BattlefieldUnit>): boolean {
  if (!hexId) return false;
  return isTileScorched(hexId, units || context.unitsOnBoard, context.scorchedTiles as any);
}
