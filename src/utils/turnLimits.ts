import { CardAbility, CardPassive } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import { isPromotedAbilityProvider } from './promotedAbilities';
import { isAttackAbility } from './providerChain';
import { getBarredMinCost, getBarredExactCosts, CANNOT_USE_RANGED } from './turnRestrictions';
import { getSurroundingHexes } from './hexGridMath';
import { getUnitPassives } from './unitPassives';

/**
 * Checks if an ability or passive is flagged 1/Turn.
 * Looks at limits.oncePerTurn, limits.maxPerTurn === 1, and text descriptions.
 */
export function isOncePerTurn(item?: {
  id?: string;
  name?: string;
  limits?: { oncePerTurn?: boolean; maxPerTurn?: number; firstTimeEachTurn?: boolean; [key: string]: unknown };
  text?: string;
  tags?: string[];
  effects?: any[];
}): boolean {
  if (!item) return false;
  if (item.limits?.oncePerTurn === true) return true;
  if (item.limits?.maxPerTurn === 1) return true;
  if (item.limits?.firstTimeEachTurn === true) return true;

  if (item.effects && Array.isArray(item.effects)) {
    if (
      item.effects.some(
        (e: any) =>
          e.limits?.oncePerTurn === true ||
          e.limits?.maxPerTurn === 1 ||
          e.limits?.firstTimeEachTurn === true
      )
    ) {
      return true;
    }
  }

  if (item.tags && Array.isArray(item.tags)) {
    if (
      item.tags.some(
        (t) =>
          t.toLowerCase() === '1/turn' ||
          t.toLowerCase() === 'onceperturn' ||
          t.toLowerCase().includes('once per turn')
      )
    ) {
      return true;
    }
  }

  if (item.text) {
    const textLower = item.text.toLowerCase();
    if (
      textLower.includes('once per turn') ||
      textLower.includes('use only once per turn') ||
      textLower.includes('use only once each turn') ||
      textLower.includes('once each turn') ||
      textLower.includes('1/turn') ||
      textLower.includes('1 / turn') ||
      textLower.includes('the first time each turn') ||
      textLower.includes('first time each turn') ||
      textLower.includes('first time this unit') ||
      textLower.includes('only happen once per turn') ||
      textLower.includes("only happen once on each player's turn") ||
      textLower.includes('may only move once per turn')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Gets the number of times an ability/passive key has been used this turn.
 */
export function getTurnUsageCount(unit: BattlefieldUnit | null | undefined, key: string): number {
  if (!unit || !unit.usedTurnCounts) return 0;
  return unit.usedTurnCounts[key] || 0;
}

/**
 * Counts how many abilities the unit has used this turn (universal Move/Draw are not abilities).
 * Each use is recorded once under its id and once under its name (recordAbilityUse). The name is read first because
 * a cost variant (e.g. gemstone_hammer__cost_2) also records its base id; the id is the fallback.
 * Using a promoted card's ability for free through a provider is one ability use: only the provider counts.
 */
export function getAbilitiesUsedThisTurn(unit: BattlefieldUnit | null | undefined): number {
  if (!unit || !unit.usedTurnCounts) return 0;
  const counts = unit.usedTurnCounts;
  const abilities = [...(unit.card.abilities || []), ...(unit.grantedAbilities || [])];
  const seen = new Set<string>();
  let total = 0;
  abilities.forEach((ab) => {
    const key = ab.baseAbilityId || ab.id || ab.name;
    if (seen.has(key)) return;
    seen.add(key);
    const byName = ab.name ? counts[ab.name] || 0 : 0;
    const byId = ab.id ? counts[ab.id] || 0 : 0;
    total += byName > 0 ? byName : byId;
  });
  return total;
}

/**
 * Counts how many attacks the unit has made this turn (e.g. Twinsoul: "Every second attack this unit uses each turn").
 * Its own attacks count once each. A free attack used through a provider (Dual Casting, Pilfer, Gemstone Hammer, ...)
 * counts once per use instead of the provider, so a provider that makes two attacks counts as two.
 * As with abilities, a use is read from its name when recorded and from its id otherwise.
 */
export function getAttacksUsedThisTurn(unit: BattlefieldUnit | null | undefined): number {
  if (!unit || !unit.usedTurnCounts) return 0;
  const counts = unit.usedTurnCounts;
  const own = [...(unit.card.abilities || []), ...(unit.grantedAbilities || [])];
  const promotedAbilities = (unit.promotedCards || []).flatMap((c) => c.abilities || []);
  const seen = new Set<string>();
  let total = 0;
  own.forEach((ab) => {
    const baseId = ab.baseAbilityId || ab.id;
    if (seen.has(baseId)) return;
    seen.add(baseId);
    if (isPromotedAbilityProvider(ab)) {
      // Each free attack it was used for
      promotedAbilities.forEach((q) => {
        if (!isAttackAbility(q)) return;
        const byName = counts[`${ab.name} (${q.name})`] || 0;
        const byId = Object.entries(counts)
          .filter(([k]) => k === `${baseId}__${q.id}` || new RegExp(`^${baseId}__cost_\\d+__${q.id}$`).test(k))
          .reduce((s, [, v]) => s + v, 0);
        total += byName > 0 ? byName : byId;
      });
      // Repeats combined into one attack (Gemstone Hammer)
      Object.entries(counts).forEach(([k, v]) => {
        if (new RegExp(`^${baseId}(__cost_\\d+)?__combined$`).test(k)) total += v;
      });
      return;
    }
    if (!isAttackAbility(ab)) return;
    const byName = ab.name ? counts[ab.name] || 0 : 0;
    const byId = counts[baseId] || 0;
    total += byName > 0 ? byName : byId;
  });
  return total;
}

/**
 * Reads an "only as this unit's Nth ability in a turn" restriction from an ability.
 * Uses requires: "thisIsNthAbilityOfTurn:N", falling back to the card text.
 */
/** usedTurnCounts key counting this unit's universal Move actions this turn (free moves from abilities don't count). */
export const UNIVERSAL_MOVE_KEY = 'universal:move';

/** Actions this unit has taken this turn: abilities, universal moves and the universal draw. */
export function getActionsUsedThisTurn(unit: BattlefieldUnit | null | undefined): number {
  if (!unit) return 0;
  return getAbilitiesUsedThisTurn(unit) + (unit.usedTurnCounts?.[UNIVERSAL_MOVE_KEY] || 0) + (unit.usedUniversalDrawThisTurn ? 1 : 0);
}

/** "Use this ability only as this unit's Nth action in a turn" (e.g. Fatal Error!): requires 'thisIsNthActionOfTurn:N'. */
export function getRequiredActionOrdinal(ability: CardAbility | null | undefined): number | null {
  const m = ability?.requires?.match(/thisIsNthActionOfTurn:(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

export function getRequiredAbilityOrdinal(ability: CardAbility | null | undefined): number | null {
  if (!ability) return null;
  const reqMatch = ability.requires?.match(/thisIsNthAbilityOfTurn:(\d+)/i);
  if (reqMatch) return parseInt(reqMatch[1], 10);
  const textMatch = ability.text?.match(/only as this unit's (\d+)(?:st|nd|rd|th) ability/i);
  if (textMatch) return parseInt(textMatch[1], 10);
  return null;
}

/**
 * Checks whether an ability is currently locked for this unit
 * (e.g. Overload Gemstone: "During your next turn, this unit can't use this ability").
 */
export function isAbilityLockedForUnit(
  unit: BattlefieldUnit | null | undefined,
  ability: CardAbility | string
): boolean {
  if (!unit || !unit.lockedAbilities) return false;
  const abilityId = typeof ability === 'string' ? ability : ability.id;
  const parentId = typeof ability === 'string' ? undefined : ability.parentAbilityId;
  const baseId = typeof ability === 'string' ? undefined : ability.baseAbilityId;

  const checkIds = [abilityId, parentId, baseId].filter(Boolean) as string[];
  if (abilityId?.startsWith('overload_gemstone__')) {
    checkIds.push('overload_gemstone');
  }

  for (const id of checkIds) {
    const lock = unit.lockedAbilities[id];
    if (lock && lock.turnsRemaining > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether an ability can be used this turn under 1/Turn restrictions.
 */
export function canUseAbilityThisTurn(
  unit: BattlefieldUnit | null | undefined,
  ability: CardAbility
): { allowed: boolean; reason?: string } {
  if (!unit) return { allowed: false, reason: 'No active unit.' };
  // A readied ability interrupting on the opponent's turn (e.g. Ready Spell) isn't limited by "this turn" rules
  if (ability.readiedReact) return { allowed: true };

  if (isAbilityLockedForUnit(unit, ability)) {
    return {
      allowed: false,
      reason: `${ability.name} cannot be used during this turn (locked via Overload Gemstone).`
    };
  }

  const key = ability.id || ability.name;
  const baseKey = ability.baseAbilityId || (ability.id?.includes('__cost_') ? ability.id.split('__cost_')[0] : null);
  if (isOncePerTurn(ability)) {
    const usage = getTurnUsageCount(unit, key);
    const baseUsage = baseKey ? getTurnUsageCount(unit, baseKey) : 0;
    // A promoted ability's limit is per ability: used for free through any provider counts (see recordAbilityUse)
    const freeUsage = getTurnUsageCount(unit, freeUseKey(ability.promotedAbilityId || ability.id));
    if (usage >= 1 || baseUsage >= 1 || freeUsage >= 1) {
      return {
        allowed: false,
        reason: `${ability.name} is a 1/Turn ability and has already been used this turn.`
      };
    }
  }

  // "Use this ability only if this unit has moved this turn" (e.g. Cloven Crash)
  if (ability.requires === 'self.movedThisTurn' && !unit.movedThisTurn) {
    return { allowed: false, reason: `${ability.name} can only be used if this unit has moved this turn.` };
  }
  // "Use only if this unit has at least N damage on it" (e.g. Vile Ceremony)
  const dmgReq = ability.requires?.match(/^self\.damageAtLeast:(\d+)$/);
  if (dmgReq && unit.damageCounters < parseInt(dmgReq[1], 10)) {
    return { allowed: false, reason: `${ability.name} can only be used with at least ${dmgReq[1]} damage on this unit.` };
  }
  // "Cannot use abilities that cost N or more AP" / "cannot use ranged attacks" until its next turn ends
  // (e.g. Suffocating Draft, Blinding Shield)
  const barredCost = getBarredMinCost(unit);
  if (barredCost !== null && getListedAbilityCost(ability) >= barredCost) {
    return { allowed: false, reason: `${unit.card.name} can't use abilities that cost ${barredCost} or more AP this turn.` };
  }
  if (getBarredExactCosts(unit).includes(getListedAbilityCost(ability))) {
    return { allowed: false, reason: `${unit.card.name} can't use ${getListedAbilityCost(ability)}AP abilities this turn.` };
  }
  // "This cannot be the first action this unit takes in a turn" (e.g. Charged Leap)
  if (ability.requires === 'notFirstActionOfTurn' && getActionsUsedThisTurn(unit) === 0) {
    return { allowed: false, reason: `${ability.name} can't be the first action ${unit.card.name} takes this turn.` };
  }
  // "If this unit has dealt damage this turn" (e.g. Combat Roll)
  if (ability.requires === 'self.dealtDamageThisTurn' && !unit.dealtDamageThisTurn) {
    return { allowed: false, reason: `${ability.name} can only be used after ${unit.card.name} has dealt damage this turn.` };
  }
  if (unit.statuses?.includes(CANNOT_USE_RANGED) && isRangedAttackAbility(ability)) {
    return { allowed: false, reason: `${unit.card.name} can't use ranged attacks this turn.` };
  }

  const requiredOrdinal = getRequiredAbilityOrdinal(ability);
  if (requiredOrdinal !== null) {
    const usedSoFar = getAbilitiesUsedThisTurn(unit);
    if (usedSoFar !== requiredOrdinal - 1) {
      return {
        allowed: false,
        reason: `${ability.name} can only be used as this unit's ability #${requiredOrdinal} this turn (${usedSoFar} abilities used so far).`
      };
    }
  }
  const requiredAction = getRequiredActionOrdinal(ability);
  if (requiredAction !== null) {
    const actionsSoFar = getActionsUsedThisTurn(unit);
    if (actionsSoFar !== requiredAction - 1) {
      return {
        allowed: false,
        reason: `${ability.name} can only be used as this unit's action #${requiredAction} this turn (${actionsSoFar} actions taken so far).`
      };
    }
  }

  // "Use up to N times per turn" (e.g. Triple Fillet, Smash): limits.maxPerTurn above 1
  const maxPerTurn = ability.limits?.maxPerTurn;
  if (typeof maxPerTurn === 'number' && maxPerTurn > 1) {
    const usage = Math.max(getTurnUsageCount(unit, key), baseKey ? getTurnUsageCount(unit, baseKey) : 0);
    if (usage >= maxPerTurn) {
      return { allowed: false, reason: `${ability.name} can only be used ${maxPerTurn} times per turn.` };
    }
  }

  return { allowed: true };
}

/** The lowest AP an ability can be used for (a variable cost lists its options). */
function getListedAbilityCost(ability: CardAbility): number {
  const c: any = ability.selectedCost ?? ability.cost;
  if (Array.isArray(c)) return Math.min(...c);
  return typeof c === 'number' ? c : 0;
}

/** A ranged attack: an ability that deals damage and is tagged ranged, reaches past range 1 without being melee, or fires in a line. */
export function isRangedAttackAbility(ability: CardAbility | null | undefined): boolean {
  if (!ability || !ability.effects?.some((e: any) => e.type === 'damage' && e.target !== 'self')) return false;
  if (ability.tags?.includes('ranged')) return true;
  if (ability.tags?.includes('melee')) return false;
  return ((ability.range?.[1] ?? ability.range?.[0] ?? 1) > 1) || ability.target === 'direction' || Boolean((ability as any).straightLine);
}

/**
 * Limits other units put on this one from where they stand (e.g. Hypnotic Sway: "Enemy units surrounding this unit cannot
 * use abilities that cost 2 or more AP"): { type: 'cannotUseAbilities', target: 'enemyUnitsSurroundingSelf', minCost }.
 */
export function getAuraAbilityBlock(
  unit: BattlefieldUnit | null | undefined,
  ability: CardAbility,
  board: Record<string, BattlefieldUnit>
): string | null {
  if (!unit || ability.readiedReact) return null;
  const hex = Object.keys(board).find((h) => board[h].instanceId === unit.instanceId);
  if (!hex) return null;
  for (const h of getSurroundingHexes(hex)) {
    const n = board[h];
    if (!n || n.owner === unit.owner) continue;
    for (const p of getUnitPassives(n)) {
      const eff: any = (p.effects || []).find(
        (e: any) => e.type === 'cannotUseAbilities' && e.target === 'enemyUnitsSurroundingSelf' && typeof e.minCost === 'number'
      );
      if (eff && getListedAbilityCost(ability) >= eff.minCost) {
        return `${n.card.name}'s ${p.name}: units surrounding it can't use abilities that cost ${eff.minCost} or more AP.`;
      }
    }
  }
  return null;
}

/**
 * Checks whether a passive can trigger this turn under 1/Turn restrictions.
 */
export function canTriggerPassiveThisTurn(
  unit: BattlefieldUnit | null | undefined,
  passive: CardPassive
): boolean {
  if (!unit) return false;
  const key = passive.id || passive.name;
  if (isOncePerTurn(passive)) {
    const usage = getTurnUsageCount(unit, key);
    if (usage >= 1) return false;
  }
  return true;
}

/**
 * Records that an ability or passive was used by the unit, returning the updated unit.
 */
export function recordTurnUsage(unit: BattlefieldUnit, key: string): BattlefieldUnit {
  const currentCounts = unit.usedTurnCounts || {};
  return {
    ...unit,
    usedTurnCounts: {
      ...currentCounts,
      [key]: (currentCounts[key] || 0) + 1
    }
  };
}

/**
 * Whether this unit already attacked the given unit this turn, with any attack (read from usedOnTargets, which every
 * attack records). E.g. Chew Up, Scorching Tempo, Burst Through.
 */
export function hasAttackedUnitThisTurn(unit: BattlefieldUnit | null | undefined, targetInstanceId: string): boolean {
  if (!unit?.usedOnTargets) return false;
  return Object.values(unit.usedOnTargets).some((ids) => ids.includes(targetInstanceId));
}

/** usedTurnCounts key marking a promoted ability as used for free through a provider this turn. */
export const freeUseKey = (promotedAbilityId: string): string => `free:${promotedAbilityId}`;

/**
 * Records one use of an ability in a usedTurnCounts map: once under its id and once under its name.
 * A free ability used through a provider is part of that one use: its executable (id "provider__ability") also
 * records the provider's id through parentAbilityId, and the promoted ability's own id is never recorded.
 */
export function recordAbilityUse(
  counts: Record<string, number>,
  ability: { id?: string; name?: string; parentAbilityId?: string; prepaidByParent?: boolean; promotedAbilityId?: string }
): Record<string, number> {
  const next = { ...counts };
  // A prepaid free ability (Seer's Visions, provider chains) had its provider recorded when the AP was paid
  const parentKey = ability.prepaidByParent ? undefined : ability.parentAbilityId;
  // The promoted ability used for free is marked too (not counted as a use): its own 1/Turn limit spans providers
  const freeKey = ability.promotedAbilityId ? freeUseKey(ability.promotedAbilityId) : undefined;
  const keys = new Set([ability.id, ability.name, parentKey, freeKey].filter(Boolean) as string[]);
  keys.forEach((k) => {
    if (k) next[k] = (next[k] || 0) + 1;
  });
  return next;
}

/**
 * Refreshes all 1/Turn counts and AP to 0/full when a player chooses a unit to take their turn.
 */
export function refreshUnitForTurn(unit: BattlefieldUnit): BattlefieldUnit {
  return {
    ...unit,
    currentAp: unit.card.ap,
    usedUniversalDrawThisTurn: false,
    usedTurnCounts: {}
  };
}
