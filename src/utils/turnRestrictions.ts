import { CardAbility } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { getSurroundingHexes } from './hexGridMath';
import { getUnitPassives, PASSIVES_REMOVED } from './unitPassives';
import { getApSpent } from './promotedAbilities';
import { getCurrentTurnNumber } from './boardContext';

export const TURN_DENIED = 'turn_denied';
export const MOVE_TAX = 'move_tax';
export const CANNOT_PROMOTE_OR_FUSE = 'cannot_promote_or_fuse';
export const CANNOT_MOVE = 'cannot_move';
// Self-inflicted "cannot move" (e.g. Human Cannonball): lasts until the end of the opponent's next turn
export const CANT_MOVE_SELF = 'cant_move_self';
// "Cannot be targeted by (enemy) react effects" given to itself (e.g. Runic Vanish): lasts until the end of the
// opponent's next turn. Read by isImmuneToReactEffects.
export const IMMUNE_TO_REACT = 'immune_to_react';
// "This unit cannot be targeted during your opponent's next turn" (e.g. Vanish): enemies can't pick it as a target
export const UNTARGETABLE = 'untargetable';
// "Surrounding friendly units may use this unit's armour as their own" (e.g. Battered Shield)
export const SHARES_ARMOUR = 'shares_armour';
// "The target cannot use react effects until the end of your opponent's next turn" (e.g. Jolting Bite)
export const CANNOT_USE_REACTS = 'cannot_use_reacts';
// "...cannot use ranged attacks until the end of your opponent's next turn" (e.g. Blinding Shield)
export const CANNOT_USE_RANGED = 'cannot_use_ranged';
// "...cannot use abilities that cost N or more AP" (e.g. Suffocating Draft): the status is 'cannot_use_cost:N'
const CANNOT_USE_COST_PREFIX = 'cannot_use_cost:';
export const cannotUseCostStatus = (minCost: number) => `${CANNOT_USE_COST_PREFIX}${minCost}`;
// "...cannot use 1AP abilities this turn" (e.g. Suffocation Draught): the status is 'cannot_use_ap:N', for exactly N AP
const CANNOT_USE_EXACT_PREFIX = 'cannot_use_ap:';
export const cannotUseExactCostStatus = (cost: number) => `${CANNOT_USE_EXACT_PREFIX}${cost}`;
// "The target unit gets Passive- Mindless during your opponent's next turn" (e.g. Induce Fear, Horrifying Screech)
export const MINDLESS = 'mindless';
// "...must spend an additional 1AP to use the Universal Draw Action until the end of your opponent's next turn" (e.g. Ear Ringer)
export const DRAW_TAX = 'draw_tax';
// "You cannot choose this unit to take your next turn" (e.g. Overheat Blaster): given on its own turn, so it is pending
// until that turn ends and then works like TURN_DENIED through its controller's next turn
export const SELF_TURN_DENIED_PENDING = 'self_turn_denied_pending';

/** AP costs a unit can't use right now because of an exact-cost status (e.g. Suffocation Draught). */
export function getBarredExactCosts(unit: BattlefieldUnit | null | undefined): number[] {
  return (unit?.statuses || [])
    .filter((s) => s.startsWith(CANNOT_USE_EXACT_PREFIX))
    .map((s) => parseInt(s.slice(CANNOT_USE_EXACT_PREFIX.length), 10))
    .filter((n) => !isNaN(n));
}

/** The lowest AP cost a unit is barred from using right now by a status (e.g. Suffocating Draft), or null. */
export function getBarredMinCost(unit: BattlefieldUnit | null | undefined): number | null {
  let min: number | null = null;
  (unit?.statuses || []).forEach((s) => {
    if (!s.startsWith(CANNOT_USE_COST_PREFIX)) return;
    const n = parseInt(s.slice(CANNOT_USE_COST_PREFIX.length), 10);
    if (!isNaN(n)) min = min === null ? n : Math.min(min, n);
  });
  return min;
}

/** Whether a unit may use its react effects right now (Jolting Bite stops it). */
export function canUseReactEffects(unit: BattlefieldUnit | null | undefined): boolean {
  return !unit?.statuses?.includes(CANNOT_USE_REACTS);
}

