import { BattlefieldUnit, PlayerId } from '../types/game';
import { CardAbility } from '../types/card';
import { getSurroundingHexes, getHexDistance, getKnockbackDestination, getHexMovementDirection, parseHexId, offsetToCube, cubeToOffset, toHexId, CUBE_DIRECTIONS } from './hexGridMath';
import { getUnitPassives, DamageEvent, isImmuneToNonDamageEffects } from './unitPassives';
import { reduceNonAttackDamage } from './attackLogic';

/**
 * Passives that react to something happening on the board (a unit taking damage, killing, dying, being knocked back,
 * moving, starting its turn), read from card data. Each reader returns what should happen; dealPassiveDamage resolves
 * the damage on a board. Everything here is pure: App.tsx applies the results to state.
 */

export interface PassiveDamage {
  hex: string;
  amount: number;
  source: string; // passive name, for the log
}

/**
 * Deals non-attack damage from passives (armour first, damage-reducing "any damage" passives apply). Returns the new
 * board, the units it defeated (already removed) and the damage events to pass on to other passives.
 */
export function dealPassiveDamage(
  board: Record<string, BattlefieldUnit>,
  requests: PassiveDamage[]
): { board: Record<string, BattlefieldUnit>; defeated: BattlefieldUnit[]; events: DamageEvent[]; log: string[] } {
  let next = board;
  const defeated: BattlefieldUnit[] = [];
  const events: DamageEvent[] = [];
  const log: string[] = [];
  requests.forEach((r) => {
    const u = next[r.hex];
    if (!u || r.amount <= 0) return;
    const amount = reduceNonAttackDamage(u, r.amount);
    if (amount <= 0) return;
    const absorbed = Math.min(u.armour, amount);
    const counters = u.damageCounters + amount - absorbed;
    next = { ...next };
    if (counters >= u.card.hp) {
      delete next[r.hex];
      defeated.push({ ...u, hexId: r.hex });
    } else {
      next[r.hex] = { ...u, armour: u.armour - absorbed, damageCounters: counters, tookDamageThisTurn: true };
    }
    events.push({ hexId: r.hex, damagedUnitOwner: u.owner, damageAmount: amount, nonAttack: true });
    log.push(`${r.source}: ${amount} damage to ${u.card.name}${counters >= u.card.hp ? ' (defeated!)' : ''}`);
  });
  return { board: next, defeated, events, log };
}

const enemiesAround = (board: Record<string, BattlefieldUnit>, hex: string, owner: PlayerId, exclude: string[] = []) =>
  getSurroundingHexes(hex).filter((h) => board[h] && board[h].owner !== owner && !exclude.includes(h));

const findHex = (board: Record<string, BattlefieldUnit>, instanceId: string) =>
  Object.keys(board).find((h) => board[h].instanceId === instanceId);

/**
 * "Whenever this unit takes damage" reactions of the unit on `hex`:
 *   trigger 'self.takesDamage' (any damage, e.g. Reactive Splatter) or 'self.takesDamageFromAttack' (e.g. Conductive
 *   Sludge, Adaptive Mucus): { type: 'damage', area: 'enemyUnitsSurroundingSelf', amount } and/or
 *   { type: 'armour', target: 'self', upTo }.
 * Damage it deals is non-attack damage, so it doesn't set off more "from an attack" reactions.
 */
export function getDamageTakenReactions(
  unit: BattlefieldUnit,
  hex: string,
  board: Record<string, BattlefieldUnit>,
  fromAttack: boolean
): { damage: PassiveDamage[]; armourUpTo: number; armourSource?: string } {
  const out: { damage: PassiveDamage[]; armourUpTo: number; armourSource?: string } = { damage: [], armourUpTo: 0 };
  getUnitPassives(unit).forEach((p) => {
    if (p.trigger !== 'self.takesDamage' && !(fromAttack && p.trigger === 'self.takesDamageFromAttack')) return;
    (p.effects || []).forEach((e: any) => {
      if (e.type === 'damage' && e.area === 'enemyUnitsSurroundingSelf' && typeof e.amount === 'number') {
        enemiesAround(board, hex, unit.owner).forEach((h) => out.damage.push({ hex: h, amount: e.amount, source: p.name }));
      }
      if (e.type === 'armour' && e.target === 'self' && typeof e.upTo === 'number' && e.upTo > out.armourUpTo) {
        out.armourUpTo = e.upTo;
        out.armourSource = p.name;
      }
    });
  });
  return out;
}

