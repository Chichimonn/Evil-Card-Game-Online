import { CardAbility } from '../types/card';
import { BattlefieldUnit } from '../types/game';

/**
 * Checks if an ability modifies range of target unit's attacks/abilities (e.g. Broaden Search).
 * Card-agnostic check examining id, name, or effects.
 */
export function isModifyRangeAbility(ability: CardAbility | null | undefined): boolean {
  if (!ability) return false;
  const id = ability.id?.toLowerCase() || '';
  const name = ability.name?.toLowerCase() || '';
  if (id === 'broaden_search' || name.includes('broaden search')) return true;
  return Boolean(ability.effects?.some((e: any) => e.type === 'modifyRange'));
}

/**
 * Extracts the range increase amount from an ability definition.
 */
export function getModifyRangeAmount(ability: CardAbility | null | undefined): number {
  if (!ability) return 1;
  const eff = ability.effects?.find((e: any) => e.type === 'modifyRange');
  if (eff && typeof eff.amount === 'number') return eff.amount;
  if (eff && typeof eff.addRange === 'number') return eff.addRange;
  const match = ability.text?.match(/(?:gain|additional|\+)\s*(\d+)\s+range/i);
  if (match && match[1]) return parseInt(match[1], 10);
  return 1;
}

/**
 * Returns the effective bonus range for a unit this turn.
 */
export function getUnitBonusRange(unit: BattlefieldUnit | null | undefined): number {
  if (!unit) return 0;
  return unit.bonusRangeThisTurn || 0;
}
