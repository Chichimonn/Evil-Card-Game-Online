import { CardAbility, CardItem } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import {
  getHexDistance,
  getSurroundingHexes,
  isTileScorched,
  isAttackFromBehind,
  getTileBehindUnit,
  parseHexId,
  offsetToCube,
  cubeToOffset,
  toHexId,
  getHexMovementDirection
} from './hexGridMath';
import { getUnitPassives, hasFeedingFrenzy } from './unitPassives';
import { getQualifyingPromotedAbilities } from './promotedAbilities';
import { getAttacksUsedThisTurn, getAbilitiesUsedThisTurn, hasAttackedUnitThisTurn } from './turnLimits';
import { getCurrentTurnNumber, getCurrentUnitsOnBoard, isHexScorchedNow, tookLastTurn, getHandSize } from './boardContext';
import { getStartingApForTurn } from './noxiousBurst';
import { dealsDamageAsPartOfOwnMovement } from './movementMelee';

export interface AttackHit {
  hitIndex: number;
  damage: number;
  bypassArmourUpTo?: number;
  bypassArmour?: boolean;
  blockWithoutDepleting?: boolean;
  conditionalNote?: string;
  appliedBonuses?: string[];
  /** "Then, if the target has no armour, this attack hits again" (e.g. Plunge and Twist): checked when this hit comes up, after the earlier hits */
  onlyIfTargetHasNoArmour?: boolean;
  /** "Then, if this attack damaged armour, hits again" (e.g. Phlox Shot): the earlier hits must have taken armour off the target */
  onlyIfArmourDamaged?: boolean;
  /**
   * Bonuses that depend on the target's armour as this hit lands, after the earlier hits (see addPerHitBonus): an armour
   * condition with checkedAt: 'eachHit' (e.g. Hundred-Cut Crescendo: "Each time this attack hits, if the target no
   * longer has any armour, that hit deals an additional 1 damage") and an amount of the target's current armour (e.g.
   * Inscribed Edge: { formula: 'floor(target.armour / 2)' }). Other armour conditions are checked as the attack is
   * made (e.g. Glimmering Arrows: "attacks against armour").
   */
  perHitBonuses?: PerHitBonus[];
}

export interface PerHitBonus {
  key: string;
  name: string;
  amount: number | { formula: string };
  if?: string;
}

/** Conditions and amounts that read the target's armour, so are checked as each hit lands (see perHitBonuses). */
const isArmourCondition = (cond: unknown): boolean => cond === 'target.hasArmour' || cond === 'target.noArmour';
const isArmourFormula = (amount: any): boolean => typeof amount?.formula === 'string' && /target\.armour/.test(amount.formula);

/** Adds a bonus checked when the hit lands (once per key per hit). */
export function addPerHitBonus(hit: AttackHit, bonus: PerHitBonus): void {
  if (hit.perHitBonuses?.some((b) => b.key === bonus.key) || hit.appliedBonuses?.includes(bonus.key)) return;
  hit.perHitBonuses = [...(hit.perHitBonuses || []), bonus];
}

/** A per-hit bonus's damage against the target's armour now (0 when its condition doesn't hold). */
function evalPerHitBonus(bonus: PerHitBonus, currentArmour: number): number {
  if (bonus.if === 'target.hasArmour' && !(currentArmour > 0)) return 0;
  if (bonus.if === 'target.noArmour' && currentArmour > 0) return 0;
  if (typeof bonus.amount === 'number') return bonus.amount;
  const half = bonus.amount.formula.match(/^\s*floor\(\s*target\.armour\s*\/\s*(\d+)\s*\)\s*$/);
  if (half) return Math.floor(currentArmour / parseInt(half[1], 10));
  return 0;
}

export interface AbilityHitStructure {
  isBladefury: boolean;
  isMultiHit: boolean;
  hits: AttackHit[];
  summaryText: string;
  badgeText: string;
}

export interface HitExecutionRecord {
  hitIndex: number;
  damage: number;
  armourAbsorbed: number;
  hpDamage: number;
  targetDefeated: boolean;
  notes?: string;
}

export interface AttackExecutionOptions {
  attacker?: BattlefieldUnit | null;
  target?: BattlefieldUnit | null;
  ability?: CardAbility | null;
  attackerHex?: string | null;
  targetHex?: string | null;
  unitsOnBoard?: Record<string, BattlefieldUnit>;
  scorchedTiles?: Record<string, any> | null;
  /** Armour the attack removed from the target before its damage (e.g. Rip and Tear), when the caller knows it */
  armourRemovedBeforeAttack?: number;
}

/** Whether the target's tile is scorched right now, with whatever board the caller gave (else the current one). */
function isTargetOnScorchedTile(target: BattlefieldUnit | null | undefined, options?: AttackExecutionOptions): boolean {
  const hex = options?.targetHex || target?.hexId;
  if (!hex) return false;
  return options?.unitsOnBoard && options?.scorchedTiles
    ? isTileScorched(hex, options.unitsOnBoard, options.scorchedTiles)
    : isHexScorchedNow(hex, options?.unitsOnBoard);
}

/**
 * Whether an attack's conditional extra hit ({ extraHit: { amount, if } }) happens. With no target (a preview of the
 * ability on its own) the hit is shown as possible. 'target.noArmour' and 'thisAttackDamagedArmour' are checked later, as
 * the hit comes up (see onlyIfTargetHasNoArmour, onlyIfArmourDamaged), so they hold here. A condition this doesn't know
 * never adds the hit.
 */
export function extraHitConditionHolds(
  cond: unknown,
  ability: CardAbility,
  attacker: BattlefieldUnit | null | undefined,
  target: BattlefieldUnit | null | undefined,
  options?: AttackExecutionOptions
): boolean {
  if (cond === undefined || cond === null) return true;
  if (typeof cond !== 'string') return false;
  if (cond === 'thisAbilityNotUsedEarlierThisTurn') {
    return !(attacker?.usedTurnCounts?.[ability.baseAbilityId || ability.id] || 0);
  }
  if (!target) return true;
  if (cond === 'target.noArmour') return true;
  if (cond === 'thisAttackDamagedArmour') return true;
  if (cond === 'noArmourWasRemoved') {
    return typeof options?.armourRemovedBeforeAttack === 'number' ? options.armourRemovedBeforeAttack === 0 : target.armour === 0;
  }
  if (cond === 'target.wasAtFullHpBeforeAttack') return target.damageCounters === 0;
  if (cond === 'target.onScorchedTile') return isTargetOnScorchedTile(target, options);
  if (!attacker) return false;
  if (cond.startsWith('target.')) return targetConditionHolds(cond, attacker, target, options);
  const isBehind = isAttackFromBehind(options?.attackerHex || attacker.hexId, options?.targetHex || target.hexId, target.owner, ability);
  return evalAttackerCondition(cond, attacker, isBehind) ?? false;
}

/**
 * Whether an ability's damage is part of its user's own movement or placement, so a melee attack (e.g. Mounted Charge,
 * Sidestepping Crush, Spitfire Landing): see dealsDamageAsPartOfOwnMovement.
 */
export function dealsDamageThroughOwnMovement(ability: CardAbility | null | undefined): boolean {
  return dealsDamageAsPartOfOwnMovement(ability);
}

/**
 * Conditions about the attacker and the attack being made, read from card data `if` strings (passives and abilities):
 *   'self.hasNotMovedThisTurn', 'self.movedThisTurn', 'selfOnTileBehindTarget',
 *   'self.hpRemainingIsEven' / 'self.hpRemainingIsOdd' (e.g. Shifting Flow),
 *   'attackNumberThisTurn:N' (this is the unit's Nth attack this turn), 'abilityNumberThisTurn:N' (its Nth ability),
 *   and any of these joined with '&&'.
 * The attack being made is not counted yet. Returns null for a condition this doesn't know, so callers keep their own.
 */
export function evalAttackerCondition(cond: string, attacker: BattlefieldUnit, isBehind: boolean): boolean | null {
  if (cond.includes('&&')) {
    const parts = cond.split('&&').map((c) => evalAttackerCondition(c.trim(), attacker, isBehind));
    return parts.some((p) => p === null) ? null : parts.every(Boolean);
  }
  if (cond === 'self.hasNotMovedThisTurn') return !attacker.movedThisTurn;
  if (cond === 'self.movedThisTurn') return Boolean(attacker.movedThisTurn);
  if (cond === 'selfOnTileBehindTarget') return isBehind;
  // "While you have N or more cards in hand" (e.g. Guard the Hoard)
  const hand = cond.match(/^owner\.cardsInHand>=(\d+)$/);
  if (hand) return getHandSize(attacker.owner) >= parseInt(hand[1], 10);
  if (cond === 'self.hasArmour') return attacker.armour > 0;
  // "If this unit is damaged" (e.g. Enrage), "If this unit has already taken damage this turn" (e.g. Adrenaline)
  if (cond === 'self.hasDamage') return attacker.damageCounters > 0;
  if (cond === 'self.tookDamageThisTurn') return Boolean(attacker.tookDamageThisTurn);
  // "If you do" of a passive's optional cost taken this turn (e.g. Synthetic Blades: 'self.optedIn:synthetic_blades')
  const optedIn = cond.match(/^self\.optedIn:(.+)$/);
  if (optedIn) return (attacker.optedInPassivesThisTurn || []).includes(optedIn[1]);
  const hpRemaining = attacker.card.hp - attacker.damageCounters;
  if (cond === 'self.hpRemainingIsEven') return hpRemaining % 2 === 0;
  if (cond === 'self.hpRemainingIsOdd') return hpRemaining % 2 === 1;
  const nthAttack = cond.match(/^attackNumberThisTurn:(\d+)$/);
  if (nthAttack) return getAttacksUsedThisTurn(attacker) + 1 === parseInt(nthAttack[1], 10);
  const nthAbility = cond.match(/^abilityNumberThisTurn:(\d+)$/);
  if (nthAbility) return getAbilitiesUsedThisTurn(attacker) + 1 === parseInt(nthAbility[1], 10);
  return null;
}

/** The tiles strictly between two tiles on a straight line, or null when they aren't on one. */
function getStraightLineTilesBetween(fromHex: string, toHex: string): string[] | null {
  const a = parseHexId(fromHex);
  const b = parseHexId(toHex);
  const dist = getHexDistance(fromHex, toHex);
  if (!a || !b || dist < 1) return null;
  const ca = offsetToCube(a.col, a.rowIdx);
  const cb = offsetToCube(b.col, b.rowIdx);
  const dq = (cb.q - ca.q) / dist;
  const dr = (cb.r - ca.r) / dist;
  if (!Number.isInteger(dq) || !Number.isInteger(dr) || Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) !== 1) return null;
  const out: string[] = [];
  for (let i = 1; i < dist; i++) {
    const { col, rowNum } = cubeToOffset(ca.q + dq * i, ca.r + dr * i);
    out.push(toHexId(col, rowNum));
  }
  return out;
}