const isNextTurnLimitStatus = (s: string) =>
  s === CANNOT_USE_REACTS ||
  s === CANNOT_USE_RANGED ||
  s === MINDLESS ||
  s === DRAW_TAX ||
  s.startsWith(CANNOT_USE_COST_PREFIX) ||
  s.startsWith(CANNOT_USE_EXACT_PREFIX);
/**
 * "The attacker cannot move during your opponent's next turn" (e.g. Trapping Teeth): the attack happens on that turn,
 * so it takes hold right away and lapses when the attacker's turn ends (CANNOT_MOVE).
 */
export function applyCannotMoveThisTurn(unit: BattlefieldUnit): BattlefieldUnit {
  return addStatus(unit, CANNOT_MOVE);
}
// Statuses a unit gives itself on its own turn that last until the end of the opponent's next turn
const SELF_STATUSES_UNTIL_OPPONENT_TURN_END = [CANT_MOVE_SELF, IMMUNE_TO_REACT, UNTARGETABLE, SHARES_ARMOUR];

/**
 * "This unit cannot be knocked back until the start of your next turn" (e.g. Brace for Impact): the same knockback
 * immunity Hold the Gate gives (knockbackImmuneThisTurn), which lapses when a turn of the unit's opponent ends.
 * Read from { type: 'immune', to: 'knockback', target: 'self' } on the ability.
 */
export function applySelfKnockbackImmunity(caster: BattlefieldUnit, ability: CardAbility | null | undefined): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find(
    (e) => e.type === 'immune' && e.to === 'knockback' && e.target === 'self'
  );
  if (!eff) return caster;
  return { ...caster, knockbackImmuneThisTurn: true };
}

/**
 * Statuses an attack leaves on its target until the end of the target's controller's next turn:
 *   { type: 'cannotUseAbilities', target: 'hitUnit', minCost } (e.g. Suffocating Draft),
 *   { type: 'cannotUseReacts', target: 'hitUnit', if?: 'damageDealt' } (e.g. Jolting Bite),
 *   { type: 'cannotUseRangedAttacks', target: 'hitUnit' }.
 * tookDamage says whether this attack dealt the target damage.
 */
export function applyUseLimitStatuses(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined,
  tookDamage: boolean
): BattlefieldUnit {
  let next = target;
  ((ability?.effects || []) as any[]).forEach((e) => {
    if (e.target !== 'hitUnit' && e.target !== 'target') return;
    if (e.if === 'damageDealt' && !tookDamage) return;
    if (e.type === 'cannotUseAbilities' && typeof e.minCost === 'number') next = addStatus(next, cannotUseCostStatus(e.minCost));
    if (e.type === 'cannotUseReacts') next = addStatus(next, CANNOT_USE_REACTS);
    if (e.type === 'cannotUseRangedAttacks') next = addStatus(next, CANNOT_USE_RANGED);
    if (e.type === 'giveMindless') next = addStatus(next, MINDLESS);
  });
  return next;
}

/** Puts a "next turn" use-limit status on a unit (e.g. Blinding Shield on the enemies around it). */
export function addUseLimitStatus(unit: BattlefieldUnit, status: string): BattlefieldUnit {
  return addStatus(unit, status);
}

/** Reusable armour sharing (Battered Shield): reads { type: 'shareArmour', units: 'friendlyUnitsSurroundingSelf' }. */
export function applySelfArmourShare(caster: BattlefieldUnit, ability: CardAbility | null | undefined): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find((e) => e.type === 'shareArmour');
  if (!eff) return caster;
  return addStatus(caster, SHARES_ARMOUR);
}

/**
 * The armour a unit can use when it takes damage: its own, plus that of one surrounding friendly unit sharing its
 * armour (the one with the most). Its own armour is used up first.
 */
export function getUsableArmour(
  units: Record<string, BattlefieldUnit>,
  hex: string
): { own: number; total: number; sharerHex: string | null } {
  const unit = units[hex];
  if (!unit) return { own: 0, total: 0, sharerHex: null };
  let sharerHex: string | null = null;
  for (const h of getSurroundingHexes(hex)) {
    const s = units[h];
    if (s && s.owner === unit.owner && s.armour > 0 && s.statuses?.includes(SHARES_ARMOUR)) {
      if (!sharerHex || s.armour > units[sharerHex].armour) sharerHex = h;
    }
  }
  const shared = sharerHex ? units[sharerHex].armour : 0;
  return { own: unit.armour, total: unit.armour + shared, sharerHex };
}

