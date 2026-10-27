import { CardAbility } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import {
  getSurroundingHexes,
  getHexDistance,
  parseHexId,
  offsetToCube,
  cubeToOffset,
  toHexId
} from './hexGridMath';
import { executeSequentialHits, applyAttackerBonusPassives, AttackHit, AttackExecutionOptions } from './attackLogic';
import { withAttackStatuses } from './statusEffects';
import { DamageEvent, hasFeedingFrenzy, isImmuneToNonDamageEffects } from './unitPassives';
import { getUsableArmour, settleSharedArmour } from './turnRestrictions';

const SELF_AREAS = ['enemyUnitsSurroundingSelf', 'allUnitsSurroundingSelf'];
// Units around each of your tokens of a kind, e.g. 'unitsSurroundingFriendlyToken:toadstool' (Spray of Spores): no target needed
const TOKEN_AREA_PREFIX = 'unitsSurroundingFriendlyToken:';
const isTokenArea = (area: unknown) => typeof area === 'string' && area.startsWith(TOKEN_AREA_PREFIX);
const PATH_AREAS = ['enemyUnitsAlongPath', 'allUnitsOnPath', 'allUnitsInPath'];
const SUPPORTED_AREAS = [
  ...SELF_AREAS,
  'targetTile',
  'surroundingTargetTile',
  'enemyUnitsSurroundingTargetTile',
  'enemyUnitsOnTargetTile',
  'otherEnemyUnitsSurroundingSelf',
  'targetTileAndSurrounding',
  'enemyUnitsOnOrSurroundingTargetTile',
  'threeTilesBeyondTargetInLineFromSelf',
  'allTilesBehindTargetInLine'
];

const getDamageEffects = (ability: CardAbility): any[] =>
  ((ability.effects || []) as any[]).filter((e) => e.type === 'damage');

/** True if the ability has a damage effect with an area this file knows how to resolve. */
export function isAreaAttack(ability?: CardAbility | null): boolean {
  if (!ability) return false;
  const usesPath = Boolean((ability as any).usesPath);
  return getDamageEffects(ability).some(
    (e) => SUPPORTED_AREAS.includes(e.area) || isTokenArea(e.area) || (usesPath && PATH_AREAS.includes(e.area))
  );
}

/** True if every damage effect is centred on the caster (no target needed, e.g. Whirlwind Execution). */
export function isSelfCentredArea(ability?: CardAbility | null): boolean {
  if (!ability) return false;
  const d = getDamageEffects(ability);
  return d.length > 0 && d.every((e) => SELF_AREAS.includes(e.area) || isTokenArea(e.area));
}

/** Tiles in a straight line past `throughHex`, going away from `fromHex`. Empty if not on a straight line. */
function tilesBeyond(fromHex: string, throughHex: string, count: number): string[] {
  const a = parseHexId(fromHex);
  const b = parseHexId(throughHex);
  const dist = getHexDistance(fromHex, throughHex);
  if (!a || !b || dist < 1) return [];
  const ca = offsetToCube(a.col, a.rowIdx);
  const cb = offsetToCube(b.col, b.rowIdx);
  const dq = (cb.q - ca.q) / dist;
  const dr = (cb.r - ca.r) / dist;
  const isWhole = (n: number) => Math.abs(n - Math.round(n)) < 1e-9;
  if (!isWhole(dq) || !isWhole(dr)) return [];
  if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) !== 1) return [];
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const { col, rowNum } = cubeToOffset(cb.q + dq * i, cb.r + dr * i);
    if (col < 0 || col >= 8 || rowNum < 1 || rowNum > 6) break;
    out.push(toHexId(col, rowNum));
  }
  return out;
}