/**
 * Conditions on the target of an attack, read from damage modifiers' `if`:
 *   'target.surroundedByOtherFriendlyUnit' (another of the attacker's units surrounds the target, e.g. Coordinated Strike),
 *   'target.apNextTurnIs:1,2' (the AP it would start its next turn with, e.g. Frostbite Fangs),
 *   'target.knockedBackBySelfThisTurn' (e.g. Crescent Blade),
 *   'target.attackedBySelfThisTurn' (this unit already attacked it this turn, e.g. Lock, Lock-On),
 *   'target.firstUnitInStraightLine' (it is in a straight line from this unit with nothing between, e.g. Barrel),
 *   'target.inMeleeRange' (on a tile surrounding this unit, e.g. Stock),
 *   'target.inDirectionLastMoved' (the direction this unit last moved this turn, e.g. Azure-Hot Point).
 */
function targetConditionHolds(
  cond: unknown,
  attacker: BattlefieldUnit | null | undefined,
  target: BattlefieldUnit,
  options?: AttackExecutionOptions
): boolean {
  if (typeof cond !== 'string') return false;
  if (/^target\.hasStatus:/.test(cond)) return Boolean(target.statuses?.includes(cond.split(':')[1]));
  if (cond === 'target.hasArmour') return target.armour > 0;
  if (cond === 'target.noArmour') return target.armour <= 0;
  if (!attacker) return false;
  const units = options?.unitsOnBoard || getCurrentUnitsOnBoard();
  const targetHex = options?.targetHex || target.hexId;
  const attackerHex = options?.attackerHex || attacker.hexId;
  if (cond === 'target.attackedBySelfThisTurn') return hasAttackedUnitThisTurn(attacker, target.instanceId);
  // ...from a tile that was not behind it (e.g. Punchline)
  if (cond === 'target.attackedBySelfThisTurnNotFromBehind') return (attacker.attackedFromFrontIds || []).includes(target.instanceId);
  // "The unit that took the last turn" (e.g. Hunter's Focus)
  if (cond === 'target.tookLastTurn') return tookLastTurn(target);
  // "If a friendly unit is on the tile between this unit and the target" (e.g. Formation Reach)
  if (cond === 'target.friendlyUnitBetween') {
    const between = getStraightLineTilesBetween(attackerHex, targetHex);
    return Boolean(between && between.length === 1 && units[between[0]] && units[between[0]].owner === attacker.owner);
  }
  if (cond === 'target.inMeleeRange') return getHexDistance(attackerHex, targetHex) === 1;
  // "If the target is currently affected by Slow Venom" (e.g. Coup de Grace): 'target.hasStatus:slow_venom'
  const status = cond.match(/^target\.hasStatus:(\w+)$/);
  if (status) return Boolean(target.statuses?.includes(status[1]));
  // The target's armour as the attack is made (e.g. Glimmering Arrows: "attacks against armour")
  if (cond === 'target.hasArmour') return target.armour > 0;
  if (cond === 'target.noArmour') return target.armour <= 0;
  if (cond === 'target.firstUnitInStraightLine') {
    const between = getStraightLineTilesBetween(attackerHex, targetHex);
    return between !== null && between.every((h) => !units[h]);
  }
  if (cond === 'target.inDirectionLastMoved') {
    const moved = attacker.movedDirectionsThisTurn || [];
    return moved.length > 0 && getHexMovementDirection(attackerHex, targetHex) === moved[moved.length - 1];
  }
  if (cond === 'target.surroundedByOtherFriendlyUnit') {
    return getSurroundingHexes(targetHex).some((h) => {
      const u = units[h];
      return Boolean(u && u.owner === attacker.owner && u.instanceId !== attacker.instanceId);
    });
  }
  const ap = cond.match(/^target\.apNextTurnIs:([\d,]+)$/);
  if (ap) return ap[1].split(',').map(Number).includes(getStartingApForTurn(target, units).startingAp);
  if (cond === 'target.knockedBackBySelfThisTurn') {
    return target.knockedBackBy?.instanceId === attacker.instanceId && target.knockedBackBy.turn === getCurrentTurnNumber();
  }
  return false;
}

/**
 * A damage amount written as a formula in card data ({ formula }), e.g. 'self.armour' (Fortified Blows: "damage equal to
 * this unit's armour"), 'armourRemoved' (Telekinetic Rend: "1 damage per point of armour removed this way"),
 * 'lowestPerHitDamage(promotedCard.attacks)' and 'max(1, 7 - firstHitAmount)' (Bladefury), 'floor(target.armour / 2)'.
 * Numbers, + - * /, brackets, max/min/floor and these names. An unknown name is 0.
 */
