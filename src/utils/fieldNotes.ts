import { CardAbility } from '../types/card';

/**
 * Checks if an ability is the Field Notes ability (or equivalent),
 * which reveals the top card of either player's deck and optionally puts it on the bottom.
 * Keeps the check card-agnostic by inspecting ID, name, or effect structure.
 */
export function isFieldNotesAbility(ability: CardAbility | null | undefined): boolean {
  if (!ability) return false;
  const id = ability.id?.toLowerCase() || '';
  const name = ability.name?.toLowerCase() || '';
  if (id === 'field_notes' || name.includes('field notes')) return true;
  if (
    ability.effects?.some(
      (e: any) =>
        e.type === 'revealTop' &&
        (e.deck === 'eitherPlayer' || e.deck === 'either' || e.deck === 'targetPlayer')
    )
  ) {
    return true;
  }
  return false;
}