/**
 * After damage resolved against getUsableArmour's total: returns the unit's own remaining armour, and takes the rest
 * of the armour lost from the sharing unit on the board.
 */
export function settleSharedArmour(
  units: Record<string, BattlefieldUnit>,
  usable: { own: number; total: number; sharerHex: string | null },
  finalArmour: number
): { ownArmour: number; units: Record<string, BattlefieldUnit> } {
  if (!usable.sharerHex) return { ownArmour: finalArmour, units };
  const lost = Math.max(0, usable.total - finalArmour);
  const ownLost = Math.min(usable.own, lost);
  const sharedLost = lost - ownLost;
  const sharer = units[usable.sharerHex];
  if (sharedLost <= 0 || !sharer) return { ownArmour: usable.own - ownLost, units };
  return {
    ownArmour: usable.own - ownLost,
    units: { ...units, [usable.sharerHex]: { ...sharer, armour: Math.max(0, sharer.armour - sharedLost) } }
  };
}

/**
 * Reusable self untargetable status (Vanish): reads { type: 'cannotBeTargeted', target: 'self' } with no "by"
 * (a "by" limits it to some effects, e.g. Runic Vanish's react immunity).
 */
export function applySelfUntargetable(caster: BattlefieldUnit, ability: CardAbility | null | undefined): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find((e) => e.type === 'cannotBeTargeted' && e.target === 'self' && !e.by);
  if (!eff) return caster;
  return addStatus(caster, UNTARGETABLE);
}

/** Whether a unit can't be picked as a target by the given player's abilities right now (e.g. after Vanish). */
export function isUntargetableBy(unit: BattlefieldUnit | null | undefined, player: PlayerId): boolean {
  return Boolean(unit && unit.owner !== player && unit.statuses?.includes(UNTARGETABLE));
}

const addStatus = (unit: BattlefieldUnit, status: string): BattlefieldUnit =>
  unit.statuses?.includes(status) ? unit : { ...unit, statuses: [...(unit.statuses || []), status] };

/**
 * Checks if a unit has the Gravity passive.
 */
export function hasGravityPassive(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some(
    (p) =>
      p.id?.toLowerCase() === 'gravity' ||
      p.name?.toLowerCase().includes('gravity') ||
      p.effects?.some(
        (e: any) =>
          e.type === 'increaseMoveCost' &&
          (e.target === 'enemyUnitsSurroundingSelf' ||
            e.target === 'enemyUnitsStartingTurnSurroundingSelf' ||
            e.target === 'surroundingEnemies')
      )
  );
}

/**
 * Checks if an enemy unit is surrounding a unit with Gravity ("Enemy units that start their turn surrounding this unit
 * must spend an additional 1AP if they choose to move"). Only asked before the unit's first move of its turn, when it is
 * still where it started the turn.
 */
