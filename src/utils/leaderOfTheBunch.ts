import { BattlefieldUnit, PlayerId } from '../types/game';
import { CardItem, CardPassive } from '../types/card';
import { getHexDistance } from './hexGridMath';
import { getUnitPassives } from './unitPassives';

/**
 * Checks if a passive is Leader of the Bunch.
 */
export function isLeaderOfTheBunchPassive(passive: CardPassive | null | undefined): boolean {
  if (!passive) return false;
  const id = passive.id?.toLowerCase() || '';
  const name = passive.name?.toLowerCase() || '';
  if (id === 'leader_of_the_bunch' || name === 'leader of the bunch') {
    return true;
  }
  return Boolean(
    passive.effects?.some(
      (e: any) =>
        e.type === 'modifyHP' &&
        (e.amount?.perFriendlyUnitSurroundingSelf !== undefined || e.target === 'self')
    )
  );
}

/**
 * Checks if a unit has the Leader of the Bunch passive.
 */
export function hasLeaderOfTheBunch(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some(isLeaderOfTheBunchPassive);
}

/**
 * Counts friendly units (excluding walls and self) surrounding the given hex at distance 1.
 */
export function getSurroundingFriendlyCount(
  unitHex: string,
  unitOwner: PlayerId,
  board: Record<string, BattlefieldUnit>,
  unitInstanceId?: string
): number {
  let count = 0;
  for (const [hex, other] of Object.entries(board)) {
    if (!other) continue;
    if (hex === unitHex) continue;
    if (unitInstanceId && other.instanceId === unitInstanceId) continue;
    if (other.owner !== unitOwner) continue;
    if (other.card.isWall) continue; // Walls are obstacles, not friendly units
    if (getHexDistance(unitHex, hex) === 1) {
      count++;
    }
  }
  return count;
}

/**
 * Gets the current bonus HP granted by Leader of the Bunch to the unit.
 */
export function getLeaderOfTheBunchBonusHp(
  unit: BattlefieldUnit | null | undefined,
  board: Record<string, BattlefieldUnit>
): number {
  if (!unit || !hasLeaderOfTheBunch(unit)) return 0;
  return getSurroundingFriendlyCount(unit.hexId, unit.owner, board, unit.instanceId);
}

export interface SyncLeaderResult {
  updatedBoard: Record<string, BattlefieldUnit>;
  logMessages: string[];
  defeatedUnits: BattlefieldUnit[];
  hasChanges: boolean;
}

/**
 * Dynamically checks the number of friendly units surrounding each unit with
 * the Leader of the Bunch passive, updating its HP by +1 per surrounding friendly unit.
 * If units move away, the HP goes back down.
 */
export function syncLeaderOfTheBunch(
  board: Record<string, BattlefieldUnit>,
  cardsDataList?: CardItem[]
): SyncLeaderResult {
  const updatedBoard: Record<string, BattlefieldUnit> = { ...board };
  const logMessages: string[] = [];
  const defeatedUnits: BattlefieldUnit[] = [];
  let hasChanges = false;

  for (const [hexId, unit] of Object.entries(board)) {
    if (!unit || !hasLeaderOfTheBunch(unit)) continue;

    // Determine the unit's base HP before any dynamic aura bonuses
    const originalCard = cardsDataList?.find((c) => c.id === unit.card.id);
    const baseHp = unit.baseMaxHp ?? originalCard?.hp ?? unit.card.hp;

    // Count friendly units on adjacent tiles (distance 1)
    const surroundingFriendlyCount = getSurroundingFriendlyCount(
      hexId,
      unit.owner,
      board,
      unit.instanceId
    );

    const targetMaxHp = baseHp + surroundingFriendlyCount;
    const currentMaxHp = unit.card.hp;

    if (currentMaxHp !== targetMaxHp || unit.baseMaxHp !== baseHp) {
      hasChanges = true;
      const diff = targetMaxHp - currentMaxHp;

      if (diff > 0) {
        logMessages.push(
          `👑 ${unit.card.name}'s Leader of the Bunch: +${diff} HP (now ${targetMaxHp} max HP) with ${surroundingFriendlyCount} surrounding friendly unit${surroundingFriendlyCount === 1 ? '' : 's'}!`
        );
      } else if (diff < 0) {
        logMessages.push(
          `👑 ${unit.card.name}'s Leader of the Bunch: lost ${Math.abs(diff)} HP (now ${targetMaxHp} max HP) with ${surroundingFriendlyCount} surrounding friendly unit${surroundingFriendlyCount === 1 ? '' : 's'}.`
        );
      }

      const updatedUnit: BattlefieldUnit = {
        ...unit,
        baseMaxHp: baseHp,
        card: {
          ...unit.card,
          hp: targetMaxHp
        }
      };

      updatedBoard[hexId] = updatedUnit;

      // Check if loss of bonus HP causes damage counters to exceed or equal new max HP
      if (updatedUnit.damageCounters >= targetMaxHp) {
        defeatedUnits.push(updatedUnit);
      }
    }
  }

  return {
    updatedBoard,
    logMessages,
    defeatedUnits,
    hasChanges
  };
}