export function evalDamageFormula(formula: string, vars: Record<string, number>): number {
  const src = formula.replace(/\s+/g, '');
  let i = 0;
  const peek = () => src[i];
  const name = () => {
    const m = src.slice(i).match(/^[A-Za-z_][\w.]*(\([\w.]*\))?/);
    if (!m) return '';
    i += m[0].length;
    return m[0];
  };
  const primary = (): number => {
    if (peek() === '(') { i++; const v = expr(); i++; return v; }
    if (peek() === '-') { i++; return -primary(); }
    const num = src.slice(i).match(/^\d+(\.\d+)?/);
    if (num) { i += num[0].length; return parseFloat(num[0]); }
    const n = name();
    if ((n === 'max' || n === 'min' || n === 'floor' || n === 'ceil') && peek() === '(') {
      i++;
      const args = [expr()];
      while (peek() === ',') { i++; args.push(expr()); }
      i++;
      if (n === 'max') return Math.max(...args);
      if (n === 'min') return Math.min(...args);
      if (n === 'floor') return Math.floor(args[0]);
      return Math.ceil(args[0]);
    }
    return vars[n] ?? 0;
  };
  const term = (): number => {
    let v = primary();
    while (peek() === '*' || peek() === '/') { const op = src[i++]; const r = primary(); v = op === '*' ? v * r : r === 0 ? 0 : v / r; }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') { const op = src[i++]; const r = term(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  return Math.floor(expr());
}

/** A formula amount { formula, plus? } (e.g. Dissolving Spit: { formula: 'armourRemoved', plus: 2 }). */
function evalFormulaAmount(amount: any, vars: Record<string, number>): number {
  return evalDamageFormula(amount.formula, vars) + (typeof amount.plus === 'number' ? amount.plus : 0);
}

/** The names a damage formula can use, for this attack. */
function getFormulaVars(
  ability: CardAbility,
  attacker: BattlefieldUnit | null | undefined,
  target: BattlefieldUnit | null | undefined,
  options?: AttackExecutionOptions
): Record<string, number> {
  const removeEff: any = (ability.effects || []).find((e: any) => e.type === 'removeArmour');
  const removeCap = removeEff ? (removeEff.amount === 'all' ? Infinity : typeof removeEff.amount === 'number' ? removeEff.amount : 0) : 0;
  const armourRemoved =
    typeof options?.armourRemovedBeforeAttack === 'number'
      ? options.armourRemovedBeforeAttack
      : removeEff && target
      ? Math.min(removeCap, target.armour)
      : 0;
  return {
    'self.armour': attacker?.armour ?? 0,
    'target.armour': target?.armour ?? 0,
    armourRemoved,
    'lowestPerHitDamage(promotedCard.attacks)': getLowestPerHitDamageFromPromotedCards(attacker?.promotedCards, 0).lowestDmg
  };
}

/**
 * Whether every hit of this attack on the target bypasses all armour, read from its damage effect: bypassArmour, unless
 * a modifier whose condition holds sets it off (e.g. Coup de Grace: "If the target is currently affected by Slow Venom,
 * this attack deals 10 damage. Otherwise, deals 1 damage, bypassing armour") or a further hit doesn't (e.g. Arcane Surge).
 */
export function attackBypassesAllArmour(ability: CardAbility | null | undefined, target: BattlefieldUnit | null | undefined): boolean {
  const dmgs = ((ability?.effects || []) as any[]).filter((e) => e.type === 'damage' && e.target !== 'self' && e.target !== 'caster');
  if (dmgs.length === 0 || !dmgs.every((e) => e.bypassArmour === true)) return false;
  if (dmgs.some((e) => e.extraHit && e.extraHit.bypassArmour === false)) return false;
  const turnedOff = (dmgs[0].modifiers || []).some(
    (m: any) => m.setBypassArmour === false && target && targetConditionHolds(m.if, null, target)
  );
  return !turnedOff;
}

/** Marks a hit whose attacker bonuses (applyAttackerBonusPassives) were applied. */
const ATTACKER_BONUSES_APPLIED = 'attacker_bonuses';

/**
 * Applies static attacker passives and promoted attack bonuses to attack hits.
 */
export function applyAttackerBonusPassives(
  hits: AttackHit[],
  ability: CardAbility | null | undefined,
  attacker?: BattlefieldUnit | null,
  target?: BattlefieldUnit | null,
  options?: AttackExecutionOptions
): void {
  if (!attacker) return;
  hits.forEach((h) => {
    if (!h.appliedBonuses?.includes(ATTACKER_BONUSES_APPLIED)) h.appliedBonuses = [...(h.appliedBonuses || []), ATTACKER_BONUSES_APPLIED];
  });
  const attackerPassives = getUnitPassives(attacker);
  const isMelee =
    ability?.tags?.includes('melee') ||
    ability?.text?.toLowerCase().includes('melee') ||
    dealsDamageAsPartOfOwnMovement(ability) ||
    false;

  // Behind condition
  const attackerHex = options?.attackerHex || attacker.hexId;
  const targetHex = options?.targetHex || target?.hexId;
  const targetOwner = target?.owner || (attacker.owner === 'player1' ? 'player2' : 'player1');
  const isBehind = isAttackFromBehind(attackerHex, targetHex, targetOwner, ability);

  // Promoted ability providers
  const parentId =
    ability?.parentAbilityId ||
    (ability?.id?.includes('__') ? ability.id.split('__')[0] : '');

  // A mark on the target (e.g. Target Acquired): this attack deals more per hit; withAttackStatuses consumes the mark
  const mark = target?.damageMark;
  if (mark && mark.bonusPerHit > 0) {
    hits.forEach((h) => {
      if (h.appliedBonuses?.includes('damage_mark')) return;
      h.damage += mark.bonusPerHit;
      h.appliedBonuses = [...(h.appliedBonuses || []), 'damage_mark'];
      h.conditionalNote = h.conditionalNote
        ? `${h.conditionalNote}, +${mark.bonusPerHit} ${mark.sourceName}`
        : `+${mark.bonusPerHit} ${mark.sourceName}`;
    });
  }

  // 1-4. A provider's "except it deals an additional N damage on the first hit", read from its useAbility effect's
  // addDamage: { amount: N, scope } (Knightly Armament, Invoke Sorcery, Dreadknight Smash) or
  // { amount: { perPreviousUseThisTurn: N }, scope } (Destructive Arcana: +1 for each earlier use this turn).
  // Conditional (if) and per-target amounts are handled where their condition is known (Umbral Strike, Anchor Smash).
  const providerId = String(parentId || '');
  const providerAbility = providerId
    ? [...(attacker.card.abilities || []), ...(attacker.grantedAbilities || [])].find((a) => a.id === providerId)
    : undefined;
  const providerUse: any = (providerAbility?.effects || []).find((e: any) => e.type === 'useAbility');
  // "If this attack was made from the tile behind the target, it deals an additional 3 damage on the first hit" (e.g.
  // Umbral Strike: addDamage with an if), "If it was a melee attack, it deals an additional 1 damage per hit" (e.g.
  // Elevated Technique: meleeAddDamage)
  const providerAdd: any =
    providerUse?.addDamage && (!providerUse.addDamage.if || evalAttackerCondition(providerUse.addDamage.if, attacker, isBehind) === true)
      ? providerUse.addDamage
      : providerUse?.meleeAddDamage && isMelee
      ? providerUse.meleeAddDamage
      : undefined;
  if (providerAdd && providerAbility && hits[0] && !hits[0].appliedBonuses?.includes(providerId)) {
    const amount =
      typeof providerAdd.amount === 'number'
        ? providerAdd.amount
        : typeof providerAdd.amount?.perPreviousUseThisTurn === 'number'
        ? providerAdd.amount.perPreviousUseThisTurn * (attacker.usedTurnCounts?.[providerId] || 0)
        : // "for each ability this unit has already used this turn" (e.g. Forsaken Technique): not counting this use of it
        typeof providerAdd.amount?.perAbilityUsedThisTurn === 'number'
        ? providerAdd.amount.perAbilityUsedThisTurn *
          Math.max(0, getAbilitiesUsedThisTurn(attacker) - (attacker.usedTurnCounts?.[providerId] || 0))
        : 0;
    if (amount !== 0) {
      const targets = providerAdd.scope === 'firstHit' ? [hits[0]] : hits;
      targets.forEach((h) => {
        h.damage += amount;
        h.appliedBonuses = [...(h.appliedBonuses || []), providerId];
        h.conditionalNote = h.conditionalNote
          ? `${h.conditionalNote}, +${amount} ${providerAbility.name}`
          : `+${amount} ${providerAbility.name}`;
      });
    }
  }

  // (Elevated Technique, Umbral Strike: their useAbility's bonus, above. Shield of Blessings, Drakescale, Enrage,
  // Adrenaline, Glimmering Arrows, Backstab, Opportunist, Inscribed Edge: their damageBonus, in the loop below)

  // 14. Death Mark (Blight Phantom): "This turn, this unit's attacks against that unit deal an additional 5 damage on the first hit. This effect does not stack."
  if (target && (target.deathMark || target.statuses?.includes('death_mark'))) {
    const isTargetOfAttacker =
      !target.deathMark?.casterInstanceId ||
      target.deathMark.casterInstanceId === attacker.instanceId;
    if (isTargetOfAttacker && hits[0] && !hits[0].appliedBonuses?.includes('death_mark')) {
      const bonus = target.deathMark?.bonusDamage ?? 0;
      hits[0].damage += bonus;
      hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'death_mark'];
      hits[0].conditionalNote = hits[0].conditionalNote
        ? `${hits[0].conditionalNote}, +${bonus} Death Mark`
        : `+${bonus} Death Mark`;
    }
  }

  // 15a. Even-numbered attack bonus (e.g. Twinsoul: "Every second attack this unit uses each turn deals an additional
  // 2 damage per hit"): this attack is number (attacks already made this turn + 1); applies on 2nd, 4th, ...
  attackerPassives.forEach((p) => {
    const eff: any = p.effects?.find((e: any) => e.type === 'damageBonus' && e.if === 'attackNumberThisTurnIsEven');
    if (!eff || typeof eff.amount !== 'number') return;
    const attackNumber = getAttacksUsedThisTurn(attacker) + 1;
    if (attackNumber % 2 !== 0) return;
    const key = `even_attack_${p.id || p.name}`;
    const scoped = eff.scope === 'firstHit' ? hits.slice(0, 1) : hits;
    scoped.forEach((h) => {
      if (h.appliedBonuses?.includes(key)) return;
      h.damage += eff.amount;
      h.appliedBonuses = [...(h.appliedBonuses || []), key];
      h.conditionalNote = h.conditionalNote
        ? `${h.conditionalNote}, +${eff.amount} ${p.name} (attack ${attackNumber})`
        : `+${eff.amount} ${p.name} (attack ${attackNumber})`;
    });
  });

  // 15c. Conditional damage bonuses read from data that no named check above covers:
  //   { type: 'damageBonus', appliesTo: 'ownAttacks' | 'ownMeleeAttacks' | 'ownRangedAttacks', amount, scope, if }
  //   if: 'self.hasNotMovedThisTurn' (e.g. Settle Roots, Lie in Ambush, Energized Roots),
  //       'selfOnTileBehindTarget' (e.g. Unseen Wind; Backstab and Opportunist are applied above),
  //       'attackNumberThisTurn:N' (e.g. Waning Shadow: the second attack each turn),
  //       'abilityNumberThisTurn:N' (e.g. First Light: the first ability this turn),
  //       'self.hpRemainingIsEven' (e.g. Shifting Flow)
  //   An amount { perTileMovedThisTurn, max } needs no condition (e.g. Unstoppable Momentum: +1 per tile moved, up to 4)
  //       'target.attackedBySelfThisTurn' (e.g. Lock-On), 'target.firstUnitInStraightLine' (e.g. Barrel)
  const bonusConditionHolds = (cond: string): boolean | null => {
    // Conditions on the attacker and on the target joined with '&&' (e.g. Punchline)
    if (cond.includes('&&') && cond.includes('target.')) {
      const parts = cond.split('&&').map((c) => bonusConditionHolds(c.trim()));
      return parts.some((p) => p === null) ? null : parts.every(Boolean);
    }
    return cond.startsWith('target.')
      ? Boolean(target && targetConditionHolds(cond, attacker, target, options))
      : evalAttackerCondition(cond, attacker, isBehind);
  };
  attackerPassives.forEach((p) => {
    const effects = ((p.effects || []) as any[]).filter(
      (e: any) =>
        e.type === 'damageBonus' &&
        ((typeof e.if === 'string' && bonusConditionHolds(e.if) !== null) ||
          (!e.if && typeof e.amount?.perTileMovedThisTurn === 'number') ||
          (!e.if && isArmourFormula(e.amount)) ||
          (typeof e.if === 'string' && isArmourFormula(e.amount)))
    );
    // (an armour condition with checkedAt: 'eachHit' is checked as each hit lands; the rest of a joined condition now)
    const restOf = (cond: string, eachHit: boolean) =>
      cond
        .split('&&')
        .map((c) => c.trim())
        .filter((c) => !(eachHit && isArmourCondition(c)))
        .join(' && ');
    const armourPartOf = (cond: string) => cond.split('&&').map((c) => c.trim()).find(isArmourCondition);
    effects.forEach((eff: any, effIdx: number) => {
      const eachHit = eff.checkedAt === 'eachHit';
      const nowCond = typeof eff.if === 'string' ? restOf(eff.if, eachHit) : '';
      if (nowCond && !bonusConditionHolds(nowCond)) return;
      // "The first time this unit makes an attack from the tile behind its target each turn" (e.g. Inscribed Edge)
      if (p.limits?.firstQualifyingAttackEachTurn && /selfOnTileBehindTarget/.test(eff.if || '') && (attacker.attacksFromBehindThisTurn || 0) > 0) return;
      const perHit = Boolean((eachHit && typeof eff.if === 'string' && armourPartOf(eff.if)) || isArmourFormula(eff.amount));
      const amount =
        typeof eff.amount === 'number'
          ? eff.amount
          : isArmourFormula(eff.amount)
          ? 0
          : Math.min(
              typeof eff.amount.max === 'number' ? eff.amount.max : Infinity,
              eff.amount.perTileMovedThisTurn * (attacker.tilesMovedThisTurn || 0)
            );
      if (!amount && !perHit) return;
      const distance =
        options?.attackerHex && options?.targetHex ? getHexDistance(options.attackerHex, options.targetHex) : 1;
      // (an attack without the Melee tag is ranged, as everywhere else, e.g. a straight-line attack with no range such as
      // Iron Quarrel; a melee attack reaching past range 1 counts too)
      const isRangedAttack =
        !isMelee || Boolean(ability?.tags?.includes('ranged')) || distance > 1 || (ability?.range?.[1] ?? 1) > 1;
      if (eff.appliesTo === 'ownRangedAttacks' && !isRangedAttack) return;
      if (eff.appliesTo === 'ownMeleeAttacks' && !isMelee) return;
      const key = `${p.id || p.name}${effIdx > 0 ? `_${effIdx}` : ''}`;
      const scoped = eff.scope === 'firstHit' ? hits.slice(0, 1) : hits;
      scoped.forEach((h) => {
        if (perHit) {
          addPerHitBonus(h, { key, name: p.name, amount: eff.amount, if: eachHit && typeof eff.if === 'string' ? armourPartOf(eff.if) : undefined });
          return;
        }
        if (h.appliedBonuses?.includes(key)) return;
        h.damage += amount;
        h.appliedBonuses = [...(h.appliedBonuses || []), key];
        h.conditionalNote = h.conditionalNote ? `${h.conditionalNote}, +${amount} ${p.name}` : `+${amount} ${p.name}`;
      });
    });
  });

  // 15e. Auras from units around the attacker:
  //   a friendly unit's { type: 'damageBonus', appliesTo: 'attacksOfFriendlyUnitsSurroundingSelf', amount, scope } (e.g.
  //     Golden Banner: "Friendly units surrounding this unit deal an additional 1 damage on the first hit of each attack")
  //   an enemy unit's { type: 'reduceDamageDealt', target: 'enemyUnitsSurroundingSelf', appliesTo: 'rangedAttacks', amount,
  //     per: 'hit', minDamage } (e.g. Obscuring Smoke: "Ranged attacks made by enemy units surrounding this unit deal 2
  //     damage less per hit, to a minimum of 1 damage per hit")
  {
    const board = options?.unitsOnBoard || getCurrentUnitsOnBoard();
    const distance = attackerHex && targetHex ? getHexDistance(attackerHex, targetHex) : 1;
    const isRangedAttack = !isMelee && (Boolean(ability?.tags?.includes('ranged')) || distance > 1 || (ability?.range?.[1] ?? 1) > 1 || ability?.target === 'direction');
    if (attackerHex) {
      getSurroundingHexes(attackerHex).forEach((h) => {
        const u = board[h];
        if (!u || u.instanceId === attacker.instanceId) return;
        getUnitPassives(u).forEach((p) => {
          ((p.effects || []) as any[]).forEach((e, idx) => {
            const key = `aura_${u.instanceId}_${p.id || p.name}_${idx}`;
            if (e.type === 'damageBonus' && e.appliesTo === 'attacksOfFriendlyUnitsSurroundingSelf' && u.owner === attacker.owner && typeof e.amount === 'number') {
              (e.scope === 'firstHit' ? hits.slice(0, 1) : hits).forEach((hit) => {
                if (hit.appliedBonuses?.includes(key)) return;
                hit.damage += e.amount;
                hit.appliedBonuses = [...(hit.appliedBonuses || []), key];
                hit.conditionalNote = hit.conditionalNote ? `${hit.conditionalNote}, +${e.amount} ${p.name}` : `+${e.amount} ${p.name}`;
              });
            }
            if (
              e.type === 'reduceDamageDealt' &&
              e.target === 'enemyUnitsSurroundingSelf' &&
              e.appliesTo === 'rangedAttacks' &&
              isRangedAttack &&
              u.owner !== attacker.owner &&
              typeof e.amount === 'number'
            ) {
              const floor = typeof e.minDamage === 'number' ? e.minDamage : 0;
              (e.per === 'hit' ? hits : hits.slice(0, 1)).forEach((hit) => {
                if (hit.appliedBonuses?.includes(key) || hit.damage <= floor) return;
                const before = hit.damage;
                hit.damage = Math.max(floor, hit.damage - e.amount);
                hit.appliedBonuses = [...(hit.appliedBonuses || []), key];
                hit.conditionalNote = hit.conditionalNote ? `${hit.conditionalNote}, -${before - hit.damage} ${p.name}` : `-${before - hit.damage} ${p.name}`;
              });
            }
          });
        });
      });
    }
  }

  // 15b. A buff waiting for this unit's next attack (e.g. Perfect Form: +2 damage per hit after an armour ability)
  const nextBonus = attacker.nextAttackBonus;
  if (nextBonus && nextBonus.amount > 0) {
    const scoped = nextBonus.scope === 'firstHit' ? hits.slice(0, 1) : hits;
    scoped.forEach((h) => {
      if (h.appliedBonuses?.includes('next_attack_bonus')) return;
      h.damage += nextBonus.amount;
      h.appliedBonuses = [...(h.appliedBonuses || []), 'next_attack_bonus'];
      h.conditionalNote = h.conditionalNote
        ? `${h.conditionalNote}, +${nextBonus.amount} ${nextBonus.source}`
        : `+${nextBonus.amount} ${nextBonus.source}`;
    });
  }

  // 15. First-hit reduction on the attacker (e.g. Predictive Strike: "the target deals 3 damage less on the first hit if it attacks")
  // 15d. "When this unit attacks a target in melee range, that attack hits again dealing 3 damage" (e.g. Stock):
  // { type: 'extraHit', amount, if: 'target.inMeleeRange' } on a passive adds a hit at the end, once per attack
  attackerPassives.forEach((p) => {
    const eff: any = (p.effects || []).find((e: any) => e.type === 'extraHit' && typeof e.amount === 'number' && e.if !== 'attackBreaksTargetArmour');
    const key = `extra_hit_${p.id || p.name}`;
    if (!eff || !hits[0] || hits.some((h) => h.appliedBonuses?.includes(key))) return;
    if (eff.if && !(target && targetConditionHolds(eff.if, attacker, target, options))) return;
    hits.push({ hitIndex: hits.length + 1, damage: eff.amount, conditionalNote: p.name, appliedBonuses: [key] });
  });

  // 15e. A mark this unit put on the target this turn (e.g. Parasitic Enzyme: "Until the end of the turn, this unit's
  // attacks against the target deal an additional 2 damage per hit")
  const enzyme = target?.attackerMark;
  if (enzyme && enzyme.casterInstanceId === attacker.instanceId && enzyme.turn === getCurrentTurnNumber()) {
    hits.forEach((h) => {
      if (h.appliedBonuses?.includes('attacker_mark')) return;
      h.damage += enzyme.bonusPerHit;
      h.appliedBonuses = [...(h.appliedBonuses || []), 'attacker_mark'];
      h.conditionalNote = h.conditionalNote ? `${h.conditionalNote}, +${enzyme.bonusPerHit} ${enzyme.sourceName}` : `+${enzyme.bonusPerHit} ${enzyme.sourceName}`;
    });
  }

  // A free repeat of an attack that "deals 2 damage less on the first hit (to a minimum of 1)" (e.g. Echoing Harmony):
  // set on the granted copy as firstHitPenalty { amount, min, source }
  const penalty: any = (ability as any)?.firstHitPenalty;
  if (penalty && hits[0] && !hits[0].appliedBonuses?.includes('first_hit_penalty')) {
    hits[0].damage = Math.max(Math.min(hits[0].damage, penalty.min ?? 0), hits[0].damage - penalty.amount);
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'first_hit_penalty'];
    hits[0].conditionalNote = hits[0].conditionalNote ? `${hits[0].conditionalNote}, -${penalty.amount} ${penalty.source}` : `-${penalty.amount} ${penalty.source}`;
  }

  // "...its melee attacks deal 2 damage less on the first hit during that turn" (e.g. Blade Breaker)
  const meleeReduction = attacker.meleeFirstHitReduction;
  if (meleeReduction && isMelee && hits[0] && !hits[0].appliedBonuses?.includes('melee_first_hit_reduction')) {
    hits[0].damage = Math.max(0, hits[0].damage - meleeReduction.amount);
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'melee_first_hit_reduction'];
    hits[0].conditionalNote = hits[0].conditionalNote
      ? `${hits[0].conditionalNote}, -${meleeReduction.amount} (${meleeReduction.source})`
      : `-${meleeReduction.amount} (${meleeReduction.source})`;
  }

  const reduction = attacker.firstHitReduction || 0;
  if (reduction > 0 && hits[0] && !hits[0].appliedBonuses?.includes('first_hit_reduction')) {
    hits[0].damage = Math.max(0, hits[0].damage - reduction);
    hits[0].appliedBonuses = [...(hits[0].appliedBonuses || []), 'first_hit_reduction'];
    hits[0].conditionalNote = hits[0].conditionalNote
      ? `${hits[0].conditionalNote}, -${reduction} (foreseen)`
      : `-${reduction} (foreseen)`;
  }
}