/**
 * "When this unit kills an enemy unit" rewards (trigger 'self.killsEnemyUnit'): { type: 'armour', target: 'self',
 * amount } (e.g. Medal Collection) and { type: 'heal', target: 'friendlyUnitsSurroundingSelf', amount } (e.g. Pride
 * Feast: the units surrounding the killer). Applied to the killer where it now stands.
 */
export function applyKillRewards(
  killer: BattlefieldUnit,
  board: Record<string, BattlefieldUnit>
): { board: Record<string, BattlefieldUnit>; log: string[] } {
  const hex = findHex(board, killer.instanceId);
  if (!hex) return { board, log: [] };
  let next = board;
  const log: string[] = [];
  getUnitPassives(killer).forEach((p) => {
    if (p.trigger !== 'self.killsEnemyUnit') return;
    (p.effects || []).forEach((e: any) => {
      if (e.type === 'armour' && e.target === 'self' && typeof e.amount === 'number') {
        next = { ...next, [hex]: { ...next[hex], armour: next[hex].armour + e.amount } };
        log.push(`${p.name}: ${killer.card.name} gains ${e.amount} armour`);
      }
      // "...it heals up to 3 and armours up to 3" (e.g. Consume Prey)
      if (e.type === 'armour' && e.target === 'self' && typeof e.upTo === 'number' && next[hex].armour < e.upTo) {
        next = { ...next, [hex]: { ...next[hex], armour: e.upTo } };
        log.push(`${p.name}: ${killer.card.name} armours up to ${e.upTo}`);
      }
      if (e.type === 'heal' && e.target === 'self' && typeof e.amount === 'number' && next[hex].damageCounters > 0) {
        next = { ...next, [hex]: { ...next[hex], damageCounters: Math.max(0, next[hex].damageCounters - e.amount) } };
        log.push(`${p.name}: ${killer.card.name} heals ${e.amount}`);
      }
      if (e.type === 'heal' && e.target === 'friendlyUnitsSurroundingSelf' && typeof e.amount === 'number') {
        getSurroundingHexes(hex).forEach((h) => {
          const u = next[h];
          if (!u || u.owner !== killer.owner || isImmuneToNonDamageEffects(u)) return;
          next = { ...next, [h]: { ...u, damageCounters: Math.max(0, u.damageCounters - e.amount) } };
        });
        log.push(`${p.name}: friendly units around ${killer.card.name} heal ${e.amount}`);
      }
    });
  });
  return { board: next, log };
}

/** "When this unit dies, it deals N damage to all surrounding units" (trigger 'self.dies', e.g. Firebird's Death Knell). */
export function getDeathBlast(unit: BattlefieldUnit, hex: string, board: Record<string, BattlefieldUnit>): PassiveDamage[] {
  const out: PassiveDamage[] = [];
  getUnitPassives(unit).forEach((p) => {
    if (p.trigger !== 'self.dies') return;
    (p.effects || []).forEach((e: any) => {
      if (e.type !== 'damage' || e.area !== 'allUnitsSurroundingSelf' || typeof e.amount !== 'number') return;
      getSurroundingHexes(hex).forEach((h) => board[h] && out.push({ hex: h, amount: e.amount, source: p.name }));
    });
  });
  return out;
}