export function isUnitAffectedByGravity(
  unit: BattlefieldUnit | null | undefined,
  unitsOnBoard?: Record<string, BattlefieldUnit>
): boolean {
  if (!unit || !unitsOnBoard) return false;
  let unitHex: string | undefined = unit.hexId;
  if (!unitHex) {
    unitHex = Object.keys(unitsOnBoard).find(
      (h) => unitsOnBoard[h] === unit || unitsOnBoard[h]?.instanceId === unit.instanceId
    );
  }
  if (!unitHex) return false;
  const surroundingHexes = getSurroundingHexes(unitHex);

  for (const surrHex of surroundingHexes) {
    const neighbor = unitsOnBoard[surrHex];
    if (neighbor && neighbor.owner !== unit.owner && hasGravityPassive(neighbor)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a unit currently has the Cold Feet effect on it
 * (either directly via Cold Feet MOVE_TAX status, or from surrounding an enemy unit with Gravity).
 */
export function hasColdFeetEffect(
  unit: BattlefieldUnit | null | undefined,
  unitsOnBoard?: Record<string, BattlefieldUnit>
): boolean {
  if (!unit) return false;
  if (unit.statuses?.includes(MOVE_TAX)) return true;
  return isUnitAffectedByGravity(unit, unitsOnBoard);
}

/**
 * Reusable "your opponent cannot choose this unit to take their next turn" effect (Deadly Arc).
 * Reads a 'denyTurnSelection' effect from the ability's card data. If that effect has
 * if: 'target.tookLastTurn', the mark is only applied when the target was the unit that took
 * its controller's most recent turn.
 */
export function applyTurnDenial(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined,
  lastTurnUnitIds: Record<PlayerId, string | null>
): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find((e) => e.type === 'denyTurnSelection' && e.target !== 'self');
  if (!eff) return target;
  if (eff.if === 'target.tookLastTurn' && lastTurnUnitIds[target.owner] !== target.instanceId) {
    return target;
  }
  return addStatus(target, TURN_DENIED);
}

/**
 * Reusable move tax (Cold Feet): the first universal move the target makes on its next turn
 * costs 1 extra AP. Reads an 'increaseMoveCost' effect aimed at the hit unit.
 */
export function applyMoveTax(target: BattlefieldUnit, ability: CardAbility | null | undefined): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find(
    (e) => e.type === 'increaseMoveCost' && e.target === 'hitUnit'
  );
  if (!eff) return target;
  return addStatus(target, MOVE_TAX);
}

/**
 * Reusable first-action tax (Glacial Bolt, Terrifying Roar): if the unit takes its controller's next turn, its first
 * action costs 1 more AP (read as 1 less starting AP, see getStartingApForTurn). Reads an 'increaseActionCost' effect.
 * on the hit unit (attacks) or the target (non-attack abilities); "if: apSpent==N" needs that much AP spent.
 */
export const ACTION_TAX = 'action_tax';
export function applyActionTax(target: BattlefieldUnit, ability: CardAbility | null | undefined): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find(
    (e) => e.type === 'increaseActionCost' && (e.target === 'hitUnit' || e.target === 'target')
  );
  if (!eff || !ability) return target;
  const apReq = typeof eff.if === 'string' ? eff.if.match(/^apSpent==(\d+)$/) : null;
  if (apReq && getApSpent(ability) !== parseInt(apReq[1], 10)) return target;
  return addStatus(target, ACTION_TAX);
}

/**
 * Reusable cannot be promoted or fused status (Ice Lance):
 * "The target cannot be promoted or fused during your opponent's next turn."
 */
export function applyCannotPromoteOrFuse(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined
): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find(
    (e) => e.type === 'cannotBePromotedOrFused'
  );
  if (!eff && ability?.id !== 'ice_lance') return target;
  return addStatus(target, CANNOT_PROMOTE_OR_FUSE);
}

/**
 * Reusable cannot move status (Pincer Clamp):
 * "The target unit cannot move during its controller's next turn."
 */
export function applyCannotMove(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined,
  caster?: BattlefieldUnit | null
): BattlefieldUnit {
  // 'firstUnitHitByThisAbilityEachTurn' (Detain): the rider is only attached to a provider's first use each turn
  const eff = ((ability?.effects || []) as any[]).find(
    (e) =>
      e.type === 'cannotMove' &&
      (e.target === 'hitUnit' || e.target === 'target' || e.target === 'firstUnitHitByThisAbilityEachTurn')
  );
  if (!eff && ability?.id !== 'pincer_clamp') return target;
  // "When this attack targets the same unit twice in a turn" (e.g. Heartless Clutches): this ability already hit it
  if (eff?.if === 'thisAbilityUsedOnTargetEarlierThisTurn') {
    const earlier = caster?.usedOnTargets?.[String(ability?.baseAbilityId || ability?.id)] || [];
    if (!earlier.includes(target.instanceId)) return target;
  }
  return addStatus(target, CANNOT_MOVE);
}

/**
 * Reusable first-hit reduction (Predictive Strike):
 * "Until the end of your opponent's next turn, the target deals 3 damage less on the first hit if it attacks."
 */
export function applyFirstHitReduction(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined
): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find(
    (e) => e.type === 'reduceDamageDealt' && e.target === 'hitUnit' && e.scope === 'firstHit'
  );
  if (!eff || typeof eff.amount !== 'number') return target;
  return { ...target, firstHitReduction: Math.max(target.firstHitReduction || 0, eff.amount) };
}

/**
 * Reusable self cannot move status (Human Cannonball):
 * "...but it cannot move until the end of your opponent's next turn."
 * Reads a 'cannotMove' effect aimed at the caster.
 */
export function applySelfCannotMove(
  caster: BattlefieldUnit,
  ability: CardAbility | null | undefined
): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find((e) => e.type === 'cannotMove' && e.target === 'self');
  if (!eff) return caster;
  return addStatus(caster, CANT_MOVE_SELF);
}