function getAreaHexes(
  area: string,
  casterHex: string,
  targetHex: string,
  path?: string[]
): { hexes: string[]; enemyOnly: boolean } {
  switch (area) {
    case 'targetTile':
      return { hexes: [targetHex], enemyOnly: false };
    case 'surroundingTargetTile':
      return { hexes: getSurroundingHexes(targetHex), enemyOnly: false };
    case 'enemyUnitsSurroundingTargetTile':
      return { hexes: getSurroundingHexes(targetHex), enemyOnly: true };
    case 'enemyUnitsOnTargetTile':
      return { hexes: [targetHex], enemyOnly: true };
    case 'enemyUnitsSurroundingSelf':
      return { hexes: getSurroundingHexes(casterHex), enemyOnly: true };
    case 'allUnitsSurroundingSelf':
      return { hexes: getSurroundingHexes(casterHex), enemyOnly: false };
    case 'otherEnemyUnitsSurroundingSelf':
      return { hexes: getSurroundingHexes(casterHex).filter((h) => h !== targetHex), enemyOnly: true };
    case 'targetTileAndSurrounding':
      return { hexes: [targetHex, ...getSurroundingHexes(targetHex)], enemyOnly: false };
    case 'enemyUnitsOnOrSurroundingTargetTile':
      return { hexes: [targetHex, ...getSurroundingHexes(targetHex)], enemyOnly: true };
    case 'threeTilesBeyondTargetInLineFromSelf':
      return { hexes: tilesBeyond(casterHex, targetHex, 3), enemyOnly: false };
    // e.g. Ley Rupture: every tile behind the target in a straight line from this unit, up to the board edge
    case 'allTilesBehindTargetInLine':
      return { hexes: tilesBeyond(casterHex, targetHex, 8), enemyOnly: false };
    case 'enemyUnitsAlongPath':
      return { hexes: path ?? [], enemyOnly: true };
    case 'allUnitsOnPath':
    case 'allUnitsInPath':
      return { hexes: path ?? [], enemyOnly: false };
    default:
      return { hexes: [], enemyOnly: false };
  }
}

export interface AreaAttackResult {
  updatedUnits: Record<string, BattlefieldUnit>;
  defeated: BattlefieldUnit[];
  logMessages: string[];
  damageEvents: DamageEvent[];
  hitsLanded: number; // hits that landed on units, across every unit hit (for "per hit" effects like Bloodrush)
  hitHexes: string[]; // tiles of the units the area hit that are still on the board (e.g. for area knockback)
}

/**
 * Resolves every effect of an area ability in order, using the card data:
 * damage (with hits, perAP amounts/hits, bypassArmour, blockWithoutDepleting), heal, and flat self armour.
 * Path abilities pass the chosen path and the AP spent in `opts`.
 * Pure: returns the new board and the defeated units; the caller updates state.
 */
