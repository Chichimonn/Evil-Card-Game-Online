import { BattlefieldUnit, PlayerId } from '../types/game';
import { CardPassive } from '../types/card';
import { getHexDistance } from './hexGridMath';

/**
 * Returns the effective active passives on a unit.
 * Promoted and fused units do NOT inherit passives from the cards under them.
 * The exception is Faceless King, which may carry a single chosenPassive permanently
 * selected by the player from among its promoted cards (Perfect Synthesis).
 */
/** Status: this unit has no passives (e.g. hit by Silencing Strike). Expires when its owner's turn ends. */
export const PASSIVES_REMOVED = 'passives_removed';
// "That unit's passives have no effect this turn" (e.g. Posthumous Prerogative): cleared when the turn ends
export const PASSIVES_REMOVED_THIS_TURN = 'passives_removed_this_turn';

// Units whose passives are switched off while an attack that ignores passives resolves (e.g. Silencing Strike).
// Kept until the App clears it after that attack's state updates have been applied.
const passiveSuppression = new Set<string>();

export function suppressPassivesFor(instanceIds: string[]) {
  instanceIds.forEach((id) => passiveSuppression.add(id));
}

export function clearPassiveSuppression() {
  passiveSuppression.clear();
}

export const hasPassiveSuppression = () => passiveSuppression.size > 0;

export function getUnitPassives(unit: BattlefieldUnit | null | undefined): CardPassive[] {
  if (!unit) return [];
  if (unit.statuses?.includes(PASSIVES_REMOVED) || unit.statuses?.includes(PASSIVES_REMOVED_THIS_TURN) || passiveSuppression.has(unit.instanceId)) return [];
  const basePassives = unit.card.passives || [];
  if (unit.chosenPassive) {
    return [...basePassives, unit.chosenPassive];
  }
  return basePassives;
}

/**
 * Checks if a unit has the "Mindless" passive, which prevents it from
 * using the draw action on its turn.
 */
export function isUnitMindless(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  // Given Mindless for a while (e.g. Induce Fear)
  if (unit.statuses?.includes('mindless')) return true;
  const passives = getUnitPassives(unit);
  return passives.some(
    (p) =>
      p.id?.toLowerCase() === 'mindless' ||
      p.name?.toLowerCase() === 'mindless' ||
      p.effects?.some(
        (e: any) =>
          e.type === 'cannotUse' &&
          (e.action === 'universalDrawAction' || e.action === 'draw' || e.action === 'drawAction')
      )
  );
}

/**
 * Checks if a unit has the "Feeding Frenzy" passive (or an equivalent passive)
 * that allows attacking friendly units and converts damage dealt to them into healing.
 */
export function hasFeedingFrenzy(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some((p) => {
    const id = p.id?.toLowerCase() || '';
    const name = p.name?.toLowerCase() || '';
    if (id === 'feeding_frenzy' || name.includes('feeding frenzy')) return true;
    if (
      p.effects?.some(
        (e: any) =>
          (e.type === 'allowTargeting' && e.targets === 'friendlyUnits') ||
          (e.type === 'replaceDamage' && e.to === 'friendlyUnits')
      )
    ) {
      return true;
    }
    return false;
  });
}

import { isOncePerTurn, getAttacksUsedThisTurn } from './turnLimits';

/**
 * Checks if a passive is the Embedded Press passive (or an equivalent passive)
 * that triggers when an enemy unit takes damage within range of the unit.
 */