/**
 * Riders on the attacker when it knocks back an enemy (trigger 'self.appliesKnockbackToEnemy'):
 *   { type: 'increaseActionCost', target: 'knockedBackUnit' } (e.g. Heavy Air: its first action next turn costs 1 more),
 *   { type: 'damage', target: 'knockedBackUnit', amount } and
 *   { type: 'scorchTile', tile: 'knockedBackUnitLandingTile' } (e.g. Fanning the Flames).
 */
export function getKnockbackRiders(attacker: BattlefieldUnit | null | undefined): {
  actionTax: boolean;
  damage: number;
  scorchLanding: boolean;
  names: string[];
} {
  const out = { actionTax: false, damage: 0, scorchLanding: false, names: [] as string[] };
  getUnitPassives(attacker).forEach((p) => {
    if (p.trigger !== 'self.appliesKnockbackToEnemy') return;
    out.names.push(p.name);
    (p.effects || []).forEach((e: any) => {
      if (e.type === 'increaseActionCost' && e.target === 'knockedBackUnit') out.actionTax = true;
      if (e.type === 'damage' && e.target === 'knockedBackUnit' && typeof e.amount === 'number') out.damage += e.amount;
      if (e.type === 'scorchTile' && e.tile === 'knockedBackUnitLandingTile') out.scorchLanding = true;
    });
  });
  return out;
}

/**
 * Damage from moving, for a unit that moved from `fromHex` along `path` (the tiles entered, last = where it landed),
 * `tiles` tiles in all:
 *   the mover's own 'self.movesExactlyOneTile' (e.g. Static Discharge) and 'self.movesOnOwnTurn' (e.g. Living Squall:
 *   enemies surrounding the landing tile) damage passives,
 *   enemies' 'enemyMovesOntoTileSurroundingSelf' (e.g. Static Fur: each tile entered next to one of them).
 *   the mover's own 'self.movesInNewDirectionThisTurn' (e.g. Conductive Charge: damage to all surrounding units after
 *   the move, once for each direction it moved in for the first time this turn; newDirections says how many).
 * Pass the board with the mover already on its landing tile.
 */
export function getMoveDamage(
  mover: BattlefieldUnit,
  path: string[],
  board: Record<string, BattlefieldUnit>,
  onOwnTurn: boolean,
  newDirections = 0
): PassiveDamage[] {
  const out: PassiveDamage[] = [];
  const dest = path[path.length - 1];
  if (!dest) return out;
  if (newDirections > 0) {
    getUnitPassives(mover).forEach((p) => {
      if (p.trigger !== 'self.movesInNewDirectionThisTurn') return;
      const eff: any = (p.effects || []).find(
        (e: any) => e.type === 'damage' && e.area === 'allUnitsSurroundingSelf' && typeof e.amount === 'number'
      );
      if (!eff) return;
      for (let i = 0; i < newDirections; i++) {
        getSurroundingHexes(dest).forEach((h) => board[h] && out.push({ hex: h, amount: eff.amount, source: p.name }));
      }
    });
  }
  getUnitPassives(mover).forEach((p) => {
    const fires =
      (p.trigger === 'self.movesExactlyOneTile' && path.length === 1) || (p.trigger === 'self.movesOnOwnTurn' && onOwnTurn);
    if (!fires) return;
    (p.effects || []).forEach((e: any) => {
      if (e.type !== 'damage' || typeof e.amount !== 'number') return;
      if (e.area === 'enemyUnitsSurroundingSelf' || e.area === 'enemyUnitsSurroundingLandingTile') {
        enemiesAround(board, dest, mover.owner).forEach((h) => out.push({ hex: h, amount: e.amount, source: p.name }));
      }
    });
  });
  // Static Fur: once per enemy passive, if any tile entered surrounds it
  Object.entries(board).forEach(([h, u]) => {
    if (u.owner === mover.owner) return;
    getUnitPassives(u).forEach((p) => {
      if (p.trigger !== 'enemyMovesOntoTileSurroundingSelf') return;
      const eff: any = (p.effects || []).find((e: any) => e.type === 'damage' && typeof e.amount === 'number');
      if (eff && path.some((t) => getHexDistance(t, h) === 1)) out.push({ hex: dest, amount: eff.amount, source: p.name });
    });
  });
  return out;
}