/**
 * Reusable remove passives status (Silencing Strike):
 * "A unit that took damage from this attack has no passive until the end of your opponent's next turn."
 * Reads a 'removePassives' effect aimed at the damaged unit.
 */
export function applyRemovePassives(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined,
  tookDamage: boolean
): BattlefieldUnit {
  if (!tookDamage) return target;
  const eff = ((ability?.effects || []) as any[]).find(
    (e) => e.type === 'removePassives' && (e.target === 'damagedUnit' || e.target === 'hitUnit' || e.target === 'target')
  );
  if (!eff) return target;
  return addStatus(target, PASSIVES_REMOVED);
}

/** Attacks that cannot be interrupted by react effects, which then do not trigger (e.g. Silencing Strike). */
export function ignoresReactEffects(ability: CardAbility | null | undefined): boolean {
  return Boolean(ability?.effects?.some((e: any) => e.type === 'damage' && e.uninterruptibleByReact));
}

/** Attacks that resolve as written, ignoring every passive without triggering them (e.g. Silencing Strike). */
export function ignoresPassives(ability: CardAbility | null | undefined): boolean {
  return Boolean(ability?.effects?.some((e: any) => e.type === 'damage' && e.ignoresPassives));
}

/**
 * Reusable self react immunity (Runic Vanish):
 * "This unit ... cannot be targeted by enemy react effects until the end of your opponent's next turn."
 */
export function applySelfReactImmunity(
  caster: BattlefieldUnit,
  ability: CardAbility | null | undefined
): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find(
    (e) =>
      e.type === 'cannotBeTargeted' &&
      e.target === 'self' &&
      (e.by === 'enemyReactEffects' || e.by === 'reactEffects' || e.by === 'react')
  );
  if (!eff) return caster;
  return addStatus(caster, IMMUNE_TO_REACT);
}

/** Abilities that put this unit on the target tile (e.g. Shade Step, Vanish, Runic Vanish). */
export function isSelfPlacementAbility(ability: CardAbility | null | undefined): boolean {
  if (!ability) return false;
  if (ability.id === 'shade_step' || ability.id === 'vanish') return true;
  return Boolean(
    ability.effects?.some(
      (e: any) =>
        e.target === 'self' &&
        e.tile === 'target' &&
        // (a move there that ignores units in the way works the same, e.g. Spectral Retreat; it is still a move)
        (e.type === 'place' || (e.type === 'move' && e.ignoreUnitsInWay))
    ) && !ability.effects?.some((e: any) => e.type === 'damage')
  );
}

/** "Place this unit on the tile behind the target" with no damage (e.g. Shadow Emergence): { type: 'place', tile: 'tileBehindTarget' }. */
export function isPlaceBehindTargetAbility(ability: CardAbility | null | undefined): boolean {
  return Boolean(
    ability?.effects?.some((e: any) => e.type === 'place' && e.target === 'self' && e.tile === 'tileBehindTarget') &&
      !ability?.effects?.some((e: any) => e.type === 'damage')
  );
}

/** Message shown when a unit's Move action is blocked. */
export function getMoveBlockedMessage(unit: BattlefieldUnit): string {
  if (unit.statuses?.includes(CANNOT_MOVE)) return "Can't move: this unit cannot use the Move action this turn.";
  if (unit.statuses?.includes(CANT_MOVE_SELF)) return "Can't move: This unit cannot use the Move action until the end of your opponent's next turn.";
  return `${unit.card.name} cannot move.`;
}

/**
 * Checks if a unit's Universal Move action is disabled
 * (Pincer Clamp, self cannot move, walls, immobile tokens, cannotMove passives).
 */
export function isUnitMovementDisabled(
  unit: BattlefieldUnit | null | undefined
): boolean {
  if (!unit) return false;
  if (unit.statuses?.includes(CANNOT_MOVE) || unit.statuses?.includes(CANT_MOVE_SELF)) return true;
  if (unit.card.isWall) return true;
  const passives = getUnitPassives(unit);
  if (passives.some((p) => p.effects?.some((e: any) => e.type === 'cannotMove'))) return true;
  if (unit.card.id === 'raging_bonfire' || unit.card.id === 'obstructing_wall') return true;
  return false;
}

