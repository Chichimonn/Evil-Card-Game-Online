import { BattlefieldUnit, PlayerId } from '../types/game';
import { HitExecutionRecord } from './attackLogic';
import { getUnitPassives } from './unitPassives';

export const SLOW_VENOM_DAMAGE = 4;

/**
 * Marks left by the attacker's passives on a unit its attack hit, read from card data:
 * a markUnit passive (e.g. Target Acquired: "Enemy units damaged by this unit take an additional 1 damage per hit
 * from the next attack that hits them this turn") marks a damaged enemy.
 */
function withDamageMark(
  target: BattlefieldUnit,
  attacker: BattlefieldUnit,
  hitResults: HitExecutionRecord[]
): BattlefieldUnit {
  if (target.owner === attacker.owner || !hitResults.some((h) => h.damage > 0)) return target;
  for (const p of getUnitPassives(attacker)) {
    const eff = ((p.effects || []) as any[]).find(
      (e) => e.type === 'markUnit' && typeof e.bonusDamagePerHit === 'number'
    );
    if (eff) return { ...target, damageMark: { bonusPerHit: eff.bonusDamagePerHit, sourceName: p.name } };
  }
  return target;
}

/**
 * Statuses an attack leaves on a unit it hit. Call after an attack resolves.
 * - A damage mark (Target Acquired) is used up by the attack that hit it, then the attacker may mark it again.
 * - Slow Venom (Poisonblade Assassin): a unit damaged by this unit's attacks (not counting damage dealt to armour)
 *   is marked. Does not stack.
 */
export function withAttackStatuses(
  target: BattlefieldUnit,
  attacker: BattlefieldUnit | null | undefined,
  hitResults: HitExecutionRecord[]
): BattlefieldUnit {
  let next = hitResults.length > 0 && target.damageMark ? { ...target, damageMark: undefined } : target;
  if (!attacker) return next;
  next = withDamageMark(next, attacker, hitResults);
  if (!hitResults.some((h) => h.hpDamage > 0)) return next;
  const hasVenom = getUnitPassives(attacker).some(
    (p) => p.id === 'slow_venom' || p.name === 'Slow Venom'
  );
  if (!hasVenom || next.statuses?.includes('slow_venom')) return next;
  return { ...next, statuses: [...(next.statuses || []), 'slow_venom'] };
}

/** "This turn" marks (Target Acquired) lapse when any turn ends. */
export function clearDamageMarks(units: Record<string, BattlefieldUnit>): Record<string, BattlefieldUnit> {
  if (!Object.values(units).some((u) => u.damageMark)) return units;
  const next = { ...units };
  for (const [hex, u] of Object.entries(units)) {
    if (u.damageMark) next[hex] = { ...u, damageMark: undefined };
  }
  return next;
}

/**
 * At the start of a player's turn, each of their units marked with Slow Venom
 * takes 4 damage (armour absorbs first) and the mark is removed.
 */
export function resolveSlowVenom(
  units: Record<string, BattlefieldUnit>,
  player: PlayerId
): {
  updatedUnits: Record<string, BattlefieldUnit>;
  defeated: BattlefieldUnit[];
  logMessages: string[];
} {
  const updatedUnits = { ...units };
  const defeated: BattlefieldUnit[] = [];
  const logMessages: string[] = [];

  for (const [hex, u] of Object.entries(units)) {
    if (u.owner !== player || !u.statuses?.includes('slow_venom')) continue;
    const absorbed = Math.min(u.armour, SLOW_VENOM_DAMAGE);
    const counters = u.damageCounters + (SLOW_VENOM_DAMAGE - absorbed);
    if (counters >= u.card.hp) {
      delete updatedUnits[hex];
      defeated.push(u);
      logMessages.push(`${u.card.name} succumbed to Slow Venom`);
    } else {
      updatedUnits[hex] = {
        ...u,
        armour: u.armour - absorbed,
        damageCounters: counters,
        statuses: u.statuses.filter((s) => s !== 'slow_venom')
      };
      logMessages.push(`${u.card.name} took ${SLOW_VENOM_DAMAGE} Slow Venom damage`);
    }
  }

  return { updatedUnits, defeated, logMessages };
}