/**
 * Splash when the attacker hits an enemy with a melee attack: { type: 'damage', area: 'otherEnemyUnitsSurroundingTarget',
 * amount, if?: 'selfOnTileBehindTarget' } on a passive with trigger 'self.hitsEnemyWithMeleeAttack' (e.g. Conductive
 * Strikes) or a static one with if (e.g. Arcing Ambush: from behind).
 */
export function getMeleeHitSplash(
  attacker: BattlefieldUnit,
  targetHex: string,
  targetOwner: PlayerId,
  isBehind: boolean,
  board: Record<string, BattlefieldUnit>
): PassiveDamage[] {
  const out: PassiveDamage[] = [];
  getUnitPassives(attacker).forEach((p) => {
    (p.effects || []).forEach((e: any) => {
      if (e.type !== 'damage' || e.area !== 'otherEnemyUnitsSurroundingTarget' || typeof e.amount !== 'number') return;
      if (p.trigger !== 'self.hitsEnemyWithMeleeAttack' && p.trigger !== 'static') return;
      if (e.if === 'selfOnTileBehindTarget' && !isBehind) return;
      getSurroundingHexes(targetHex).forEach((h) => {
        const u = board[h];
        if (u && u.owner === targetOwner && u.owner !== attacker.owner) out.push({ hex: h, amount: e.amount, source: p.name });
      });
    });
  });
  return out;
}

/**
 * Damage a unit takes for starting its turn next to another unit: { type: 'damage', target:
 * 'unitsStartingTurnSurroundingSelf', amount } (e.g. Deep Freeze; any unit, friendly or enemy).
 */
export function getTurnStartAdjacencyDamage(
  unit: BattlefieldUnit,
  hex: string,
  board: Record<string, BattlefieldUnit>
): PassiveDamage[] {
  const out: PassiveDamage[] = [];
  getSurroundingHexes(hex).forEach((h) => {
    const n = board[h];
    if (!n || n.instanceId === unit.instanceId) return;
    getUnitPassives(n).forEach((p) => {
      const eff: any = (p.effects || []).find(
        (e: any) => e.type === 'damage' && e.target === 'unitsStartingTurnSurroundingSelf' && typeof e.amount === 'number'
      );
      if (eff) out.push({ hex, amount: eff.amount, source: `${n.card.name}'s ${p.name}` });
    });
  });
  return out;
}

/** Tiles a unit with 'unscorchTiles' around it keeps from being scorched (e.g. Deep Freeze). */
export function getUnscorchedHexes(board: Record<string, BattlefieldUnit>): Set<string> {
  const out = new Set<string>();
  Object.entries(board).forEach(([h, u]) => {
    if (getUnitPassives(u).some((p) => (p.effects || []).some((e: any) => e.type === 'unscorchTiles'))) {
      getSurroundingHexes(h).forEach((s) => out.add(s));
    }
  });
  return out;
}

/**
 * Where a pull moves a unit: `tiles` steps toward `towardHex`, each onto an empty tile closer to it (the first such tile
 * when two are equally close). Stops next to it, or when the way is blocked.
 */
export function getPullDestination(
  towardHex: string,
  unitHex: string,
  tiles: number,
  board: Record<string, BattlefieldUnit>
): string {
  let cur = unitHex;
  for (let i = 0; i < tiles; i++) {
    const d = getHexDistance(cur, towardHex);
    if (d <= 1) break;
    const step = getSurroundingHexes(cur).find((h) => !board[h] && getHexDistance(h, towardHex) === d - 1);
    if (!step) break;
    cur = step;
  }
  return cur;
}