/**
 * Reusable "if the target takes the next turn, it takes N damage" (Flame Blast). Reads a 'delayedDamage' effect with
 * when: 'targetTakesNextTurn'. A 'firstUnitHitByThisAbilityEachTurn' target only counts on the ability's first use
 * this turn (a provider's later uses already drop that rider). Doesn't stack: the larger amount stays.
 */
export function applyDamageOnTakingTurn(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined,
  caster?: BattlefieldUnit | null
): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find(
    (e) => e.type === 'delayedDamage' && e.when === 'targetTakesNextTurn' && typeof e.amount === 'number'
  );
  if (!eff || !ability) return target;
  if (eff.target === 'firstUnitHitByThisAbilityEachTurn' && caster && !ability.parentAbilityId) {
    const key = ability.baseAbilityId || ability.id;
    if ((caster.usedTurnCounts?.[key] || 0) > 0) return target;
  }
  return { ...target, damageOnTakingTurn: Math.max(target.damageOnTakingTurn || 0, eff.amount) };
}

/**
 * "Until the end of the turn, this unit's attacks against the target deal an additional N damage per hit. If the
 * target dies this turn, heal up to M damage from this unit" (e.g. Parasitic Enzyme): { type: 'markTarget',
 * target: 'hitUnit', bonusPerHit, healSelfIfTargetDies? }. Read by the attack bonuses and the destroy triggers.
 */
export function applyAttackerMark(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined,
  caster?: BattlefieldUnit | null
): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find((e) => e.type === 'markTarget' && typeof e.bonusPerHit === 'number');
  if (!eff || !caster || caster.instanceId === target.instanceId) return target;
  return {
    ...target,
    attackerMark: {
      casterInstanceId: caster.instanceId,
      bonusPerHit: eff.bonusPerHit,
      turn: getCurrentTurnNumber(),
      sourceName: ability?.name || 'Mark',
      ...(typeof eff.healSelfIfTargetDies === 'number' ? { healCasterOnDeath: eff.healSelfIfTargetDies } : {})
    }
  };
}

/**
 * "Until the end of your opponent's next turn, if the target moves, after the move, this unit moves in the same
 * direction for free unless the tile it would land on is occupied" (e.g. Lock-Step): { type: 'lockStep',
 * target: 'hitUnit' }. The move triggers read it (see App applyMoveTriggers).
 */
export function applyLockStep(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined,
  caster?: BattlefieldUnit | null
): BattlefieldUnit {
  const eff = ((ability?.effects || []) as any[]).find((e) => e.type === 'lockStep');
  if (!eff || !caster || caster.instanceId === target.instanceId) return target;
  return { ...target, lockStepBy: caster.instanceId };
}

/** One call for every status an ability can leave on the unit it hits. Add new ones here. */
export function applyAbilityStatuses(
  target: BattlefieldUnit,
  ability: CardAbility | null | undefined,
  lastTurnUnitIds: Record<PlayerId, string | null>,
  caster?: BattlefieldUnit | null
): BattlefieldUnit {
  return applyLockStep(applyAttackerMark(applyDamageOnTakingTurn(applyFirstHitReduction(
    applyCannotMove(
      applyCannotPromoteOrFuse(
        applyMoveTax(applyActionTax(applyTurnDenial(target, ability, lastTurnUnitIds), ability), ability),
        ability
      ),
      ability,
      caster
    ),
    ability
  ), ability, caster), ability, caster), ability, caster);
}

/** AP cost of the universal move action for this unit right now. */
export function getUniversalMoveCost(
  unit: BattlefieldUnit,
  unitsOnBoard?: Record<string, BattlefieldUnit>
): number {
  if (unit.movedThisTurn) return 1;
  return 1 + (hasColdFeetEffect(unit, unitsOnBoard) ? 1 : 0);
}

/**
 * A marked unit cannot be chosen to take a turn unless its controller has no other
 * non-token unit to choose.
 */
export function canChooseUnitForTurn(
  unit: BattlefieldUnit,
  units: Record<string, BattlefieldUnit>,
  player: PlayerId
): { allowed: boolean; reason?: string } {
  if (!unit.statuses?.includes(TURN_DENIED)) return { allowed: true };
  const hasOther = Object.values(units).some(
    (u) => u.owner === player && u.instanceId !== unit.instanceId && !u.card.isWall && u.card.type !== 'token'
  );
  if (!hasOther) return { allowed: true };
  return {
    allowed: false,
    reason: `${unit.card.name} cannot be chosen to take this turn. Choose a different non-token unit.`
  };
}

