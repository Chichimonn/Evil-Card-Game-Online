import { BattlefieldUnit } from '../types/game';
import { CardAbility } from '../types/card';
import { getUnitPassives } from './unitPassives';

/**
 * Returns true if the unit has the Flowing Stance passive.
 * "If this unit has not moved this turn, its melee attacks are treated as having Range 1-2."
 */
export function hasFlowingStancePassive(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some(
    (p) =>
      p.id?.toLowerCase() === 'flowing_stance' ||
      p.name?.toLowerCase().includes('flowing stance') ||
      p.effects?.some(
        (e: any) =>
          e.type === 'modifyRange' &&
          e.appliesTo === 'meleeAttacks' &&
          (e.if === 'self.hasNotMovedThisTurn' || e.if === 'hasNotMovedThisTurn')
      )
  );
}

/**
 * Returns true if Flowing Stance is actively granting Range 1-2 right now
 * (i.e. the unit has the passive and has not yet moved this turn).
 */
export function isFlowingStanceActive(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  return hasFlowingStancePassive(unit) && !unit.movedThisTurn;
}

/**
 * Returns true if the unit has the Cephalopod Reach passive.
 * "This unit's melee attacks have +1 Range."
 */
export function hasCephalopodReach(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some(
    (p) =>
      p.id?.toLowerCase() === 'cephalopod_reach' ||
      p.name?.toLowerCase().includes('cephalopod reach') ||
      p.effects?.some(
        (e: any) =>
          e.type === 'modifyRange' &&
          e.appliesTo === 'meleeAttacks' &&
          !e.if
      )
  );
}

/**
 * Extra range a unit's passives give its ranged attacks (e.g. Fortified Bulwark: "While this unit has 4 or more armour,
 * its ranged attacks gain +1 Range"). Read from { type: 'modifyRange', appliesTo: 'rangedAttacks', addRange, if? } where
 * if may be 'self.armour>=N'.
 */
export function getRangedAttackRangeBonus(unit: BattlefieldUnit | null | undefined): number {
  if (!unit) return 0;
  let bonus = 0;
  getUnitPassives(unit).forEach((p) => {
    (p.effects || []).forEach((e: any) => {
      if (e.type !== 'modifyRange' || e.appliesTo !== 'rangedAttacks') return;
      const add = typeof e.addRange === 'number' ? e.addRange : typeof e.amount === 'number' ? e.amount : 0;
      if (add <= 0) return;
      if (e.if) {
        const m = String(e.if).match(/^self\.armour\s*>=\s*(\d+)$/);
        if (!m || (unit.armour || 0) < parseInt(m[1], 10)) return;
      }
      bonus += add;
    });
  });
  return bonus;
}

/**
 * Checks whether an ability is considered a melee attack.
 */
export function isMeleeAttackAbility(ability: CardAbility | null | undefined): boolean {
  if (!ability) return false;
  if (ability.tags?.includes('melee')) return true;
  if (ability.text?.toLowerCase().includes('melee')) return true;
  return false;
}

/**
 * Calculates the effective range of an ability for an attacker unit,
 * applying Flowing Stance (Range 1-2 for melee if unit hasn't moved),
 * Cephalopod Reach (+1 to melee attack range), and Broaden Search (+bonusRange).
 */
export function getEffectiveAbilityRange(
  ability: CardAbility,
  attackerUnit?: BattlefieldUnit | null
): {
  minRange: number;
  maxRange: number;
  isFlowingStanceApplied: boolean;
  isCephalopodReachApplied: boolean;
} {
  const isMelee = isMeleeAttackAbility(ability);
  let minRange = isMelee ? 1 : 1;
  let maxRange = isMelee ? 1 : 2;

  if (ability.range && ability.range.length > 0) {
    minRange = ability.range[0];
    maxRange = ability.range[1] ?? ability.range[0];
  } else if (ability.rangeText) {
    const match = ability.rangeText.match(/(\d+)(?:\s*-\s*(\d+))?/);
    if (match) {
      minRange = parseInt(match[1], 10);
      maxRange = match[2] ? parseInt(match[2], 10) : minRange;
    }
  } else if (isMelee) {
    minRange = 1;
    maxRange = 1;
  } else {
    minRange = 1;
    maxRange = 2;
  }

  const flowingActive = isMelee && isFlowingStanceActive(attackerUnit);
  if (flowingActive) {
    minRange = 1;
    maxRange = Math.max(maxRange, 2);
  }

  const cephalopodActive = isMelee && hasCephalopodReach(attackerUnit);
  if (cephalopodActive) {
    // Cephalopod Reach grants +1 to the range of melee attack on the unit with the passive, the same way as broaden search would increase range
    maxRange += 1;
  }

  const bonusRange = attackerUnit?.bonusRangeThisTurn || 0;
  if (bonusRange > 0) {
    maxRange += bonusRange;
  }

  // Ranged attack range passives (e.g. Fortified Bulwark at 4+ armour)
  const text = (ability.text || '').toLowerCase();
  const isAttack =
    ability.tags?.includes('ranged') ||
    ability.tags?.includes('attack') ||
    text.includes('deal') ||
    text.includes('damage') ||
    Boolean(ability.effects?.some((e: any) => e.type === 'damage'));
  if (!isMelee && isAttack) {
    maxRange += getRangedAttackRangeBonus(attackerUnit);
  }

  return {
    minRange,
    maxRange,
    isFlowingStanceApplied: flowingActive,
    isCephalopodReachApplied: cephalopodActive
  };
}