/**
 * "Applies knockback 1 clockwise / counter-clockwise around this unit" (e.g. Clockwise Sweep): each unit on `hexes`
 * (tiles surrounding `centreHex`) moves to the next surrounding tile in that direction. All of them are placed at once:
 * a unit whose new tile is off the board, or held by a unit that isn't moving too, stays where it is (which can in turn
 * stop the unit behind it). Clockwise is as the board is drawn (either player's view is the same board turned 180°,
 * which keeps clockwise clockwise).
 */
export function rotateUnitsAround(
  board: Record<string, BattlefieldUnit>,
  centreHex: string,
  hexes: string[],
  direction: 'clockwise' | 'counterClockwise',
  isImmune: (u: BattlefieldUnit) => boolean
): { board: Record<string, BattlefieldUnit>; moved: { from: string; to: string }[] } {
  const c = parseHexId(centreHex);
  if (!c) return { board, moved: [] };
  const cc = offsetToCube(c.col, c.rowIdx);
  // CUBE_DIRECTIONS runs counter-clockwise on screen (down-right, up-right, up, up-left, down-left, down)
  const ring = CUBE_DIRECTIONS.map((d) => {
    const o = cubeToOffset(cc.q + d.dq, cc.r + d.dr);
    return o.col < 0 || o.col > 7 || o.rowNum < 1 || o.rowNum > 6 ? null : toHexId(o.col, o.rowNum);
  });
  const step = direction === 'clockwise' ? -1 : 1;
  const nextOf = (h: string): string | null => {
    const i = ring.indexOf(h);
    return i < 0 ? null : ring[(i + step + 6) % 6];
  };
  // Start with every eligible unit moving, then stop the blocked ones until nothing changes
  const moving = new Set(hexes.filter((h) => board[h] && ring.includes(h) && !isImmune(board[h])));
  let changed = true;
  while (changed) {
    changed = false;
    for (const h of [...moving]) {
      const to = nextOf(h);
      if (!to || (board[to] && !moving.has(to))) {
        moving.delete(h);
        changed = true;
      }
    }
  }
  if (moving.size === 0) return { board, moved: [] };
  const next = { ...board };
  const moved: { from: string; to: string }[] = [];
  moving.forEach((h) => delete next[h]);
  moving.forEach((h) => {
    const to = nextOf(h) as string;
    next[to] = { ...board[h], hexId: to };
    moved.push({ from: h, to });
  });
  return { board: next, moved };
}

/** Knocks every unit on `hexes` back from `originHex`, nearest first. Returns the board and where each one ended. */
export function knockBackUnits(
  board: Record<string, BattlefieldUnit>,
  originHex: string,
  hexes: string[],
  tiles: number,
  isImmune: (u: BattlefieldUnit) => boolean
): { board: Record<string, BattlefieldUnit>; landed: string[] } {
  let next = board;
  const landed: string[] = [];
  [...hexes]
    .sort((a, b) => getHexDistance(originHex, a) - getHexDistance(originHex, b))
    .forEach((h) => {
      const u = next[h];
      if (!u) return;
      if (isImmune(u)) {
        landed.push(h);
        return;
      }
      const dest = getKnockbackDestination(originHex, h, tiles, next);
      if (dest.tilesMoved > 0 && dest.finalHex !== h) {
        next = { ...next };
        delete next[h];
        next[dest.finalHex] = { ...u, hexId: dest.finalHex };
        landed.push(dest.finalHex);
      } else landed.push(h);
    });
  return { board: next, landed };
}

/**
 * Armour the attacker loses for hitting this unit with a melee attack: "remove up to that much armour from the attacking
 * unit" (trigger 'self.takesDamageFromMeleeAttack', { type: 'removeArmour', target: 'attacker', amount: 'damageTaken' },
 * e.g. Corrosive Sludge).
 */
