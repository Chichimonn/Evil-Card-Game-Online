import { BattlefieldUnit } from '../types/game';
import { getSurroundingHexes } from './hexGridMath';
import { getUnitPassives } from './unitPassives';

interface DestroyBlast {
  amount: number;
  name: string;
  // The blast is this unit's own damage: a unit it destroys sets it off again (Rigged to Blow), or it doesn't
  chains: boolean;
}

const destroysEnemyOrWall = (killer: BattlefieldUnit, killed: BattlefieldUnit) =>
  killed.owner !== killer.owner || Boolean(killed.card.isWall) || killed.card.id === 'obstructing_wall';

/**
 * The killer's blast around a unit it destroyed, read from card data ({ type: 'damage', area:
 * 'unitsSurroundingDestroyedTile' } on a passive with one of these triggers):
 *   'self.destroysEnemyUnitOrObstructingWall'  any kill of an enemy unit or Obstructing Wall (e.g. Rigged to Blow)
 *   'self.killsUnitWithRangedAttack'           any other unit killed by this unit's ranged attack (e.g. Spore Burst)
 */
function getDestroyBlast(
  killer: BattlefieldUnit | null | undefined,
  killed: BattlefieldUnit,
  ranged: boolean
): DestroyBlast | null {
  if (!killer) return null;
  for (const p of getUnitPassives(killer)) {
    const eff = ((p.effects || []) as any[]).find(
      (e) => e.type === 'damage' && e.area === 'unitsSurroundingDestroyedTile' && typeof e.amount === 'number'
    );
    if (!eff) continue;
    if (p.trigger === 'self.destroysEnemyUnitOrObstructingWall' && destroysEnemyOrWall(killer, killed)) {
      return { amount: eff.amount, name: p.name, chains: true };
    }
    if (p.trigger === 'self.killsUnitWithRangedAttack' && ranged && killed.instanceId !== killer.instanceId) {
      return { amount: eff.amount, name: p.name, chains: false };
    }
  }
  return null;
}

/**
 * Resolves the blast on the board after `killed` was destroyed on `killedHex` by `killer` (opts.ranged: by a ranged
 * attack): every unit surrounding that tile takes the damage (armour first). Pure: returns the new board, the units
 * it defeated and a log line.
 */
export function applyDestroyBlast(
  killer: BattlefieldUnit | null | undefined,
  killed: BattlefieldUnit,
  killedHex: string,
  board: Record<string, BattlefieldUnit>,
  opts?: { ranged?: boolean }
): { updatedBoard: Record<string, BattlefieldUnit>; defeated: BattlefieldUnit[]; log: string | null } {
  const blast = getDestroyBlast(killer, killed, Boolean(opts?.ranged));
  if (!killer || !blast) return { updatedBoard: board, defeated: [], log: null };

  const next = { ...board };
  const defeated: BattlefieldUnit[] = [];
  const hitNames: string[] = [];
  const queue: { unit: BattlefieldUnit; hex: string }[] = [{ unit: killed, hex: killedHex }];
  while (queue.length > 0) {
    const { hex } = queue.shift()!;
    getSurroundingHexes(hex).forEach((h) => {
      const u = next[h];
      if (!u) return;
      const absorbed = Math.min(u.armour, blast.amount);
      const counters = u.damageCounters + blast.amount - absorbed;
      hitNames.push(u.card.name);
      if (counters >= u.card.hp) {
        delete next[h];
        defeated.push(u);
        if (blast.chains && u.instanceId !== killer.instanceId && destroysEnemyOrWall(killer, u)) queue.push({ unit: u, hex: h });
      } else {
        next[h] = { ...u, armour: u.armour - absorbed, damageCounters: counters, tookDamageThisTurn: true };
      }
    });
  }
  const log =
    hitNames.length > 0
      ? `💥 ${blast.name}: ${blast.amount} damage to ${hitNames.join(', ')}${
          defeated.length > 0 ? ` (destroyed: ${defeated.map((d) => d.card.name).join(', ')})` : ''
        }`
      : null;
  return { updatedBoard: next, defeated, log };
}
