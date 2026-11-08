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
import { executeSequentialHits, applyAttackerBonusPassives, AttackHit, AttackExecutionOptions, markDamageCapUsed } from './attackLogic';
import { withAttackStatuses } from './statusEffects';
import { DamageEvent, hasFeedingFrenzy, isImmuneToNonDamageEffects } from './unitPassives';
import { getUsableArmour, settleSharedArmour } from './turnRestrictions';
import { isHexScorchedNow } from './boardContext';

// (no target needed: around the caster, or e.g. Superheat's "all enemies on a scorched tile")
const SELF_AREAS = [
  'enemyUnitsSurroundingSelf',
  'allUnitsSurroundingSelf',
  'enemyUnitsOnScorchedTiles',
  // e.g. Explode: "to itself and all surrounding units"
  'selfAndAllUnitsSurroundingSelf',
  // The unit using it (e.g. Deathly Slither: "deal 2 damage to this unit and all surrounding enemy units")
  'self'
];
// Every unit within range N of this unit, or every other one: 'allUnitsWithinRange:2' (e.g. Bass Tremor),
// 'otherUnitsWithinRange:5' (e.g. Death Wail). No target needed.
const RANGE_AREA = /^(all|other)UnitsWithinRange:(\d+)$/;
const isRangeArea = (area: unknown) => typeof area === 'string' && RANGE_AREA.test(area);
// Units around each of your tokens of a kind, e.g. 'unitsSurroundingFriendlyToken:toadstool' (Spray of Spores): no target needed
const TOKEN_AREA_PREFIX = 'unitsSurroundingFriendlyToken:';
const isTokenArea = (area: unknown) => typeof area === 'string' && area.startsWith(TOKEN_AREA_PREFIX);
// ('firstUnitOnPath': the first unit along the drawn path, e.g. Necrotic Breath, Wind Javelins)
// ('firstUnitOnPathCarryOver': the same, but a hit after one that kills moves on to the next unit, e.g. Focused Barrage)
const PATH_AREAS = ['enemyUnitsAlongPath', 'allUnitsOnPath', 'allUnitsInPath', 'firstUnitOnPath', 'firstUnitOnPathCarryOver'];
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
  'allTilesBehindTargetInLine',
  // The units an earlier knockback effect of this ability pushed (e.g. Sludge Wave: "...then deal 3 damage to them")
  'knockedBackUnits',
  // Every tile chosen as a target (e.g. Colossal Hedgehog)
  'targetTiles',
  // The target unit only, as part of an area ability (e.g. Radiant Burst: heal around itself, then damage the target)
  'targetUnit'
];

const getDamageEffects = (ability: CardAbility): any[] =>
  ((ability.effects || []) as any[]).filter((e) => e.type === 'damage');

const healedHexesNote = (amount: number, healedSelf: number, eff: any) =>
  eff.target === 'self' && healedSelf < amount ? `${healedSelf}` : `${amount}`;

/** True if the ability has a damage effect with an area this file knows how to resolve. */
export function isAreaAttack(ability?: CardAbility | null): boolean {
  if (!ability) return false;
  const usesPath = Boolean((ability as any).usesPath);
  return getDamageEffects(ability).some(
    (e) =>
      SUPPORTED_AREAS.includes(e.area) || isTokenArea(e.area) || isRangeArea(e.area) || (usesPath && PATH_AREAS.includes(e.area))
  );
}