export function resolveAreaAttack(
  ability: CardAbility,
  casterHex: string,
  targetHex: string,
  units: Record<string, BattlefieldUnit>,
  owner: PlayerId,
  opts?: { path?: string[]; apSpent?: number }
): AreaAttackResult | null {
  if (!units[casterHex]) return null;

  const apSpent = opts?.apSpent ?? 1;
  const path = opts?.path;
  const working: Record<string, BattlefieldUnit> = { ...units };
  const defeated: BattlefieldUnit[] = [];
  const logMessages: string[] = [];
  const damageEvents: DamageEvent[] = [];
  const enemiesHit = new Set<string>();
  let totalDamage = 0;
  let unitsHit = 0;
  let hitsLanded = 0;
  const hitHexes = new Set<string>();

  const num = (v: any, fallback: number): number =>
    typeof v === 'number' ? v : typeof v?.perAP === 'number' ? v.perAP * apSpent : fallback;

  const hitUnit = (hexId: string, effect: any) => {
    const u = working[hexId];
    if (!u) return;
    // Feeding Frenzy turns hits on allies into heals, a non-damage effect: an immune ally (Machine Heart) is unaffected
    if (u.owner === owner && hexId !== casterHex && hasFeedingFrenzy(working[casterHex]) && isImmuneToNonDamageEffects(u)) return;
    const amount = num(effect.amount, 0);
    const count = num(effect.hits, 1);
    if (amount <= 0) return;

    const hits: AttackHit[] = Array.from({ length: count }, (_, i) => ({
      hitIndex: i + 1,
      damage: amount,
      bypassArmour: Boolean(effect.bypassArmour),
      blockWithoutDepleting: effect.armourInteraction === 'blockWithoutDepleting'
    }));

    const options: AttackExecutionOptions = {
      attacker: working[casterHex],
      target: u,
      ability,
      attackerHex: casterHex,
      targetHex: hexId,
      unitsOnBoard: working
    };

    // The attacker's "its attacks deal more" bonuses (e.g. Twinsoul, Drakescale) apply to area attacks too
    applyAttackerBonusPassives(hits, ability, working[casterHex], u, options);

    // Armour a surrounding friendly unit shares with this one (e.g. Battered Shield) is used after its own
    const usable = effect.bypassArmour || (u.owner === owner && hasFeedingFrenzy(working[casterHex]))
      ? { own: u.armour, total: u.armour, sharerHex: null }
      : getUsableArmour(working, hexId);
    const exec = executeSequentialHits(
      hits,
      usable.total,
      u.damageCounters,
      u.card.hp,
      ability.id,
      options
    );

    const dmgDealt = exec.hitResults.reduce((s, h) => s + h.damage, 0);
    totalDamage += dmgDealt;
    unitsHit += 1;
    hitsLanded += exec.hitResults.length;
    if (!exec.isDefeated && hexId !== casterHex) hitHexes.add(hexId);
    if (u.owner !== owner) enemiesHit.add(u.instanceId);

    const isFeedingFrenzyHealing = u.owner === owner && hasFeedingFrenzy(working[casterHex]);
    if (!isFeedingFrenzyHealing && dmgDealt > 0) {
      damageEvents.push({
        hexId,
        damagedUnitOwner: u.owner,
        damageAmount: dmgDealt
      });
    }

    const settled = settleSharedArmour(working, usable, exec.finalArmour);
    Object.assign(working, settled.units);
    if (exec.isDefeated) {
      delete working[hexId];
      defeated.push(u);
    } else {
      const damaged: BattlefieldUnit = {
        ...u,
        armour: settled.ownArmour,
        damageCounters: exec.finalDamageCounters,
        tookDamageThisTurn: u.tookDamageThisTurn || dmgDealt > 0
      };
      // A unit immune to non-damage effects (Machine Heart) takes no statuses from a hit that dealt it no damage
      const blocksStatuses = hexId !== casterHex && isImmuneToNonDamageEffects(u, dmgDealt > 0);
      working[hexId] = u.owner !== owner && !blocksStatuses
        ? withAttackStatuses(damaged, working[casterHex], exec.hitResults)
        : damaged;
    }
  };

  const knownAreas = (eff: any) =>
    SUPPORTED_AREAS.includes(eff.area) || PATH_AREAS.includes(eff.area) || isTokenArea(eff.area);

  for (const eff of (ability.effects || []) as any[]) {
    if (eff.type === 'damage') {
      if (!eff.area) {
        // Plain single-target part of a mixed ability (e.g. Sweeping Trunk)
        if (!eff.target && targetHex !== casterHex) hitUnit(targetHex, eff);
      } else if (isTokenArea(eff.area)) {
        // Every unit around any of your tokens of that kind, each hit once
        const tokenId = eff.area.slice(TOKEN_AREA_PREFIX.length);
        const around = new Set<string>();
        Object.entries(working).forEach(([h, u]) => {
          if (u.owner === owner && u.card.id === tokenId) getSurroundingHexes(h).forEach((s) => around.add(s));
        });
        around.forEach((h) => {
          if (working[h] && working[h].card.id !== tokenId) hitUnit(h, eff);
        });
      } else if (knownAreas(eff)) {
        const { hexes, enemyOnly } = getAreaHexes(eff.area, casterHex, targetHex, path);
        hexes.forEach((h) => {
          const u = working[h];
          if (!u || (enemyOnly && u.owner === owner)) return;
          hitUnit(h, eff);
        });
      }
    } else if (eff.type === 'heal') {
      const a = eff.amount;
      const amount =
        typeof a === 'number'
          ? a
          : a?.perDamageDealt
          ? a.perDamageDealt * totalDamage
          : a?.perEnemyHit
          ? a.perEnemyHit * enemiesHit.size
          : 0;
      if (amount <= 0) continue;
      const healHexes =
        eff.target === 'selfAndFriendlyUnitsSurroundingSelf'
          ? [casterHex, ...getSurroundingHexes(casterHex).filter((h) => working[h]?.owner === owner)]
          : eff.target === 'self'
          ? [casterHex]
          : [];
      healHexes.forEach((h) => {
        const u = working[h];
        // A heal is a non-damage effect: another unit immune to those (Machine Heart) isn't healed
        if (u && h !== casterHex && isImmuneToNonDamageEffects(u)) return;
        if (u) working[h] = { ...u, damageCounters: Math.max(0, u.damageCounters - amount) };
      });
      logMessages.push(`healed ${amount}`);
    } else if (eff.type === 'armour' && eff.target === 'self' && typeof eff.amount === 'number') {
      const u = working[casterHex];
      if (u) working[casterHex] = { ...u, armour: u.armour + eff.amount };
      logMessages.push(`gained ${eff.amount} armour`);
    }
  }

  logMessages.unshift(
    unitsHit > 0
      ? `Hit ${unitsHit} unit(s) for ${totalDamage} total damage.`
      : 'No units were hit.'
  );
  if (defeated.length > 0) {
    logMessages.push(`Defeated: ${defeated.map((d) => d.card.name).join(', ')}.`);
  }

  return { updatedUnits: working, defeated, logMessages, damageEvents, hitsLanded, hitHexes: [...hitHexes].filter((h) => working[h]) };
}
