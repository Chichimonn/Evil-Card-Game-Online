import { BattlefieldUnit } from '../types/game';
import { getSurroundingHexes } from './hexGridMath';
import { getUnitPassives, DamageEvent } from './unitPassives';

/**
 * Earthen Shards (Dravite Mage): for every point of armour this unit would gain beyond 3,
 * it deals 3 damage to surrounding enemy units instead.
 *
 * Data-driven: reads the 'replaceArmourGain' effect on the passive (beyond = 3, with.amount = 3).
 * Run it after the board changes; any armour above the threshold is converted to damage.
 * Pure: returns the new board plus defeated units; the caller updates state.
 */
export function resolveEarthenShards(units: Record<string, BattlefieldUnit>): {
  updatedUnits: Record<string, BattlefieldUnit>;
  defeated: BattlefieldUnit[];
  logMessages: string[];
  damageEvents: DamageEvent[];
  changed: boolean;
} {
  const working: Record<string, BattlefieldUnit> = { ...units };
  const defeated: BattlefieldUnit[] = [];
  const logMessages: string[] = [];
  const damageEvents: DamageEvent[] = [];

  for (const hex of Object.keys(units)) {
    const unit = working[hex];
    if (!unit) continue; // already defeated by another unit's shards

    let beyond = 0;
    let perPoint = 0;
    let found = false;
    for (const p of getUnitPassives(unit)) {
      for (const e of ((p.effects || []) as any[])) {
        if (e.type === 'replaceArmourGain' && e.with?.type === 'damage') {
          beyond = typeof e.beyond === 'number' ? e.beyond : 3;
          perPoint = typeof e.with.amount === 'number' ? e.with.amount : 3;
          found = true;
        }
      }
    }
    if (!found || unit.armour <= beyond) continue;

    const excess = unit.armour - beyond;
    const damage = excess * perPoint;
    working[hex] = { ...unit, armour: beyond };

    let hitNames: string[] = [];
    for (const nHex of getSurroundingHexes(hex)) {
      const target = working[nHex];
      if (!target || target.owner === unit.owner) continue;
      const absorbed = Math.min(target.armour, damage);
      const counters = target.damageCounters + (damage - absorbed);
      hitNames.push(target.card.name);
      damageEvents.push({
        hexId: nHex,
        damagedUnitOwner: target.owner,
        damageAmount: damage
      });
      if (counters >= target.card.hp) {
        delete working[nHex];
        defeated.push(target);
      } else {
        working[nHex] = { ...target, armour: target.armour - absorbed, damageCounters: counters };
      }
    }

    logMessages.push(
      `${unit.card.name}'s Earthen Shards converted ${excess} excess armour into ${damage} damage to ${
        hitNames.length > 0 ? hitNames.join(', ') : 'no surrounding enemies'
      }.`
    );
  }

  return { updatedUnits: working, defeated, logMessages, damageEvents, changed: logMessages.length > 0 };
}