/**
 * Calculates the amount of damage an ability inflicts on the unit using it.
 */
export function getAbilitySelfDamage(ability?: CardAbility | null): number {
  if (!ability) return 0;
  let selfDmg = 0;
  if (ability.effects && Array.isArray(ability.effects)) {
    for (const eff of ability.effects) {
      if (eff.type === 'damage' && (eff.target === 'self' || eff.target === 'caster')) {
        const amt = typeof eff.amount === 'number' ? eff.amount : 0;
        const hits = typeof eff.hits === 'number' ? eff.hits : 1;
        selfDmg += amt * hits;
      }
    }
  }
  if (selfDmg > 0) return selfDmg;

  const text = ability.text || '';
  const match1 = text.match(/(?:then,?\s*)?(?:this unit|you)\s+takes?\s+(\d+)\s+damage/i);
  if (match1) return parseInt(match1[1], 10);

  const match2 = text.match(/deal[s]?\s+(\d+)\s+damage\s+to\s+this\s+unit/i);
  if (match2) return parseInt(match2[1], 10);

  return 0;
}

/**
 * Finds the lowest damage number (per hit) among attacks of the promoted card(s).
 * If no promoted cards or no attacks exist, returns a standard fallback (5).
 */
export function getLowestPerHitDamageFromPromotedCards(
  promotedCards?: CardItem[] | null,
  fallback = 5
): { lowestDmg: number; sourceCardName?: string; sourceAbilityName?: string } {
  if (!promotedCards || promotedCards.length === 0) {
    return { lowestDmg: fallback };
  }

  let minDamage = Infinity;
  let sourceCardName: string | undefined;
  let sourceAbilityName: string | undefined;

  for (const card of promotedCards) {
    if (!card.abilities) continue;
    for (const ab of card.abilities) {
      // Check if this ability is an attack
      const isAttack =
        ab.tags?.includes('melee') ||
        ab.tags?.includes('ranged') ||
        ab.tags?.includes('attack') ||
        ab.text.toLowerCase().includes('deal') ||
        ab.text.toLowerCase().includes('damage');

      if (!isAttack) continue;

      // 1. From effect definitions
      for (const eff of (ab.effects || []) as any[]) {
        if (eff.target === 'self' || eff.target === 'caster') continue;
        if (eff.type === 'damage' && typeof eff.amount === 'number' && eff.amount > 0) {
          if (eff.amount < minDamage) {
            minDamage = eff.amount;
            sourceCardName = card.name;
            sourceAbilityName = ab.name;
          }
        }
        if (eff.extraHit && typeof eff.extraHit.amount === 'number' && eff.extraHit.amount > 0) {
          if (eff.extraHit.amount < minDamage) {
            minDamage = eff.extraHit.amount;
            sourceCardName = card.name;
            sourceAbilityName = ab.name;
          }
        }
        if (
          eff.damageToEnemiesMovedThrough &&
          typeof eff.damageToEnemiesMovedThrough === 'number' &&
          eff.damageToEnemiesMovedThrough > 0
        ) {
          if (eff.damageToEnemiesMovedThrough < minDamage) {
            minDamage = eff.damageToEnemiesMovedThrough;
            sourceCardName = card.name;
            sourceAbilityName = ab.name;
          }
        }
      }

      // 2. From ability text: 'deal(s) X damage', 'dealing X damage', 'for X damage'
      const matches = ab.text.matchAll(/(?:deals?|dealing|for)\s+(\d+)\s+damage/gi);
      for (const m of matches) {
        const val = parseInt(m[1], 10);
        if (val > 0 && val < minDamage) {
          minDamage = val;
          sourceCardName = card.name;
          sourceAbilityName = ab.name;
        }
      }

      // 'hits again for X damage'
      const hitsAgainMatches = ab.text.matchAll(/hits\s+again\s+for\s+(\d+)/gi);
      for (const m of hitsAgainMatches) {
        const val = parseInt(m[1], 10);
        if (val > 0 && val < minDamage) {
          minDamage = val;
          sourceCardName = card.name;
          sourceAbilityName = ab.name;
        }
      }

      // 'X damage per hit'
      const perHitMatches = ab.text.matchAll(/(\d+)\s+damage\s+per\s+hit/gi);
      for (const m of perHitMatches) {
        const val = parseInt(m[1], 10);
        if (val > 0 && val < minDamage) {
          minDamage = val;
          sourceCardName = card.name;
          sourceAbilityName = ab.name;
        }
      }
    }
  }

  if (minDamage === Infinity) {
    return { lowestDmg: fallback };
  }

  return { lowestDmg: minDamage, sourceCardName, sourceAbilityName };
}

/**
 * Parses an attack ability to determine its hits and damage structure.
 */
