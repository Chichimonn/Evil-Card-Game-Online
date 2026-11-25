import { BattlefieldUnit } from '../types/game';
import { CardAbility, CardPassive } from '../types/card';
import { getUnitPassives } from './unitPassives';

/** What an attack did, for the attacker's "when this unit deals damage ..." loot passives. */
export interface AttackLootOutcome {
  // It dealt damage (to HP or armour)
  dealtDamage: boolean;
  // It dealt damage to an enemy unit
  damagedEnemy: boolean;
  // It dealt damage to the target's armour
  dealtToArmour: boolean;
  // The attacker took damage to its own armour (e.g. a return hit)
  tookArmourDamage?: boolean;
  // It was a ranged attack
  ranged: boolean;
}

export interface AttackLootPassive {
  passive: CardPassive;
  amount: number;
  // "When you do, you may have this attack deal 4 damage to a different enemy unit within range 1 of this unit" (e.g.
  // Twin Fury): the passive's damage effect with partOfTriggeringAttack
  followUpDamage?: { amount: number; range: number };
}

/**
 * The attacker's loot passives this attack sets off, read from their trigger and loot effect (once-per-turn limits are
 * checked by the caller):
 *   'self.dealsDamageWithAttack'                 it dealt damage (e.g. Short Fuse, Spoils)
 *   'self.dealsDamageToEnemyWithAttack'          it dealt damage to an enemy unit (e.g. Twin Fury)
 *   'self.dealsOrTakesDamageToArmour'            it dealt damage to armour, or took damage to its own (e.g. Iron Clout)
 *   'self.rangedAttackDamagesEnemyOrItsArmour'   a ranged attack damaged an enemy or its armour (e.g. Magnetized Plunder)
 */
export function getAttackerLootPassives(attacker: BattlefieldUnit, outcome: AttackLootOutcome): AttackLootPassive[] {
  const out: AttackLootPassive[] = [];
  getUnitPassives(attacker).forEach((p) => {
    const fires =
      (p.trigger === 'self.dealsDamageWithAttack' && outcome.dealtDamage) ||
      (p.trigger === 'self.dealsDamageToEnemyWithAttack' && outcome.damagedEnemy) ||
      (p.trigger === 'self.dealsOrTakesDamageToArmour' && (outcome.dealtToArmour || Boolean(outcome.tookArmourDamage))) ||
      (p.trigger === 'self.rangedAttackDamagesEnemyOrItsArmour' && outcome.ranged && (outcome.damagedEnemy || outcome.dealtToArmour));
    if (!fires) return;
    const loot: any = ((p.effects || []) as any[]).find((e) => e.type === 'loot' && typeof e.amount === 'number');
    if (!loot) return;
    const follow: any = ((p.effects || []) as any[]).find(
      (e) => e.type === 'damage' && e.partOfTriggeringAttack && typeof e.amount === 'number'
    );
    const range = follow ? parseInt(String(follow.target || '').match(/WithinRange:(\d+)/)?.[1] || '1', 10) : 1;
    out.push({ passive: p, amount: loot.amount, ...(follow ? { followUpDamage: { amount: follow.amount, range } } : {}) });
  });
  return out;
}

/** The passives that loot when this unit takes damage to its armour (e.g. Iron Clout). */
export function getArmourDamagedLootPassives(unit: BattlefieldUnit): CardPassive[] {
  return getUnitPassives(unit).filter(
    (p) =>
      p.trigger === 'self.dealsOrTakesDamageToArmour' &&
      ((p.effects || []) as any[]).some((e) => e.type === 'loot' && typeof e.amount === 'number')
  );
}

/**
 * A provider's own "then, Loot N" after the attack it lets this unit use (e.g. Shrapnel Volley: "Use a 1AP ranged attack
 * from among the promoted cards as this ability for free, then Loot 1"): its loot effect with no condition.
 */
export function getProviderLoot(attacker: BattlefieldUnit, ability: CardAbility | null | undefined): { amount: number; name: string } | null {
  const providerId = ability?.parentAbilityId || (ability?.id?.includes('__') ? ability.id.split('__')[0] : '');
  if (!providerId) return null;
  const provider = [...(attacker.card.abilities || []), ...(attacker.grantedAbilities || [])].find((a) => a.id === providerId);
  if (!provider) return null;
  const loot: any = ((provider.effects || []) as any[]).find((e) => e.type === 'loot' && typeof e.amount === 'number' && !e.if);
  return loot ? { amount: loot.amount, name: provider.name } : null;
}