/** Call when a player's turn ends: their units' "next turn" restrictions have now lapsed. */
export function expireTurnRestrictions(
  units: Record<string, BattlefieldUnit>,
  player: PlayerId
): Record<string, BattlefieldUnit> {
  let changed = false;
  const next = { ...units };
  for (const [hex, u] of Object.entries(units)) {
    // Self-given statuses (cannot move, react immunity) lapse when the opponent's turn ends (the one after they were applied)
    if (u.owner !== player && u.statuses?.some((s) => SELF_STATUSES_UNTIL_OPPONENT_TURN_END.includes(s))) {
      next[hex] = { ...u, statuses: u.statuses.filter((s) => !SELF_STATUSES_UNTIL_OPPONENT_TURN_END.includes(s)) };
      changed = true;
      continue;
    }
    // First-hit reduction (Predictive Strike) lapses when its owner's turn ends
    if (u.owner === player && u.firstHitReduction) {
      next[hex] = { ...(next[hex] || u), firstHitReduction: undefined };
      changed = true;
    }
    // "If it takes the next turn" (Flame Blast) lapses once its controller's turn ends
    if (u.owner === player && u.damageOnTakingTurn) {
      next[hex] = { ...(next[hex] || u), damageOnTakingTurn: undefined };
      changed = true;
    }
    if (
      u.owner === player &&
      (u.statuses?.includes(TURN_DENIED) ||
        u.statuses?.includes(MOVE_TAX) ||
        u.statuses?.includes(ACTION_TAX) ||
        u.statuses?.includes(CANNOT_PROMOTE_OR_FUSE) ||
        u.statuses?.includes(CANNOT_MOVE) ||
        u.statuses?.includes(PASSIVES_REMOVED) ||
        u.statuses?.some(isNextTurnLimitStatus))
    ) {
      next[hex] = {
        ...(next[hex] || u),
        statuses: u.statuses.filter(
          (s) =>
            s !== TURN_DENIED &&
            s !== MOVE_TAX &&
            s !== ACTION_TAX &&
            s !== CANNOT_PROMOTE_OR_FUSE &&
            s !== CANNOT_MOVE &&
            s !== PASSIVES_REMOVED &&
            !isNextTurnLimitStatus(s)
        )
      };
      changed = true;
    }
  }
  // A self turn denial given this turn (e.g. Overheat Blaster) now applies to its controller's next turn
  Object.entries(next).forEach(([hex, u]) => {
    if (u.owner !== player || !u.statuses?.includes(SELF_TURN_DENIED_PENDING)) return;
    next[hex] = { ...u, statuses: [...u.statuses.filter((s) => s !== SELF_TURN_DENIED_PENDING), TURN_DENIED] };
    changed = true;
  });
  return expireLockedAbilities(changed ? next : units, player);
}

/**
 * Decrements and expires ability locks (such as Overload Gemstone:
 * "During your next turn, this unit can't use this ability") when the player's turn ends.
 */
export function expireLockedAbilities(
  units: Record<string, BattlefieldUnit>,
  player: PlayerId
): Record<string, BattlefieldUnit> {
  let changed = false;
  const next = { ...units };
  for (const [hex, u] of Object.entries(units)) {
    if (u.lockedAbilities) {
      const nextLocked: Record<string, { abilityId: string; sourceAbilityName?: string; lockedForPlayer: PlayerId; turnsRemaining: number }> = {};
      let unitChanged = false;
      for (const [key, record] of Object.entries(u.lockedAbilities)) {
        if (record.lockedForPlayer === player) {
          const remaining = record.turnsRemaining - 1;
          if (remaining > 0) {
            nextLocked[key] = { ...record, turnsRemaining: remaining };
          } else {
            unitChanged = true;
          }
        } else {
          nextLocked[key] = record;
        }
      }
      if (unitChanged || Object.keys(nextLocked).length !== Object.keys(u.lockedAbilities).length) {
        next[hex] = {
          ...u,
          lockedAbilities: Object.keys(nextLocked).length > 0 ? nextLocked : undefined
        };
        changed = true;
      }
    }
  }
  return changed ? next : units;
}