export function getAbilityHitStructure(
  ability: CardAbility | null | undefined,
  attacker?: BattlefieldUnit | null,
  target?: BattlefieldUnit | null,
  options?: AttackExecutionOptions
): AbilityHitStructure {
  if (!ability) {
    return {
      isBladefury: false,
      isMultiHit: false,
      hits: [],
      summaryText: '',
      badgeText: ''
    };
  }

  // Combined attacks (e.g. Gemstone Hammer: "Deals 3 damage. Use a 1AP ranged attack ... For each AP spent, do this
  // again (counts as additional hits)"): one attack whose hits are, per repeat, the lead hit then the chosen attack's hits
  const combined = (ability as any).combinedHits as
    | { leadDamage: number; leadName: string; parts: CardAbility[]; singleHit?: boolean }
    | undefined;
  if (combined && Array.isArray(combined.parts)) {
    const actualAttacker = attacker || options?.attacker;
    // Single hit (e.g. Ultra Blade: "deals damage equal to the total damage those attacks would deal, as a single hit"):
    // each chosen attack is worked out as it would deal (bonuses included), then summed into one hit. Bonuses are not
    // applied again to that hit, since they are already in the attacks' totals.
    if (combined.singleHit) {
      const parts = combined.parts.map((part) => {
        const s = getAbilityHitStructure({ ...part, parentAbilityId: undefined }, actualAttacker, target, options);
        const partHits = s.hits && s.hits.length > 0 ? s.hits : [{ hitIndex: 1, damage: 5 }];
        return { name: part.name, total: partHits.reduce((sum, h) => sum + h.damage, 0) };
      });
      const total = parts.reduce((sum, p) => sum + p.total, 0);
      return {
        isBladefury: false,
        isMultiHit: true,
        hits: [{ hitIndex: 1, damage: total, conditionalNote: parts.map((p) => `${p.name} ${p.total}`).join(' + ') }],
        summaryText: `${ability.name}: one hit of ${total} (${parts.map((p) => `${p.name} ${p.total}`).join(' + ')}).`,
        badgeText: `1 Hit (${total})`
      };
    }
    const hits: AttackHit[] = [];
    combined.parts.forEach((part, rep) => {
      if (combined.leadDamage > 0) {
        hits.push({ hitIndex: hits.length + 1, damage: combined.leadDamage, conditionalNote: `${combined.leadName} ${rep + 1}` });
      }
      const partStruct = getAbilityHitStructure({ ...part, parentAbilityId: undefined }, actualAttacker, target, options);
      const partHits = partStruct.hits && partStruct.hits.length > 0 ? partStruct.hits : [{ hitIndex: 1, damage: 5 }];
      partHits.forEach((h) =>
        hits.push({
          ...h,
          hitIndex: hits.length + 1,
          conditionalNote: h.conditionalNote ? `${h.conditionalNote} (${part.name})` : part.name
        })
      );
    });
    applyAttackerBonusPassives(hits, ability, actualAttacker, target, options);
    const totalDmg = hits.reduce((s, h) => s + h.damage, 0);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: `${ability.name}: ${hits.length} hits (${hits.map((h) => h.damage).join(' + ')} = ${totalDmg} total dmg).`,
      badgeText: `${hits.length} Hits`
    };
  }


  // "Use a 1AP attack on the promoted card twice ... against the same target" (e.g. Overload Gemstone: a useAbility with
  // times 2). The uses themselves are run separately by the provider chain (see providerChain.ts: repeatAsSeparateUses);
  // this is the preview: the first qualifying promoted attack's hits, that many times.
  const repeatUse: any = (ability.effects || []).find((e: any) => e.type === 'useAbility' && typeof e.times === 'number' && e.times > 1);
  if (repeatUse) {
    const actualAttacker = attacker || options?.attacker;
    const qualifying = actualAttacker?.promotedCards
      ? getQualifyingPromotedAbilities(ability, actualAttacker.promotedCards)
      : [];
    if (qualifying.length > 0) {
      const firstPromo = qualifying[0].ability;
      const baseStruct = getAbilityHitStructure(firstPromo, actualAttacker, target, options);
      const baseHits = baseStruct.hits || [];
      const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
      const hits: AttackHit[] = [];
      for (let rep = 1; rep <= repeatUse.times; rep++) {
        baseHits.forEach((h) => hits.push({ ...h, hitIndex: hits.length + 1, conditionalNote: `${ordinal(rep)} attack` }));
      }
      const totalDmg = hits.reduce((sum, h) => sum + h.damage, 0);
      return {
        isBladefury: false,
        isMultiHit: true,
        hits,
        summaryText: `${ability.name}: Uses ${firstPromo.name} ${repeatUse.times} times against the target (${totalDmg} total damage)`,
        badgeText: `${hits.map((h) => h.damage).join('+')} Dmg`
      };
    }
    return {
      isBladefury: false,
      isMultiHit: true,
      hits: [],
      summaryText: ability.text,
      badgeText: `${repeatUse.times}x ${repeatUse.filter?.cost ?? ''}AP Atk`
    };
  }


  // An ability that deals no damage itself: no hits (e.g. a react that prevents damage, such as Flawless Parry, or a mark
  // that adds to later attacks, such as Death Mark), its numbers read from its data for the badge
  // (damage of its own: a damage effect, or damage to units it moves over, e.g. Mounted Charge's damageToUnitsMovedOver)
  const dealsDamage = ((ability.effects || []) as any[]).some(
    (e: any) => e.type === 'damage' || Object.keys(e).some((k) => /^damage/.test(k))
  );
  if (Array.isArray(ability.effects) && ability.effects.length > 0 && !dealsDamage && !(ability.effects as any[]).some((e: any) => e.type === 'useAbility')) {
    const nested = (ability.effects as any[]).flatMap((e: any) => [e, ...((e.effects || []) as any[])]);
    const prevent = nested.find((e: any) => e.type === 'preventDamage' && typeof e.upTo === 'number');
    const markBonus = nested.find((e: any) => e.type === 'damageBonus' && typeof e.amount === 'number');
    return {
      isBladefury: false,
      isMultiHit: false,
      hits: [],
      summaryText: ability.text,
      badgeText: prevent ? `Parry (${prevent.upTo})` : markBonus ? `Mark (+${markBonus.amount})` : ''
    };
  }



  const selfDmg = getAbilitySelfDamage(ability);
  const targetDamageEffects = (ability.effects || []).filter(
    (e: any) => e.type === 'damage' && e.target !== 'self' && e.target !== 'caster'
  );

  // If the ability only deals damage to self (e.g. Profane Insight)
  if (targetDamageEffects.length === 0 && selfDmg > 0) {
    return {
      isBladefury: false,
      isMultiHit: false,
      hits: [],
      summaryText: `Deals ${selfDmg} damage to this unit`,
      badgeText: `${selfDmg} Self-Dmg`
    };
  }

  const text = ability.text || '';
  const damageEffects = targetDamageEffects;

  // The ability itself, also when it is used through another (e.g. Knightly Armament's copy of Plunge and Twist)
  const coreId = ability.promotedAbilityId || ability.id;

  // Check structured extraHit:
  const firstEffAny = damageEffects[0] as Record<string, any> | undefined;
  // { extraHit: { amount, if? } }: the condition is checked (see extraHitConditionHolds), e.g. Monkey Smash's
  // 'thisAbilityNotUsedEarlierThisTurn', Borrowed Blaster's 'selfOnTileBehindTarget'
  const extraHitAttacker = attacker || options?.attacker;
  const extraHitApplies =
    firstEffAny?.extraHit && extraHitConditionHolds(firstEffAny.extraHit.if, ability, extraHitAttacker, target, options);
  if (firstEffAny && firstEffAny.extraHit && extraHitApplies) {
    // { if, addAmountPerHit } on the target (e.g. Crescent Blade: +1 per hit against a unit it knocked back this turn)
    const perHitAdd = ((firstEffAny.modifiers || []) as any[])
      .filter((m) => typeof m.addAmountPerHit === 'number' && target && targetConditionHolds(m.if, attacker || options?.attacker, target, options))
      .reduce((s, m) => s + m.addAmountPerHit, 0);
    const d1 =
      (typeof firstEffAny.amount === 'number'
        ? firstEffAny.amount
        : typeof firstEffAny.amount?.formula === 'string'
        ? evalFormulaAmount(firstEffAny.amount, getFormulaVars(ability, extraHitAttacker, target, options))
        : 5) + perHitAdd;
    const d2 = (typeof firstEffAny.extraHit.amount === 'number' ? firstEffAny.extraHit.amount : d1 - perHitAdd) + perHitAdd;
    const hits: AttackHit[] = [
      { hitIndex: 1, damage: d1 },
      {
        hitIndex: 2,
        damage: d2,
        ...(firstEffAny.extraHit.if === 'target.noArmour' ? { onlyIfTargetHasNoArmour: true } : {}),
        ...(firstEffAny.extraHit.if === 'thisAttackDamagedArmour' ? { onlyIfArmourDamaged: true } : {}),
        ...(typeof firstEffAny.extraHit.bypassArmour === 'boolean' ? { bypassArmour: firstEffAny.extraHit.bypassArmour } : {})
      }
    ];
    applyAttackerBonusPassives(hits, ability, attacker || options?.attacker, target, options);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText:
        d1 !== d2
          ? `Hits 2 times: Hit 1 deals ${d1} damage, Hit 2 deals ${d2} damage`
          : `Hits 2 times (${d1} damage each)`,
      badgeText: d1 !== d2 ? `${d1}+${d2} Dmg` : '2 Hits'
    };
  }

  // Check structured multiple damage effects with asAdditionalHit:
  if (damageEffects.length > 1 && damageEffects.some((e: any) => e.asAdditionalHit)) {
    const hits: AttackHit[] = [];
    let idx = 1;
    const actualAttacker = attacker || options?.attacker;
    const vars = getFormulaVars(ability, actualAttacker, target, options);
    for (const de of damageEffects) {
      // (a formula can use the first hit's amount, e.g. Bladefury: "subtract that number from 7")
      const amt =
        typeof de.amount === 'number'
          ? de.amount
          : typeof (de.amount as any)?.formula === 'string'
          ? evalFormulaAmount(de.amount, { ...vars, firstHitAmount: hits[0]?.damage ?? 0 })
          : 5;
      const count = typeof de.hits === 'number' ? de.hits : 1;
      for (let i = 0; i < count; i++) {
        hits.push({ hitIndex: idx++, damage: amt, ...(typeof (de as any).bypassArmour === 'boolean' ? { bypassArmour: (de as any).bypassArmour } : {}) });
      }
    }
    applyAttackerBonusPassives(hits, ability, actualAttacker, target, options);
    const allSame = hits.every((h) => h.damage === hits[0].damage);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: allSame
        ? `Hits ${hits.length} times (${hits[0].damage} damage each)`
        : `Hits ${hits.length} times: ${hits.map((h) => `Hit ${h.hitIndex} deals ${h.damage}`).join(', ')}`,
      badgeText: allSame ? `${hits.length} Hits` : hits.map((h) => h.damage).join('+') + ' Dmg'
    };
  }

  // General multi-hit with identical or conditional damage per hit:
  // A free variable-cost ability resolves as the AP its provider specifies or paid (apSpentAs)
  const apSpent = typeof ability.apSpentAs === 'number'
    ? ability.apSpentAs
    : typeof ability.selectedCost === 'number'
    ? ability.selectedCost
    : Array.isArray(ability.cost)
    ? ability.cost[0]
    : typeof ability.cost === 'number'
    ? ability.cost
    : 1;

  let baseDamage = 5;
  const matchDmg = text.match(/deal[s]?\s+(\d+)\s+damage/i) || text.match(/(\d+)\s+damage/i);
  if (matchDmg) baseDamage = parseInt(matchDmg[1], 10);
  if (damageEffects.length > 0) {
    if (typeof damageEffects[0].amount === 'number') {
      baseDamage = damageEffects[0].amount;
    } else if (typeof (damageEffects[0].amount as any)?.formula === 'string') {
      baseDamage = evalFormulaAmount(damageEffects[0].amount, getFormulaVars(ability, attacker || options?.attacker, target, options));
    } else if (
      typeof damageEffects[0].amount === 'object' &&
      damageEffects[0].amount !== null &&
      typeof (damageEffects[0].amount as any).perAP === 'number'
    ) {
      baseDamage = (damageEffects[0].amount as any).perAP * apSpent;
    }
  }

  // Also check if text specifies damage per AP spent (e.g. Glacial Spikes)
  const perApDmgMatch = text.match(/(\d+)\s+damage\s+per\s+AP\s+spent/i);
  if (perApDmgMatch) {
    baseDamage = parseInt(perApDmgMatch[1], 10) * apSpent;
  }

  // Data-driven: "if this ability was already used earlier this turn, deal X instead" (Twinbolt, and borrowed copies)
  const usedEarlierMod = ((damageEffects[0] as any)?.modifiers || []).find(
    (m: any) => m.if === 'thisAbilityUsedEarlierThisTurn' && typeof m.setAmount === 'number'
  );
  if (usedEarlierMod) {
    const baseId = ability.id?.includes('__') ? ability.id.split('__').pop()! : ability.id;
    if ((attacker?.usedTurnCounts?.[baseId] || 0) > 0) baseDamage = usedEarlierMod.setAmount;
  }
  // Added to the first hit only (a modifier with scope: 'firstHit', e.g. Flaming Dive, Guard's Strike, Disembowel)
  let firstHitAdd = 0;
  // (an amount added to the last hit only, e.g. Three Curses: "an additional 1 damage on the last hit for each unit...")
  let lastHitAdd = 0;
  // A hit's own bypass when a modifier sets it (e.g. Coup de Grace's setBypassArmour: false)
  let setBypass: boolean | undefined;
  // Data-driven: "if this unit moved before declaring this attack this turn, add amount" (e.g. Flaming Dive)
  const movedThisTurnMod = ((damageEffects[0] as any)?.modifiers || []).find(
    (m: any) =>
      (m.if === 'self.movedBeforeDeclaringThisTurn' ||
        m.if === 'self.movedThisTurn' ||
        m.if === 'movedThisTurn') &&
      typeof m.addAmount === 'number'
  );
  if (movedThisTurnMod) {
    const actualAttacker = attacker || options?.attacker;
    if (actualAttacker?.movedThisTurn) {
      if (movedThisTurnMod.scope === 'firstHit') firstHitAdd += movedThisTurnMod.addAmount;
      else baseDamage += movedThisTurnMod.addAmount;
    }
  }
  // Data-driven modifiers on the attacker's movement and this ability's earlier uses this turn:
  //   { if: 'self.hasNotMovedThisTurn', addAmount }                   (e.g. Flatten Foe)
  //   { if: 'self.hasArmour', addAmount }                             (e.g. Deft Skewer)
  //   { addAmount: { perTileMovedThisTurn: N } }                      (e.g. Lance Thrust, Freezing Crash)
  //   { addAmount: { perPreviousUseThisTurn: N }, minAmount }         (e.g. Controlled Burn: -2 per earlier use)
  {
    const actualAttacker = attacker || options?.attacker;
    let minAmount: number | undefined;
    const modAttackerHex = options?.attackerHex || actualAttacker?.hexId;
    const modTargetHex = options?.targetHex || target?.hexId;
    const modBehind = isAttackFromBehind(
      modAttackerHex,
      modTargetHex,
      target?.owner || (actualAttacker ? (actualAttacker.owner === 'player1' ? 'player2' : 'player1') : null),
      ability
    );
    // (an amount added to the first hit, or to every hit)
    const add = (m: any, amount: number) => {
      if (m.scope === 'firstHit') firstHitAdd += amount;
      else if (m.scope === 'lastHit') lastHitAdd += amount;
      else baseDamage += amount;
    };
    ((damageEffects[0] as any)?.modifiers || []).forEach((m: any) => {
      if (m === movedThisTurnMod) return;
      // { if, setAmount, setBypassArmour? } on the target (e.g. Coup de Grace: 10 damage against Slow Venom)
      if (typeof m.setAmount === 'number' && m.if !== 'thisAbilityUsedEarlierThisTurn') {
        const holds =
          typeof m.if === 'string' && m.if.startsWith('target.')
            ? Boolean(target && targetConditionHolds(m.if, actualAttacker, target, options))
            : Boolean(actualAttacker && evalAttackerCondition(m.if, actualAttacker, modBehind) === true);
        if (holds) {
          baseDamage = m.setAmount;
          if (typeof m.setBypassArmour === 'boolean') setBypass = m.setBypassArmour;
        }
        return;
      }
      if (m.if === 'self.hasNotMovedThisTurn' && typeof m.addAmount === 'number') {
        if (!actualAttacker?.movedThisTurn) add(m, m.addAmount);
      } else if (m.if === 'self.hasArmour' && typeof m.addAmount === 'number') {
        if ((actualAttacker?.armour || 0) > 0) add(m, m.addAmount);
      } else if (m.if === 'thisAbilityUsedOnTargetEarlierThisTurn' && typeof m.addAmount === 'number') {
        // e.g. Shove Off: "If this unit has already used this attack on the target this turn"
        const useKey = String(ability.baseAbilityId || ability.id);
        if (target && (actualAttacker?.usedOnTargets?.[useKey] || []).includes(target.instanceId)) add(m, m.addAmount);
      } else if (m.if === 'selfOnTileBehindTarget' && typeof m.addAmount === 'number') {
        // e.g. Disembowel: "If this attack is made from behind, it deals an additional 2 damage"
        if (modBehind) add(m, m.addAmount);
      } else if (typeof m.addAmount?.perTileMovedThisTurn === 'number') {
        baseDamage += m.addAmount.perTileMovedThisTurn * (actualAttacker?.tilesMovedThisTurn || 0);
      } else if (typeof m.addAmount?.perUnitKilledThisTurn === 'number') {
        // e.g. Three Curses: "an additional 1 damage per hit for each unit this unit has killed this turn"
        add(m, m.addAmount.perUnitKilledThisTurn * (actualAttacker?.unitsKilledThisTurn || 0));
      } else if (typeof m.addAmount?.perPreviousUseThisTurn === 'number') {
        const useKey = ability.baseAbilityId || ability.id;
        baseDamage += m.addAmount.perPreviousUseThisTurn * (actualAttacker?.usedTurnCounts?.[useKey] || 0);
      } else if (m.if === 'thisAbilityNotUsedEarlierThisTurn' && typeof m.addAmount === 'number') {
        // e.g. Irradiated Trident: "The first time this ability is used each turn, it deals an additional 1 damage"
        if (!(actualAttacker?.usedTurnCounts?.[ability.baseAbilityId || ability.id] || 0)) baseDamage += m.addAmount;
      } else if (typeof m.addAmount?.perCardUnderTarget === 'number' && target) {
        // e.g. Flash-Freezing Drop: "an additional 4 damage for each card beneath the target unit"
        baseDamage += m.addAmount.perCardUnderTarget * (target.promotedCards?.length || 0);
      } else if (typeof m.addAmount === 'number' && m.checkedAt !== 'eachHit' && target && targetConditionHolds(m.if, actualAttacker, target, options)) {
        // Conditions on the target (e.g. Coordinated Strike, Frostbite Fangs, Phlox Shot)
        add(m, m.addAmount);
      }
      if (typeof m.minAmount === 'number') minAmount = Math.max(minAmount ?? 0, m.minAmount);
    });
    if (minAmount !== undefined) baseDamage = Math.max(minAmount, baseDamage);
  }

  let hitCount = 1;
  // { if, setHits } (e.g. Volt Spear: "Hits twice if this unit has moved this turn")
  const setHitsMod = ((damageEffects[0] as any)?.modifiers || []).find(
    (m: any) =>
      typeof m.setHits === 'number' &&
      (attacker || options?.attacker) &&
      evalAttackerCondition(m.if, (attacker || options?.attacker)!, false) === true
  );
  const hasSetHits = ((damageEffects[0] as any)?.modifiers || []).some((m: any) => typeof m.setHits === 'number');
  const effHits = setHitsMod ? setHitsMod.setHits : damageEffects[0]?.hits;
  if (hasSetHits) {
    // (the text's "hits twice" is the conditional count, so it isn't read)
    hitCount = typeof effHits === 'number' ? effHits : 1;
  } else if (typeof effHits === 'number' && effHits > 1) {
    hitCount = effHits;
  } else if (
    typeof effHits === 'object' &&
    effHits !== null &&
    typeof (effHits as any).perAP === 'number'
  ) {
    hitCount = (effHits as any).perAP * apSpent;
  } else if (/hits\s+(\d+)\s+times\s+per\s+AP\s+spent/i.test(text)) {
    const m = text.match(/hits\s+(\d+)\s+times\s+per\s+AP\s+spent/i);
    if (m) hitCount = parseInt(m[1], 10) * apSpent;
  } else if (/hits\s+twice|hit\s+twice|hits\s+2\s+times|hit\s+2\s+times/i.test(text)) {
    hitCount = 2;
  } else if (/hits\s+three\s+times|hit\s+three\s+times|hits\s+3\s+times|hit\s+3\s+times/i.test(text)) {
    hitCount = 3;
  } else if (/hits\s+four\s+times|hit\s+four\s+times|hits\s+4\s+times|hit\s+4\s+times/i.test(text)) {
    hitCount = 4;
  } else {
    const countMatch = text.match(/hits\s+(\d+)\s+times/i);
    if (countMatch) hitCount = parseInt(countMatch[1], 10);
  }

  const blockWithoutDepleting =
    damageEffects[0]?.armourInteraction === 'blockWithoutDepleting' ||
    /Armour blocks this attack without depleting/i.test(text);

  // { if: 'target.noArmour' | 'target.hasArmour', addAmount } on the damage (e.g. Hundred-Cut Crescendo: "Each time this
  // attack hits, if the target no longer has any armour, that hit deals an additional 1 damage"): as each hit lands
  const armourMods = (((damageEffects[0] as any)?.modifiers || []) as any[]).filter(
    (m) => isArmourCondition(m.if) && m.checkedAt === 'eachHit' && typeof m.addAmount === 'number'
  );
  const withArmourMods = (h: AttackHit): AttackHit => {
    armourMods.forEach((m, i) =>
      addPerHitBonus(h, { key: `${ability.id}_armour_${i}`, name: ability.name, amount: m.addAmount, if: m.if })
    );
    return h;
  };

  if (hitCount > 1) {
    const hits: AttackHit[] = [];
    for (let i = 1; i <= hitCount; i++) {
      hits.push({
        hitIndex: i,
        damage: baseDamage + (i === 1 ? firstHitAdd : 0) + (i === hitCount ? lastHitAdd : 0),
        ...(setBypass !== undefined ? { bypassArmour: setBypass } : {}),
        blockWithoutDepleting,
        ...(i === 1 && (damageEffects[0] as any)?.firstHitBypassesArmour ? { bypassArmour: true } : {})
      });
      withArmourMods(hits[hits.length - 1]);
    }
    applyAttackerBonusPassives(hits, ability, attacker, target);
    const allSame = hits.every((h) => h.damage === hits[0].damage);
    return {
      isBladefury: false,
      isMultiHit: true,
      hits,
      summaryText: allSame
        ? `Hits ${hitCount} times (${hits[0].damage} damage each)`
        : `Hits ${hitCount} times: ${hits.map((h) => `Hit ${h.hitIndex} deals ${h.damage}`).join(', ')}`,
      badgeText: allSame ? `${hitCount} Hits` : hits.map((h) => h.damage).join('+') + ' Dmg'
    };
  }

  // Single hit
  const hits: AttackHit[] = [
    withArmourMods({ hitIndex: 1, damage: baseDamage + firstHitAdd + lastHitAdd, ...(setBypass !== undefined ? { bypassArmour: setBypass } : {}) })
  ];
  applyAttackerBonusPassives(hits, ability, attacker, target);
  const totalDmg = hits[0].damage;
  const hasBonus = Boolean(hits[0].appliedBonuses && hits[0].appliedBonuses.length > 0);
  return {
    isBladefury: false,
    isMultiHit: false,
    hits,
    summaryText: hasBonus ? `${totalDmg} damage (${hits[0].conditionalNote})` : `${totalDmg} damage`,
    badgeText: totalDmg !== baseDamage ? `${totalDmg} Dmg` : ''
  };
}