export function isEmbeddedPressPassive(passive: CardPassive | null | undefined): boolean {
  if (!passive) return false;
  const id = passive.id?.toLowerCase() || '';
  const name = passive.name?.toLowerCase() || '';
  const trigger = passive.trigger?.toLowerCase() || '';
  if (id === 'embedded_press' || name.includes('embedded press')) return true;
  if (trigger.startsWith('enemyunittakesdamagewithinrange')) return true;
  if (
    passive.text?.toLowerCase().includes('enemy unit takes damage within range') &&
    passive.effects?.some((e: any) => e.type === 'draw')
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts the required range for an Embedded Press style passive.
 * Defaults to 2 if not explicitly specified.
 */
export function getEmbeddedPressRange(passive: CardPassive): number {
  if (passive.trigger) {
    const match = passive.trigger.match(/enemyUnitTakesDamageWithinRange:?(\d+)/i);
    if (match && match[1]) return parseInt(match[1], 10);
  }
  if (passive.text) {
    const match = passive.text.match(/within\s+range\s+(\d+)/i);
    if (match && match[1]) return parseInt(match[1], 10);
  }
  return 2;
}

/**
 * Extracts the draw amount for an Embedded Press style passive.
 * Defaults to 1 if not explicitly specified.
 */
export function getEmbeddedPressDrawAmount(passive: CardPassive): number {
  const drawEffect = passive.effects?.find((e: any) => e.type === 'draw');
  if (drawEffect && typeof drawEffect.amount === 'number') {
    return drawEffect.amount;
  }
  if (passive.text) {
    const match = passive.text.match(/draw\s+(\d+)\s+card/i);
    if (match && match[1]) return parseInt(match[1], 10);
  }
  return 1;
}

/**
 * Checks if a unit has the "Embedded Press" passive.
 */
export function hasEmbeddedPress(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return passives.some(isEmbeddedPressPassive);
}

export interface DamageEvent {
  hexId: string;
  damagedUnitOwner?: PlayerId;
  damageAmount?: number;
  nonAttack?: boolean; // damage not from an attack (self-damage, scorched tiles, passives): "from an attack" passives skip it
}

/**
 * Checks for any units on the board with the Embedded Press passive within range
 * of any enemy unit that took damage, and triggers card draw (once per turn per unit).
 */
export function checkAndTriggerEmbeddedPress(
  events: DamageEvent[],
  unitsOnBoard: Record<string, BattlefieldUnit>,
  drawCard: (player: PlayerId) => void
): { updatedUnits: Record<string, BattlefieldUnit>; triggeredMessages: string[] } {
  let updated = { ...unitsOnBoard };
  const triggeredMessages: string[] = [];

  for (const event of events) {
    if (event.damageAmount !== undefined && event.damageAmount <= 0) continue;

    for (const [pressHex, unit] of Object.entries(updated)) {
      if (!unit) continue;
      const passives = getUnitPassives(unit);
      const pressPassive = passives.find(isEmbeddedPressPassive);
      if (!pressPassive) continue;

      // Identify damaged unit owner
      const damagedOwner = event.damagedUnitOwner || unitsOnBoard[event.hexId]?.owner || updated[event.hexId]?.owner;
      if (!damagedOwner) continue;

      // Must be an enemy unit to the unit with Embedded Press
      if (damagedOwner === unit.owner) continue;

      // Must be within range of the unit with Embedded Press
      const maxRange = getEmbeddedPressRange(pressPassive);
      const dist = getHexDistance(event.hexId, pressHex);
      if (dist < 1 || dist > maxRange) continue;

      // Must not have triggered this turn yet if 1/Turn
      const pKey = pressPassive.id || pressPassive.name || 'embedded_press';
      const usedCount = (unit.usedTurnCounts?.[pKey] || 0) || (unit.usedTurnCounts?.['embedded_press'] || 0);
      if (isOncePerTurn(pressPassive) && usedCount >= 1) continue;

      // Trigger Embedded Press!
      const drawAmount = getEmbeddedPressDrawAmount(pressPassive);
      const nextCounts = {
        ...(unit.usedTurnCounts || {}),
        [pKey]: usedCount + 1,
        embedded_press: (unit.usedTurnCounts?.['embedded_press'] || 0) + 1
      };

      updated[pressHex] = {
        ...unit,
        usedTurnCounts: nextCounts
      };

      for (let i = 0; i < drawAmount; i++) {
        drawCard(unit.owner);
      }

      const passiveTitle = pressPassive.name || 'Embedded Press';
      triggeredMessages.push(
        `📰 ${unit.card.name}'s ${passiveTitle}: drew ${drawAmount} card${drawAmount > 1 ? 's' : ''} (enemy at ${event.hexId} took damage in range ${dist})!`
      );
    }
  }

  return { updatedUnits: updated, triggeredMessages };
}

/**
 * Immunity to scorched tile damage (e.g. Trailblazer: "This unit does not take damage from moving onto or off of
 * scorched tiles"). Read from the passive's { type: 'immune', to: 'scorchedTileDamage' }, so it follows the passive
 * (and is lost while passives are removed), not the unit's name.
 */
export function isImmuneToScorchDamage(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  return getUnitPassives(unit).some((p) =>
    (p.effects || []).some((e: any) => e.type === 'immune' && e.to === 'scorchedTileDamage')
  );
}

/**
 * Immunity to an enemy's non-damage effects (e.g. Machine Heart: "This unit is immune to non-damage effects. If it has
 * taken damage this turn, this passive has no effect until the end of the turn."). Read from
 * { type: 'immune', to: 'nonDamageEffects', unless: 'self.tookDamageThisTurn' }.
 * Callers that resolve damage before an effect pass tookDamageNow so the immunity switches off mid-attack.
 */
export function isImmuneToNonDamageEffects(
  unit: BattlefieldUnit | null | undefined,
  tookDamageNow = false
): boolean {
  if (!unit) return false;
  return getUnitPassives(unit).some((p) =>
    (p.effects || []).some((e: any) => {
      if (e.type !== 'immune' || e.to !== 'nonDamageEffects') return false;
      if (e.unless === 'self.tookDamageThisTurn' && (unit.tookDamageThisTurn || tookDamageNow)) return false;
      return true;
    })
  );
}

/**
 * Healing for the hits of this unit's first attack each turn (e.g. Bloodrush: "The first attack this unit uses each turn
 * heals this unit 1 damage per hit"). Read from { trigger: 'self.attackHits', limits: { firstAttackEachTurn } } passives
 * with a self heal { amount: { perHit } }. "First attack" uses the shared attack counter (getAttacksUsedThisTurn), so
 * every attack path counts. Returns null if it doesn't apply to the attack being made now.
 */
export function getFirstAttackHealPerHit(unit: BattlefieldUnit | null | undefined): { perHit: number; name: string } | null {
  if (!unit) return null;
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.attackHits' || !p.limits?.firstAttackEachTurn) continue;
    const heal: any = (p.effects || []).find((e: any) => e.type === 'heal' && (e.target === 'self' || !e.target));
    const perHit = typeof heal?.amount?.perHit === 'number' ? heal.amount.perHit : 0;
    if (perHit <= 0) continue;
    if (getAttacksUsedThisTurn(unit) > 0) return null;
    return { perHit, name: p.name };
  }
  return null;
}

/**
 * "After this unit does X, its next Y this turn is better" passives (e.g. Perfect Form: an armour ability buffs the next
 * attack by +2 damage per hit; an attack buffs the next armour ability by +1 armour; each once per turn). Read from
 * { trigger: 'self.usesArmourAbility', type: 'buffNextAttack', addDamage: { amount, scope } } and
 * { trigger: 'self.usesAttack', type: 'buffNextArmourAbility', addArmour }. markKey is used with passiveTurnMarks.
 */
export function getNextActionBuffPassives(unit: BattlefieldUnit | null | undefined): {
  afterArmourAbility?: { markKey: string; name: string; amount: number; scope: 'allHits' | 'firstHit' };
  afterAttack?: { markKey: string; name: string; amount: number };
} {
  const result: ReturnType<typeof getNextActionBuffPassives> = {};
  if (!unit) return result;
  getUnitPassives(unit).forEach((p) => {
    const key = p.id || p.name;
    (p.effects || []).forEach((e: any) => {
      if (e.trigger === 'self.usesArmourAbility' && e.type === 'buffNextAttack' && typeof e.addDamage?.amount === 'number') {
        result.afterArmourAbility = {
          markKey: `${key}:afterArmourAbility`,
          name: p.name,
          amount: e.addDamage.amount,
          scope: e.addDamage.scope === 'firstHit' ? 'firstHit' : 'allHits'
        };
      }
      if (e.trigger === 'self.usesAttack' && e.type === 'buffNextArmourAbility' && typeof e.addArmour === 'number') {
        result.afterAttack = { markKey: `${key}:afterAttack`, name: p.name, amount: e.addArmour };
      }
    });
  });
  return result;
}

/**
 * Armour a unit's passives give it whenever it attacks (e.g. Steal Plate: "When this unit attacks, it armours up to 1.
 * If the target was armoured, it armours up to 3 instead."). Read from { trigger: 'self.attacks' } passives with a self
 * armour upTo, and a { if: 'target.wasArmoured', setUpTo } modifier. Returns the highest "up to" that applies.
 */
export function getOnAttackSelfArmour(
  unit: BattlefieldUnit | null | undefined,
  targetWasArmoured: boolean
): { upTo: number; sources: string[] } {
  const result = { upTo: 0, sources: [] as string[] };
  if (!unit) return result;
  getUnitPassives(unit).forEach((p) => {
    // (and 'self.attacksBeforeMovingThisTurn', e.g. Eerie Presence: only while it hasn't moved this turn)
    if (p.trigger !== 'self.attacks' && !(p.trigger === 'self.attacksBeforeMovingThisTurn' && !unit.movedThisTurn)) return;
    (p.effects || []).forEach((e: any) => {
      if (e.type !== 'armour' || (e.target && e.target !== 'self') || typeof e.upTo !== 'number') return;
      let upTo = e.upTo;
      (e.modifiers || []).forEach((m: any) => {
        if (m.if === 'target.wasArmoured' && targetWasArmoured && typeof m.setUpTo === 'number') upTo = m.setUpTo;
      });
      if (upTo > result.upTo) result.upTo = upTo;
      result.sources.push(p.name);
    });
  });
  return result;
}

/**
 * A passive that fires when this unit is targeted, letting its owner look at the top of their deck and maybe gaining
 * armour before the damage (e.g. Preemptive Counter: "The first time each turn this unit is targeted by a melee attack,
 * look at the top card of your deck. You may put it on the bottom. Then, this unit gains 2 armour before taking the damage.").
 * "The first time each turn" (limits.firstTimeEachTurn) is checked against unit.passiveTurnMarks and the current turn number.
 */
export function getTargetedScryPassive(
  unit: BattlefieldUnit | null | undefined,
  isMeleeAttack: boolean,
  turnNumber: number
): { key: string; name: string; lookCount: number; armour: number } | null {
  if (!unit) return null;
  for (const p of getUnitPassives(unit)) {
    const trig = p.trigger || '';
    const fires =
      trig === 'self.targetedByAttack' ||
      (trig === 'self.targetedByMeleeAttack' && isMeleeAttack) ||
      (trig === 'self.targetedByRangedAttack' && !isMeleeAttack);
    if (!fires) continue;
    const look: any = (p.effects || []).find((e: any) => e.type === 'lookTop');
    if (!look) continue;
    const key = p.id || p.name;
    if (p.limits?.firstTimeEachTurn && unit.passiveTurnMarks?.[key] === turnNumber) continue;
    const armourEff: any = (p.effects || []).find((e: any) => e.type === 'armour' && e.target === 'self');
    return {
      key,
      name: p.name,
      lookCount: typeof look.count === 'number' ? look.count : 1,
      armour: armourEff && typeof armourEff.amount === 'number' ? armourEff.amount : 0
    };
  }
  return null;
}

/**
 * Damage a unit deals back to an attacker just for targeting it (e.g. Reflective Armour: "When targeted by a ranged
 * attack, this unit deals 3 damage to the attacker"). Read from passive effects
 * { trigger: 'self.targetedByRangedAttack' | 'self.targetedByMeleeAttack' | 'self.targetedByAttack', type: 'damage', target: 'attacker' }.
 * It is a passive, not a react effect, so react immunity does not stop it (silencing its passives does).
 * 'self.takesDamageFromMeleeAttack' (e.g. Hot to the Touch) only fires when the attack dealt it damage (tookDamage).
 */
export function getTargetedRetaliation(
  unit: BattlefieldUnit | null | undefined,
  isRangedAttack: boolean,
  tookDamage = false,
  opts?: { distance?: number; attacker?: BattlefieldUnit | null; rawFirstHit?: number; armourLost?: number }
): { amount: number; sources: string[] } {
  const result = { amount: 0, sources: [] as string[] };
  if (!unit) return result;
  const distance = opts?.distance ?? (isRangedAttack ? 2 : 1);
  getUnitPassives(unit).forEach((p) => {
    (p.effects || []).forEach((e: any) => {
      // "When damage is prevented this way, deal that much damage to the attacker" (e.g. Shining Scales: 1 less from
      // melee attacks, per attack)
      if (e.type === 'reduceDamage' && e.dealPreventedToAttacker && typeof e.amount === 'number') {
        const applies = (e.from !== 'meleeAttack' || !isRangedAttack) && (e.from !== 'rangedAttack' || isRangedAttack);
        const prevented = Math.min(e.amount, Math.max(0, opts?.rawFirstHit ?? e.amount));
        if (applies && prevented > 0) {
          result.amount += prevented;
          result.sources.push(p.name);
        }
        return;
      }
      // "When damage is dealt to this unit's armour by a melee attack, it deals that much damage back to the attacker"
      // (e.g. Wheel of Blades): { type: 'damage', target: 'attacker', amount: 'armourDamageTaken',
      // trigger: 'self.armourDamagedByMeleeAttack' }
      if (e.type === 'damage' && e.target === 'attacker' && e.amount === 'armourDamageTaken') {
        if ((e.trigger || p.trigger) === 'self.armourDamagedByMeleeAttack' && !isRangedAttack && (opts?.armourLost || 0) > 0) {
          result.amount += opts!.armourLost!;
          result.sources.push(p.name);
        }
        return;
      }
      if (e.type !== 'damage' || e.target !== 'attacker' || typeof e.amount !== 'number') return;
      // A passive that works "as a react effect" (e.g. Blinding Brilliance) doesn't reach an attacker immune to them
      if (e.asReact && ((opts?.attacker && isImmuneToReactEffects(opts.attacker)) || unit.statuses?.includes('cannot_use_reacts'))) return;
      const trig = e.trigger || p.trigger;
      const fires =
        trig === 'self.targetedByAttack' ||
        trig === 'self.targetedByEnemyAttack' ||
        (trig === 'self.targetedByRangedAttack' && isRangedAttack) ||
        (trig === 'self.targetedByMeleeAttack' && !isRangedAttack) ||
        (trig === 'self.takesDamageFromMeleeAttack' && !isRangedAttack && tookDamage) ||
        // "Whenever an enemy unit attacks this unit from range 2 or further" (e.g. Energy Crackle)
        (e.if === 'attackerAtRange2OrMore' && distance >= 2);
      if (!fires) return;
      result.amount += e.amount * (typeof e.hits === 'number' ? e.hits : 1);
      result.sources.push(p.name);
    });
  });
  return result;
}

/**
 * Checks if a unit has the "Nightbound" passive (or an equivalent effect)
 * that prevents it from being targeted by react effects.
 */
export function isImmuneToReactEffects(unit: BattlefieldUnit | null | undefined): boolean {
  if (!unit) return false;
  const passives = getUnitPassives(unit);
  return (
    passives.some(
      (p) =>
        p.id?.toLowerCase() === 'nightbound' ||
        p.name?.toLowerCase() === 'nightbound' ||
        p.text?.toLowerCase().includes('cannot be targeted by react effects') ||
        p.effects?.some(
          (e: any) =>
            e.type === 'cannotBeTargeted' &&
            (e.by === 'reactEffects' || e.by === 'enemyReactEffects' || e.by === 'react')
        )
    ) || Boolean(unit.statuses?.includes('immune_to_react') || unit.statuses?.includes('nightbound'))
  );
}




/**
 * "Whenever this unit draws a card, this unit heals N damage" (e.g. Tapestry of Fate): read from a passive with
 * trigger 'self.draws' and a self heal. Returns the total heal for drawing `cards` cards.
 */
export function getDrawHeal(unit: BattlefieldUnit | null | undefined, cards: number): number {
  if (!unit || cards <= 0) return 0;
  let perCard = 0;
  for (const p of getUnitPassives(unit)) {
    if (p.trigger !== 'self.draws') continue;
    for (const e of (p.effects || []) as any[]) {
      if (e.type === 'heal' && (e.target === 'self' || !e.target) && typeof e.amount === 'number') perCard += e.amount;
    }
  }
  return perCard * cards;
}