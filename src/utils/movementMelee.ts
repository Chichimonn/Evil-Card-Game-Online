import { CardAbility } from '../types/card';

/**
 * "Damage an ability deals as part of its user's own movement or placement is also a melee attack" (the rules, Melee
 * attack): an ability that moves or places its user and then deals damage (e.g. Sidestepping Crush, Spitfire Landing,
 * Lightning Joust, Super Jump), or deals damage to the units its user moves over (e.g. Mounted Charge). Not one that moves
 * or places the target (e.g. Grappling Hook, Boarding Hook), nor one whose user moves only after it has dealt its damage
 * (e.g. Umbral Flail), unless it's tagged Melee anyway. Nor one tagged Ranged (e.g. Spitfire Landing, Ash Cloud Dive):
 * its damage is a ranged attack.
 */
export function dealsDamageAsPartOfOwnMovement(ability: CardAbility | null | undefined): boolean {
  if (ability?.tags?.includes('ranged')) return false;
  const effects = ((ability?.effects || []) as any[]);
  // Damage to the units moved over or through
  if (
    effects.some(
      (e) =>
        e.type === 'move' &&
        (typeof e.damageToUnitsMovedOver === 'number' ||
          typeof e.damageToEnemiesMovedOver === 'number' ||
          typeof e.damageToEnemiesMovedThrough === 'number')
    )
  ) {
    return true;
  }
  // The user's own move or placement, then damage to another unit
  const ownMove = effects.findIndex(
    (e) =>
      (e.type === 'move' || e.type === 'place') &&
      (e.target === 'self' || e.target === undefined) &&
      (e.unit === undefined || e.unit === 'self')
  );
  if (ownMove < 0) return false;
  return effects.slice(ownMove + 1).some((e) => e.type === 'damage' && e.target !== 'self');
}