/**
 * Evaluates damage reduction passives on the target unit and its surroundings.
 */
export function calculateDamageReduction(
  rawDamage: number,
  hitIndex: number,
  totalHits: number,
  currentArmour: number,
  options?: AttackExecutionOptions
): { finalDamage: number; reductionNotes: string[] } {
  if (!options?.target) {
    return { finalDamage: rawDamage, reductionNotes: [] };
  }

  const target = options.target;
  const targetPassives = getUnitPassives(target);

  let distance = 1;
  if (options.attackerHex && options.targetHex) {
    distance = getHexDistance(options.attackerHex, options.targetHex);
  }

  const ability = options.ability;
  // Rules (Attack): a melee attack is one stated as melee, and "damage an ability deals as part of its user's own
  // movement or placement is also a melee attack" (e.g. Mounted Charge's damage to units moved over). Any other attack is
  // ranged, whatever range it was used from ("an attack used at range 1 does not count as melee unless specified").
  const isMelee = Boolean(ability?.tags?.includes('melee')) || dealsDamageThroughOwnMovement(ability);
  const isRanged = !isMelee;
  void distance;

  let currentDmg = rawDamage;
  const reductionNotes: string[] = [];

  // Damage reductions read from card data: { type: 'reduceDamage', target: 'self' | 'friendlyUnitsSurroundingSelf',
  //   amount | setTo, from?: 'meleeAttack' | 'rangedAttack' | 'attack', per?: 'attack' | 'hit', scope?: 'firstHit',
  //   minDamage?, if? }. 'per: attack' and 'scope: firstHit' apply on the first hit only. Covers Obscuring Cloak,
  // Iron Foundation, Vanguard Armour, Absolute Fortitude, Thick Hide, Gale Wings, Banner's Cover (from a surrounding
  // friendly unit), Relentless Rage (setTo), Insidious Weed, Regal Wings, Superheated Cloak, Symbiotic Fortitude, ...
  const conditionHolds = (cond: unknown): boolean => {
    if (!cond) return true;
    if (cond === 'damageWouldRemoveArmour') return currentArmour > 0;
    if (cond === 'attackHitsMoreThanOnce && damageWouldRemoveArmour') return totalHits > 1 && currentArmour > 0;
    if (cond === 'self.killedEnemyThisTurn') return Boolean(target.killedEnemyThisTurn);
    if (cond === 'self.hasArmour') return currentArmour > 0;
    // e.g. Shifting Flow: odd HP remaining when the attack is made
    if (cond === 'self.hpRemainingIsOdd') return (target.card.hp - target.damageCounters) % 2 === 1;
    // e.g. Scaled Boon: "attacks of units on scorched tiles"
    if (cond === 'attacker.onScorchedTile') return isHexScorchedNow(options.attackerHex, options.unitsOnBoard);
    // e.g. Automatic Shields: "unless that unit is behind this one (from the attacker's perspective)"
    if (cond === '!attacker.behindSelf') return !isAttackFromBehind(options.attackerHex, options.targetHex, target.owner, ability);
    return false;
  };
  const applyReduction = (e: any, sourceName: string) => {
    if (e.from === 'meleeAttack' && !isMelee) return;
    if (e.from === 'rangedAttack' && !isRanged) return;
    // "from enemy attacks" (e.g. Solid Ribcage): not from an attack of its own side
    if (e.from === 'enemyAttack' && options.attacker && options.attacker.owner === target.owner) return;
    if ((e.per === 'attack' || e.scope === 'firstHit') && hitIndex !== 1) return;
    if (!conditionHolds(e.if)) return;
    const floor = typeof e.minDamage === 'number' ? e.minDamage : 0;
    let reduced = currentDmg;
    if (typeof e.setTo === 'number') reduced = Math.min(currentDmg, e.setTo);
    else if (typeof e.amount === 'number') reduced = Math.max(floor, currentDmg - e.amount);
    const diff = currentDmg - reduced;
    if (diff > 0) {
      currentDmg = reduced;
      reductionNotes.push(`-${diff} (${sourceName})`);
    }
  };
  targetPassives.forEach((p) => {
    ((p.effects || []) as any[])
      .filter((e) => e.type === 'reduceDamage' && (e.target === 'self' || !e.target))
      .forEach((e) => applyReduction(e, p.name));
  });
  // A reduction it was given for a while (e.g. Ethereal Guard: "takes 2 damage less from all attacks until the end of
  // your opponent's next turn"), per attack
  if (target.attackDamageReduction && target.attackDamageReduction.amount > 0) {
    applyReduction(
      { amount: target.attackDamageReduction.amount, per: 'attack', minDamage: target.attackDamageReduction.minDamage },
      target.attackDamageReduction.sourceName
    );
  }
  // Auras from surrounding friendly units (e.g. Banner's Cover)
  if (options.targetHex && options.unitsOnBoard) {
    getSurroundingHexes(options.targetHex).forEach((h) => {
      const u = options.unitsOnBoard![h];
      if (!u || u.owner !== target.owner || u.instanceId === target.instanceId) return;
      getUnitPassives(u).forEach((p) => {
        ((p.effects || []) as any[])
          .filter((e) => e.type === 'reduceDamage' && e.target === 'friendlyUnitsSurroundingSelf')
          .forEach((e) => applyReduction(e, p.name));
      });
    });
  }
  return {
    finalDamage: currentDmg,
    reductionNotes
  };
}
/**
 * Reductions that apply to any damage, not just attacks ({ from: 'any' }), for damage that doesn't go through an attack
 * such as scorched tiles. e.g. Relentless Rage: "reduce that damage to 1" on a turn when this unit killed an enemy.
 */
