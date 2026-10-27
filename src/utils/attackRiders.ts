import { CardAbility } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import { getUnitPassives } from './unitPassives';

/**
 * Small "after the hit" rules read from card data, shared by the attack paths in App.tsx.
 */

/** "The tile the target is on becomes scorched" on the ability (e.g. Flame Geyser, Flamethrower, Flaming Cutlass's rider). */
export function getTargetTileScorch(ability: CardAbility | null | undefined): { name: string; duration?: string } | null {
  const eff: any = (ability?.effects || []).find((e: any) => e.type === 'scorchTile' && e.tile === 'targetTile');
  return eff ? { name: ability!.name, duration: eff.duration } : null;
}

/** "If this unit attacks the same unit twice in a turn, the tile the target is on becomes scorched" (e.g. Scorching Tempo). */
export function getSecondAttackScorch(unit: BattlefieldUnit | null | undefined): { name: string; duration?: string } | null {
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.attacksSameUnitTwiceInTurn') continue;
    const eff: any = (p.effects || []).find((e: any) => e.type === 'scorchTile');
    if (eff) return { name: p.name, duration: eff.duration };
  }
  return null;
}

/** "When this unit uses a melee attack on the same unit for the second time in a turn, apply knockback N" (e.g. Burst Through). */
export function getSecondMeleeAttackKnockback(unit: BattlefieldUnit | null | undefined): number {
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.meleeAttacksSameUnitTwiceInTurn') continue;
    const eff: any = (p.effects || []).find((e: any) => e.type === 'knockback' && typeof e.distance === 'number');
    if (eff) return eff.distance;
  }
  return 0;
}

/** "When this unit uses a melee attack, it heals N damage per hit (no matter how many units are hit)" (e.g. Draining Touch). */
export function getMeleeAttackHealPerHit(unit: BattlefieldUnit | null | undefined): { perHit: number; name: string } | null {
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.usesMeleeAttack') continue;
    const eff: any = (p.effects || []).find((e: any) => e.type === 'heal' && typeof e.amount?.perAttackHit === 'number');
    if (eff) return { perHit: eff.amount.perAttackHit, name: p.name };
  }
  return null;
}

/**
 * "Whenever this unit deals damage for the first time each turn, it heals up to N damage" (e.g. Burn Fuel).
 * Returns the heal and the passiveTurnMarks key once per turn (null once it already happened this turn).
 */
export function getFirstDamageHeal(
  unit: BattlefieldUnit | null | undefined,
  turnNumber: number
): { amount: number; name: string; markKey: string } | null {
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.dealsDamageFirstTimeEachTurn') continue;
    const eff: any = (p.effects || []).find((e: any) => e.type === 'heal' && typeof e.amount === 'number');
    if (!eff) continue;
    const markKey = p.id || p.name;
    if (unit?.passiveTurnMarks?.[markKey] === turnNumber) return null;
    return { amount: eff.amount, name: p.name, markKey };
  }
  return null;
}

/** "When this unit is hit by a melee attack, the attacker cannot move during your opponent's next turn" (e.g. Trapping Teeth). */
export function getMeleeHitTrap(unit: BattlefieldUnit | null | undefined): string | null {
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.hitByMeleeAttack') continue;
    if ((p.effects || []).some((e: any) => e.type === 'cannotMove' && e.target === 'attacker')) return p.name;
  }
  return null;
}