export function getAttackerArmourStrip(target: BattlefieldUnit, isMelee: boolean, damageTaken: number): { amount: number; name: string } | null {
  if (!isMelee || damageTaken <= 0) return null;
  for (const p of getUnitPassives(target)) {
    if (p.trigger !== 'self.takesDamageFromMeleeAttack') continue;
    const eff: any = (p.effects || []).find((e: any) => e.type === 'removeArmour' && e.target === 'attacker');
    if (eff) return { amount: eff.amount === 'damageTaken' ? damageTaken : Number(eff.amount) || 0, name: p.name };
  }
  return null;
}

/** "Whenever this unit takes damage from a melee attack, apply knockback N to the attacker" (e.g. Bouncy Membrane). */
export function getMeleeTargetedAttackerKnockback(target: BattlefieldUnit): { tiles: number; name: string } | null {
  for (const p of getUnitPassives(target)) {
    if (p.trigger !== 'self.takesDamageFromMeleeAttack') continue;
    const eff: any = (p.effects || []).find((e: any) => e.type === 'knockback' && e.target === 'attacker');
    if (eff && typeof eff.distance === 'number') return { tiles: eff.distance, name: p.name };
  }
  return null;
}

/**
 * A free 1-tile move this unit's passives offer after an attack:
 *   trigger 'self.dealsDamageFirstTimeEachTurn' (e.g. Predator's Rhythm: once per turn, marked with markKey; only when
 *   the attack dealt damage),
 *   trigger 'self.attacksSameUnitTwiceInTurn' (e.g. Blood Moon Frenzy: this is its second attack on the target this turn).
 * earlierAttacksOnTarget: how many attacks this unit made on the target earlier this turn (see usedOnTargets).
 */
export function getAttackFreeMovePassive(
  attacker: BattlefieldUnit,
  dealtDamage: boolean,
  earlierAttacksOnTarget: number,
  turnNumber: number
): { name: string; markKey?: string } | null {
  for (const p of getUnitPassives(attacker)) {
    const hasMove = (p.effects || []).some((e: any) => e.type === 'move' && e.free);
    if (!hasMove) continue;
    const key = p.id || p.name;
    if (p.trigger === 'self.dealsDamageFirstTimeEachTurn' && dealtDamage && attacker.passiveTurnMarks?.[key] !== turnNumber) {
      return { name: p.name, markKey: key };
    }
    if (p.trigger === 'self.attacksSameUnitTwiceInTurn' && earlierAttacksOnTarget === 1) return { name: p.name };
  }
  return null;
}

/** How many times this unit attacked the given unit earlier this turn, with any attack (from usedOnTargets). */
export function countAttacksOnUnitThisTurn(unit: BattlefieldUnit, targetInstanceId: string): number {
  return Object.values(unit.usedOnTargets || {}).reduce((n, ids) => n + ids.filter((id) => id === targetInstanceId).length, 0);
}

/** The ability's own free move after the attack, if its condition holds ({ type: 'move', timing: 'afterAttack', if? }). */
export function getAfterAttackMove(ability: CardAbility | null | undefined): { if?: string } | null {
  const eff: any = (ability?.effects || []).find(
    (e: any) => e.type === 'move' && e.target === 'self' && e.timing === 'afterAttack' && e.free
  );
  return eff ? { if: eff.if } : null;
}

/**
 * The directions of the steps of a move (from fromHex along path) this unit hasn't moved in yet this turn, and its updated
 * log of directions moved this turn. Steps between tiles that aren't next to each other (a place or leap) have none.
 */
export function logMoveDirections(
  mover: BattlefieldUnit,
  fromHex: string | undefined,
  path: string[],
  turnNumber: number
): { newDirections: number; log: { turn: number; dirs: number[] } } {
  const dirs = mover.moveDirectionLog?.turn === turnNumber ? [...mover.moveDirectionLog.dirs] : [];
  let newDirections = 0;
  let prev = fromHex;
  path.forEach((h) => {
    const d = prev ? getHexMovementDirection(prev, h) : null;
    if (d !== null && !dirs.includes(d)) {
      dirs.push(d);
      newDirections++;
    }
    prev = h;
  });
  return { newDirections, log: { turn: turnNumber, dirs } };
}