export function reduceNonAttackDamage(unit: BattlefieldUnit, amount: number): number {
  let dmg = amount;
  getUnitPassives(unit).forEach((p) => {
    ((p.effects || []) as any[])
      .filter((e) => e.type === 'reduceDamage' && (e.target === 'self' || !e.target) && e.from === 'any')
      .forEach((e) => {
        if (e.if === 'self.killedEnemyThisTurn' && !unit.killedEnemyThisTurn) return;
        if (e.if === 'self.hasArmour' && !(unit.armour > 0)) return;
        if (e.if && e.if !== 'self.killedEnemyThisTurn' && e.if !== 'self.hasArmour') return;
        const floor = typeof e.minDamage === 'number' ? e.minDamage : 0;
        if (typeof e.setTo === 'number') dmg = Math.min(dmg, e.setTo);
        else if (typeof e.amount === 'number') dmg = Math.max(floor, dmg - e.amount);
      });
  });
  return dmg;
}
function getArmourBypass(hit: AttackHit, options?: AttackExecutionOptions): { all: boolean; upTo: number } {
  const ability = options?.ability;
  const dmgEffect = (ability?.effects || []).find((e: any) => e.type === 'damage') as any;
  // A hit's own setting wins (so Arcane Surge's 2nd hit can say false)
  let all = hit.bypassArmour ?? Boolean(dmgEffect?.bypassArmour);
  let upTo = hit.bypassArmourUpTo ?? 0;
  // The ability's own "bypassing up to N armour" (e.g. Air Razor, Piercing Charge)
  for (const e of (ability?.effects || []) as any[]) {
    if (e.type === 'bypassArmourUpTo' && typeof e.amount === 'number' && !e.if) upTo += e.amount;
  }
  // Passives such as Corrosive Wyvern (bypass up to 3); conditional ones (e.g. Eclipse Strike: melee from behind as the
  // second ability this turn) and "its armour is treated as 0" (e.g. Vacuum Strike: melee from behind)
  const attacker = options?.attacker;
  const isBehind = Boolean(
    attacker && isAttackFromBehind(options?.attackerHex || attacker.hexId, options?.targetHex, options?.target?.owner, ability)
  );
  const isMelee =
    Boolean(ability?.tags?.includes('melee')) ||
    dealsDamageAsPartOfOwnMovement(ability) ||
    Boolean(
      !ability?.tags?.includes('ranged') &&
        options?.attackerHex &&
        options?.targetHex &&
        getHexDistance(options.attackerHex, options.targetHex) === 1
    );
  const passiveApplies = (e: any) =>
    (!e.melee || isMelee) && (!e.if || (attacker ? evalAttackerCondition(e.if, attacker, isBehind) === true : false));
  for (const p of getUnitPassives(attacker)) {
    for (const e of (p.effects || []) as any[]) {
      if (e.type === 'bypassArmourUpTo' && passiveApplies(e)) upTo += e.amount;
      if (e.type === 'ignoreTargetArmour' && passiveApplies(e)) all = true;
    }
  }
  // Borrowed attacks, such as Tenacious Slam (bypass up to 4)
  const parentId = String(ability?.parentAbilityId || (ability?.id?.includes('__') ? ability.id.split('__')[0] : ''));
  // (e.g. Tenacious Slam: "Use a 1AP melee attack ... bypassing up to 4 armour": its useAbility's bypassArmourUpTo)
  if (parentId && attacker) {
    const provider = [...(attacker.card.abilities || []), ...(attacker.grantedAbilities || [])].find((a) => a.id === parentId);
    const use: any = (provider?.effects || []).find((e: any) => e.type === 'useAbility');
    if (typeof use?.bypassArmourUpTo === 'number') upTo += use.bypassArmourUpTo;
  }
  return { all, upTo };
}
/**
 * Resolves each hit sequentially against target armour and damage counters.
 * Stops if the target is defeated by an earlier hit.
 */