/** True if every damage effect is centred on the caster (no target needed, e.g. Whirlwind Execution). */
export function isSelfCentredArea(ability?: CardAbility | null): boolean {
  if (!ability) return false;
  const d = getDamageEffects(ability);
  return d.length > 0 && d.every((e) => SELF_AREAS.includes(e.area) || isTokenArea(e.area) || isRangeArea(e.area));
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
  path?: string[],
  opts?: { knockedHexes?: string[]; targetHexes?: string[]; units?: Record<string, BattlefieldUnit> }
): { hexes: string[]; enemyOnly: boolean } {
  const ranged = area.match(RANGE_AREA);
  if (ranged) {
    const r = parseInt(ranged[2], 10);
    return {
      hexes: Object.keys(opts?.units || {}).filter((h) => {
        const d = getHexDistance(casterHex, h);
        return ranged[1] === 'all' ? d >= 1 && d <= r : d >= 1 && d <= r;
      }),
      enemyOnly: false
    };
  }
  switch (area) {
    case 'self':
      return { hexes: [casterHex], enemyOnly: false };
    case 'firstUnitOnPath': {
      const first = (path ?? []).find((h) => opts?.units?.[h]);
      return { hexes: first ? [first] : [], enemyOnly: false };
    }
    case 'selfAndAllUnitsSurroundingSelf':
      return { hexes: [casterHex, ...getSurroundingHexes(casterHex)], enemyOnly: false };
    case 'enemyUnitsOnScorchedTiles':
      return { hexes: Object.keys(opts?.units || {}).filter((h) => isHexScorchedNow(h, opts?.units)), enemyOnly: true };
    case 'knockedBackUnits':
      return { hexes: opts?.knockedHexes ?? [], enemyOnly: false };
    case 'targetUnit':
      return { hexes: [targetHex], enemyOnly: false };
    case 'targetTiles':
      return { hexes: opts?.targetHexes ?? [targetHex], enemyOnly: false };
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
  scorchHexes: string[]; // tiles to scorch: where a unit was dealt damage by an effect with scorchHitTiles (e.g. Chain-Lantern Combo)
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
  opts?: {
    path?: string[];
    apSpent?: number;
    tilesTravelled?: number; // e.g. Super Jump: "damage equal to twice the number of tiles travelled"
    knockedHexes?: string[]; // where the units an earlier knockback pushed now are (area 'knockedBackUnits')
    targetHexes?: string[]; // every chosen target tile (area 'targetTiles')
    previousUses?: number; // how many times this ability was already used this turn (amount modifiers perPreviousUseThisTurn)
  }
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
  // "Damage equal to this unit's remaining health" (e.g. Explode) is its health when the ability starts
  const casterHpAtStart = units[casterHex].card.hp - units[casterHex].damageCounters;
  let healedTotal = 0; // all damage healed so far by this ability (e.g. Radiant Burst: "equal to the total amount healed")
  let healedSelf = 0; // how much the caster healed earlier in this ability (e.g. Corona Flare's "10 - healed")

  const num = (v: any, fallback: number): number => {
    if (typeof v === 'number') return v;
    if (typeof v?.perAP === 'number') return v.perAP * apSpent;
    if (typeof v?.perRemainingHealth === 'number') return v.perRemainingHealth * casterHpAtStart;
    // "Deals damage ... equal to the damage on this unit" (e.g. Borrowing 100,000 Bones)
    if (typeof v?.perDamageOnSelf === 'number') return v.perDamageOnSelf * (units[casterHex]?.damageCounters || 0);
    if (typeof v?.perTileTravelled === 'number') return v.perTileTravelled * (opts?.tilesTravelled || 0);
    const f = typeof v?.formula === 'string' ? v.formula.match(/^\s*(\d+)\s*-\s*healed\s*$/) : null;
    if (f) return Math.max(0, parseInt(f[1], 10) - healedSelf);
    if (v === 'totalHealed') return healedTotal;
    return fallback;
  };

  const scorchHexes: string[] = [];
  const hitUnit = (hexId: string, effect: any): { defeated: boolean; hitsUsed: number } | void => {
    const u = working[hexId];
    if (!u) return;
    // Units it leaves out (e.g. Death Wail: "that are not Apparitions")
    if (Array.isArray(effect.excludeTokens) && effect.excludeTokens.includes(u.card.id)) return;
    // Feeding Frenzy turns hits on allies into heals, a non-damage effect: an immune ally (Machine Heart) is unaffected
    if (u.owner === owner && hexId !== casterHex && hasFeedingFrenzy(working[casterHex]) && isImmuneToNonDamageEffects(u)) return;
    // "9 damage, minus their range from this unit" (e.g. Death Wail); "1 damage less for each time it was previously
    // used this turn" (e.g. Wind Javelins)
    const falloff = typeof effect.amount?.formula === 'string' ? effect.amount.formula.match(/^\s*(\d+)\s*-\s*range\s*$/) : null;
    const perUse = ((effect.modifiers || []) as any[]).reduce(
      (s, m) => s + (typeof m.addAmount?.perPreviousUseThisTurn === 'number' ? m.addAmount.perPreviousUseThisTurn * (opts?.previousUses || 0) : 0),
      0
    );
    const amount = (falloff ? parseInt(falloff[1], 10) - getHexDistance(casterHex, hexId) : num(effect.amount, 0)) + perUse;
    const count = num(effect.hits, 1);
    if (amount <= 0) return;

    const hits: AttackHit[] = Array.from({ length: count }, (_, i) => ({
      hitIndex: i + 1,
      damage: amount,
      bypassArmour: Boolean(effect.bypassArmour),
      blockWithoutDepleting: effect.armourInteraction === 'blockWithoutDepleting'
    }));
    // "Then hits again for N damage" (e.g. Laser Artillery)
    if (typeof effect.extraHit?.amount === 'number') hits.push({ hitIndex: hits.length + 1, damage: effect.extraHit.amount });

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
    if (effect.scorchHitTiles && dmgDealt > 0) scorchHexes.push(hexId);
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
        ...markDamageCapUsed(u, exec.damageCapKey),
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
    return { defeated: exec.isDefeated, hitsUsed: exec.hitResults.length };
  };

  const knownAreas = (eff: any) =>
    SUPPORTED_AREAS.includes(eff.area) || PATH_AREAS.includes(eff.area) || isTokenArea(eff.area) || isRangeArea(eff.area);

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
      } else if (eff.area === 'firstUnitOnPathCarryOver') {
        // "Each time a hit kills a unit, the next one hits the next unit on the path instead (if there is one)"
        let remaining = num(eff.hits, 1);
        while (remaining > 0) {
          const first = (path ?? []).find((h) => working[h] && h !== casterHex);
          if (!first) break;
          const r = hitUnit(first, { ...eff, hits: remaining });
          if (!r || !r.defeated || r.hitsUsed <= 0) break;
          remaining -= r.hitsUsed;
        }
      } else if (knownAreas(eff)) {
        const { hexes, enemyOnly } = getAreaHexes(eff.area, casterHex, targetHex, path, {
          knockedHexes: opts?.knockedHexes,
          targetHexes: opts?.targetHexes,
          units: working
        });
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
          : a?.perUnitHit
          ? a.perUnitHit * unitsHit
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
        if (!u) return;
        if (h === casterHex) healedSelf += Math.min(amount, u.damageCounters);
        healedTotal += Math.min(amount, u.damageCounters);
        working[h] = { ...u, damageCounters: Math.max(0, u.damageCounters - amount) };
      });
      logMessages.push(`healed ${healedHexesNote(amount, healedSelf, eff)}`);
    } else if (eff.type === 'armour' && eff.target === 'self' && typeof eff.amount === 'number') {
      const u = working[casterHex];
      if (u) working[casterHex] = { ...u, armour: u.armour + eff.amount };
      logMessages.push(`gained ${eff.amount} armour`);
    } else if (eff.type === 'armour' && eff.target === 'self' && typeof eff.upTo === 'number') {
      // "...then armour up to N" (e.g. Total Eclipse, Gelatinous Bounce)
      const u = working[casterHex];
      if (u && u.armour < eff.upTo) working[casterHex] = { ...u, armour: eff.upTo };
      logMessages.push(`armoured up to ${eff.upTo}`);
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

  return {
    updatedUnits: working,
    defeated,
    logMessages,
    damageEvents,
    hitsLanded,
    hitHexes: [...hitHexes].filter((h) => working[h]),
    scorchHexes
  };
}