export function executeSequentialHits(
  hitsToExecute: AttackHit[],
  initialArmour: number,
  initialDamageCounters: number,
  targetHp: number,
  abilityId?: string,
  options?: AttackExecutionOptions
): {
  finalArmour: number;
  finalDamageCounters: number;
  isDefeated: boolean;
  hitResults: HitExecutionRecord[];
  damageCapKey?: string;
} {
  let currentArmour = initialArmour;
  let currentCounters = initialDamageCounters;
  let shellArmourTriggered = false; // Shell Armour: once per attack
  let armourBreakHitAdded = false; // Breaker's Resolve: once per attack
  const hitResults: HitExecutionRecord[] = [];
  // Hits added while resolving (e.g. Breaker's Resolve) join the end of this attack
  const queue = hitsToExecute.map((h) => ({ ...h }));
  // Hits made without the attacker's bonuses (e.g. a custom damage formula): apply them now, once
  if (options?.attacker && queue.length > 0 && !queue.some((h) => h.appliedBonuses?.includes(ATTACKER_BONUSES_APPLIED))) {
    applyAttackerBonusPassives(queue, options.ability, options.attacker, options.target, options);
  }
  // "The first ranged attack against this unit each turn can only deal a maximum of N damage" (e.g. Shining Supremacy)
  const damageCap = getAttackDamageCap(options);
  let dealtTowardCap = 0;

  for (const hit of queue) {
    if (currentCounters >= targetHp) {
      break;
    }
    // "Then, if the target has no armour, this attack hits again" (e.g. Plunge and Twist): armour left after the earlier hits
    if (hit.onlyIfTargetHasNoArmour && currentArmour > 0) continue;
    // "Then, if this attack damaged armour, hits again" (e.g. Phlox Shot): armour taken off by the earlier hits
    if (hit.onlyIfArmourDamaged && !(currentArmour < initialArmour)) continue;

    let hitDmg = hit.damage;
    let notes = hit.conditionalNote || '';

    // Bonuses checked against the target's armour as this hit lands (e.g. Glimmering Arrows, Hundred-Cut Crescendo,
    // Inscribed Edge: see perHitBonuses)
    for (const b of hit.perHitBonuses || []) {
      const add = evalPerHitBonus(b, currentArmour);
      if (add > 0) {
        hitDmg += add;
        notes = notes ? `${notes}, +${add} ${b.name}` : `+${add} ${b.name}`;
      }
    }

    // 4b. "Each hit dealing damage to armour deals an additional 1 damage" (e.g. Hammer Grip): the ability's damage
    // effect { perHitBonusIfTargetArmoured: N }, checked against the armour left before each hit
    const perArmourHit: any = ((options?.ability?.effects || []) as any[]).find(
      (e) => e.type === 'damage' && typeof e.perHitBonusIfTargetArmoured === 'number'
    );
    if (perArmourHit && currentArmour > 0) {
      hitDmg += perArmourHit.perHitBonusIfTargetArmoured;
      notes = notes ? `${notes}, +${perArmourHit.perHitBonusIfTargetArmoured} (vs armour)` : `+${perArmourHit.perHitBonusIfTargetArmoured} (vs armour)`;
    }

            const bypass = getArmourBypass(hit, options);
    const bypassed = bypass.all ? currentArmour : Math.min(bypass.upTo, currentArmour);
    const effectiveArmour = currentArmour - bypassed; // armour the hit "sees"

    const { finalDamage, reductionNotes } = calculateDamageReduction(
      hitDmg,
      hit.hitIndex,
      hitsToExecute.length,
      effectiveArmour,
      options
    );
    hitDmg = finalDamage;
    if (reductionNotes.length > 0) {
      notes = notes ? `${notes}, ${reductionNotes.join(', ')}` : reductionNotes.join(', ');
    }
    if (damageCap) {
      const capped = Math.max(0, Math.min(hitDmg, damageCap.max - dealtTowardCap));
      if (capped < hitDmg) notes = notes ? `${notes}, capped by ${damageCap.name}` : `capped by ${damageCap.name}`;
      hitDmg = capped;
      dealtTowardCap += hitDmg;
    }

    // Feeding Frenzy:
    // "This unit may attack friendly units. If damage would be dealt to a unit this way, prevent that damage, then that unit heals up to that much damage instead."
    const isFriendlyTarget = Boolean(
      options?.attacker &&
      options?.target &&
      options.attacker.owner === options.target.owner
    );
    const isFeedingFrenzyActive = isFriendlyTarget && hasFeedingFrenzy(options?.attacker);

    if (isFeedingFrenzyActive) {
      const prevCounters = currentCounters;
      currentCounters = Math.max(0, currentCounters - hitDmg);
      const healedThisHit = prevCounters - currentCounters;
      const frenzyNote = `Feeding Frenzy: converted ${hitDmg} damage to healing (healed ${healedThisHit})`;
      notes = notes ? `${notes}, ${frenzyNote}` : frenzyNote;

      hitResults.push({
        hitIndex: hit.hitIndex,
        damage: hitDmg,
        armourAbsorbed: 0,
        hpDamage: 0,
        targetDefeated: false,
        notes: notes || undefined
      });
      continue;
    }

    let armourAbsorbed = 0;
    let hpDamage = 0;

    if (bypass.all) {
      hpDamage = hitDmg;
      notes = notes ? `${notes}, bypassed armour` : 'bypassed armour';
    } else {
      armourAbsorbed = Math.min(effectiveArmour, hitDmg);
      hpDamage = hitDmg - armourAbsorbed;
      if (hit.blockWithoutDepleting) {
        notes = notes ? `${notes}, armour blocked without depleting` : 'armour blocked without depleting';
      } else {
        currentArmour -= armourAbsorbed;
      }
      if (bypassed > 0) {
        notes = notes ? `${notes}, bypassed ${bypassed} armour` : `bypassed ${bypassed} armour`;
      }
    }

    currentCounters += hpDamage;
    // "If this attack would kill a unit, it leaves that unit alive at 1HP instead" (e.g. Green Execution)
    const nonLethal = (options?.ability?.effects || []).some((e: any) => e.type === 'damage' && e.nonLethal);
    if (nonLethal && currentCounters >= targetHp) {
      currentCounters = Math.max(0, targetHp - 1);
      notes = notes ? `${notes}, left at 1HP` : 'left at 1HP';
    }
    const isDefeated = currentCounters >= targetHp;
    // "When this unit breaks the armour of an enemy unit with an attack, that attack hits again for N" (Breaker's
    // Resolve): { type: 'extraHit', amount, if: 'attackBreaksTargetArmour' } on the attacker's passive, once per attack
    if (!isDefeated && armourAbsorbed > 0 && currentArmour === 0 && !armourBreakHitAdded && options?.attacker) {
      for (const p of getUnitPassives(options.attacker)) {
        const eff: any = (p.effects || []).find((e: any) => e.type === 'extraHit' && e.if === 'attackBreaksTargetArmour');
        if (!eff || typeof eff.amount !== 'number') continue;
        armourBreakHitAdded = true;
        queue.push({ hitIndex: queue.length + 1, damage: eff.amount, conditionalNote: p.name, appliedBonuses: [p.id || p.name] });
        notes = notes ? `${notes}, armour broken: ${p.name} hits again` : `armour broken: ${p.name} hits again`;
        break;
      }
    }
    // "If this unit's armour is broken, armour up to N after taking the damage" (e.g. Shell Armour once per attack,
    // Regrowing Armour every time): an armour effect triggered by 'self.armourBroken' (on the passive or the effect)
    if (!isDefeated && armourAbsorbed > 0 && currentArmour === 0) {
      for (const p of getUnitPassives(options?.target)) {
        const eff: any = (p.effects || []).find(
          (e: any) =>
            e.type === 'armour' &&
            typeof e.upTo === 'number' &&
            (e.trigger === 'self.armourBroken' || (!e.trigger && p.trigger === 'self.armourBroken'))
        );
        if (!eff) continue;
        const oncePerAttack = Boolean(eff.limits?.oncePerAttack || (p.limits as any)?.oncePerAttack);
        if (oncePerAttack && shellArmourTriggered) continue;
        currentArmour = Math.max(currentArmour, eff.upTo);
        if (oncePerAttack) shellArmourTriggered = true;
        notes = notes ? `${notes}, ${p.name} re-armours to ${eff.upTo}` : `${p.name} re-armours to ${eff.upTo}`;
        break;
      }
    }
    hitResults.push({
      hitIndex: hit.hitIndex,
      damage: hitDmg,
      armourAbsorbed,
      hpDamage,
      targetDefeated: isDefeated,
      notes: notes || undefined
    });

    if (isDefeated) {
      break;
    }
  }

  return {
    finalArmour: currentArmour,
    finalDamageCounters: currentCounters,
    isDefeated: currentCounters >= targetHp,
    hitResults,
    damageCapKey: damageCap?.key
  };
}

/**
 * A cap on how much this attack can deal to its target (e.g. Shining Supremacy: the first ranged attack against it each
 * turn deals at most 3). Read from { type: 'capDamage', max, from: 'rangedAttack', scope: 'firstRangedAttackEachTurn' };
 * once used, the caller records passiveTurnMarks[key] = this turn on the target (see markDamageCapUsed).
 */
export function getAttackDamageCap(options?: AttackExecutionOptions): { key: string; max: number; name: string } | null {
  const target = options?.target;
  if (!target || !options?.attacker || options.attacker.owner === target.owner) return null;
  const ability = options.ability;
  const distance = options.attackerHex && options.targetHex ? getHexDistance(options.attackerHex, options.targetHex) : 1;
  const isRanged =
    !dealsDamageAsPartOfOwnMovement(ability) &&
    (Boolean(ability?.tags?.includes('ranged')) || distance > 1 || (ability?.range?.[1] ?? 1) > 1);
  for (const p of getUnitPassives(target)) {
    const eff: any = (p.effects || []).find((e: any) => e.type === 'capDamage' && typeof e.max === 'number');
    if (!eff || (eff.from === 'rangedAttack' && !isRanged) || (eff.from === 'meleeAttack' && isRanged)) continue;
    const key = p.id || p.name;
    if (/EachTurn$/.test(eff.scope || '') && target.passiveTurnMarks?.[key] === getCurrentTurnNumber()) continue;
    return { key, max: eff.max, name: p.name };
  }
  return null;
}

/** Records that a damage cap (getAttackDamageCap) was used up this turn. */
export function markDamageCapUsed(unit: BattlefieldUnit, key: string | undefined): BattlefieldUnit {
  if (!key) return unit;
  return { ...unit, passiveTurnMarks: { ...(unit.passiveTurnMarks || {}), [key]: getCurrentTurnNumber() } };
}

/**
 * "This ability deals less damage equal to the number of tiles between this unit and the unit hit. Deals N damage"
 * (e.g. Full Bore): N from a damage amount { formula: 'N - tilesBetweenSelfAndUnitHit' }, or null for other abilities.
 */
export function getFalloffDamageBase(ability: CardAbility | null | undefined): number | null {
  const formula = (ability?.effects?.find((e: any) => e.type === 'damage') as any)?.amount?.formula;
  const m = typeof formula === 'string' ? formula.match(/^\s*(\d+)\s*-\s*tilesBetweenSelfAndUnitHit\s*$/) : null;
  return m ? parseInt(m[1], 10) : null;
}
