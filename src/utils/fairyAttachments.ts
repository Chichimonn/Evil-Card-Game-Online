import { CardItem, CardPassive } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import { PASSIVES_REMOVED, PASSIVES_REMOVED_THIS_TURN } from './unitPassives';

/**
 * Attaching (the fairies' Harmony passives): "If this unit has no cards under it, it may attach to a friendly unit with
 * [requirement]. While this card is attached to a unit, [bonus]. This effect does not stack."
 *
 * Card data: a passive with { type: 'attach', if: 'self.hasNoCardsUnder', requires, stacks: false, whileAttached: [...] }.
 * A unit with such a passive attaches by moving onto a friendly unit's tile (the Move action, or any other move that
 * ends there, e.g. Fairy Flutter). It always attaches; the bonus only applies while the unit it is attached to meets
 * `requires`:
 *   { promotedCards: { exactly: N } }                                   exactly N cards under it
 *   { promotedCards: { exactly: 2, differentTypes: true } }             ...that share no class tag
 *   { promotedCards: { exactly: 2, sameTypeOrSharedNameWord: true } }   ...that share a class tag or a word in their names
 *   { tribute: N }                                                      a Tribute N card
 * The attached card leaves play and rides on the unit (unit.attachedCards); it goes to the graveyard when that unit
 * leaves play, and stays with it when it is promoted or fused.
 *
 * Bonuses (whileAttached effects), each applied once per unit however many copies are attached:
 *   setAp         { amount: { printedApPlus: 1 } }   its AP for a turn it takes is its printed AP + 1
 *   repeatAttack  { appliesTo: { attackCost: 1 }, modifiers: [{ scope: 'firstHit', addAmount: -2, minAmount: 1 }] }
 *                 once a turn, after a 1AP attack, a free use of that attack again (first hit weaker)
 *   place         once each of its turns, place itself on an empty surrounding tile for free
 *   modifyMaxHp   { amount: 6 }                      it has 6 more HP
 *   draw          { amount: 1, trigger: 'attachedUnit.killsEnemyNonToken' }  once each of its turns
 *   heal          { amount: 1, trigger: 'ownerTurnEnd' }   if damaged and not healed this turn
 *   scry          { amount: 1, trigger: 'ownerTurnStart' } look at the top card; you may put it on the bottom
 */

export interface AttachBonus {
  effect: any;
  // The passive granting it (e.g. "Galvanic Harmony") and the attached card (e.g. "Catalytic Fairy")
  passive: CardPassive;
  card: CardItem;
  key: string;
}

/** The attach effect on a card's passives, if it has one. */
export function getAttachPassive(card: CardItem | null | undefined): { passive: CardPassive; effect: any } | null {
  for (const p of card?.passives || []) {
    const effect: any = (p.effects || []).find((e: any) => e.type === 'attach');
    if (effect) return { passive: p, effect };
  }
  return null;
}

/** Cards under a unit: its promoted cards, plus an engulfed unit (which counts as its promoted unit). */
export function getCardsUnder(unit: BattlefieldUnit): CardItem[] {
  return [...(unit.promotedCards || []), ...(unit.engulfedCard ? [unit.engulfedCard] : [])];
}

/**
 * Whether `mover` attaches to `target` by moving onto its tile: the mover has an attach passive (not switched off),
 * no cards under it, and the target is another friendly unit (not a wall).
 */
export function canAttachOnto(mover: BattlefieldUnit | null | undefined, target: BattlefieldUnit | null | undefined): boolean {
  if (!mover || !target || mover.instanceId === target.instanceId) return false;
  if (mover.owner !== target.owner || target.card.isWall) return false;
  if (mover.statuses?.includes(PASSIVES_REMOVED) || mover.statuses?.includes(PASSIVES_REMOVED_THIS_TURN)) return false;
  const attach = getAttachPassive(mover.card);
  if (!attach) return false;
  if (getCardsUnder(mover).length > 0 || (mover.attachedCards || []).length > 0 || mover.carriedUnit) return false;
  return true;
}

/**
 * Moves the unit on `moverHex` onto the unit on `targetHex` as an attached card. Returns the new board (the mover is
 * out of play).
 */
export function attachUnitOnto(
  board: Record<string, BattlefieldUnit>,
  moverHex: string,
  targetHex: string
): Record<string, BattlefieldUnit> {
  const mover = board[moverHex];
  const target = board[targetHex];
  if (!canAttachOnto(mover, target)) return board;
  const next = { ...board };
  delete next[moverHex];
  next[targetHex] = { ...target, attachedCards: [...(target.attachedCards || []), mover.card] };
  return next;
}

const NAME_STOP_WORDS = new Set(['of', 'the', 'a', 'an', 'and']);
const nameWords = (card: CardItem) =>
  new Set(
    card.name
      .toLowerCase()
      .split(/[^a-z0-9']+/)
      .filter((w) => w && !NAME_STOP_WORDS.has(w))
  );
const tags = (card: CardItem) => new Set((card.classTags || []).map((t) => t.toLowerCase()));
const shareAny = (a: Set<string>, b: Set<string>) => [...a].some((x) => b.has(x));

/** Whether `unit` meets an attach requirement (see the module comment). */
export function meetsAttachRequirement(unit: BattlefieldUnit, requires: any): boolean {
  if (!requires) return true;
  if (typeof requires.tribute === 'number') {
    if (unit.card.reinforce?.mode !== 'tribute' || (unit.card.reinforce.count ?? 0) !== requires.tribute) return false;
  }
  const pc = requires.promotedCards;
  if (pc) {
    const under = getCardsUnder(unit);
    if (typeof pc.exactly === 'number' && under.length !== pc.exactly) return false;
    // Every pair of cards under it: "of different types" shares no class tag; "of the same type or have a word in
    // common in their names" shares one or the other
    for (let i = 0; i < under.length; i++) {
      for (let j = i + 1; j < under.length; j++) {
        const sameType = shareAny(tags(under[i]), tags(under[j]));
        if (pc.differentTypes && sameType) return false;
        if (pc.sameTypeOrSharedNameWord && !sameType && !shareAny(nameWords(under[i]), nameWords(under[j]))) return false;
      }
    }
  }
  return true;
}

/**
 * The bonuses an attached card currently gives `unit`: only while it meets that card's requirement, once per
 * passive however many copies are attached ("This effect does not stack"), and none while its passives are off.
 */
export function getAttachBonuses(unit: BattlefieldUnit | null | undefined, type?: string): AttachBonus[] {
  if (!unit || !unit.attachedCards?.length) return [];
  if (unit.statuses?.includes(PASSIVES_REMOVED) || unit.statuses?.includes(PASSIVES_REMOVED_THIS_TURN)) return [];
  const out: AttachBonus[] = [];
  const seen = new Set<string>();
  unit.attachedCards.forEach((card) => {
    const attach = getAttachPassive(card);
    if (!attach) return;
    const key = attach.passive.id || attach.passive.name;
    if (seen.has(key)) return;
    seen.add(key);
    if (!meetsAttachRequirement(unit, attach.effect.requires)) return;
    (attach.effect.whileAttached || []).forEach((effect: any) => {
      if (!type || effect.type === type) out.push({ effect, passive: attach.passive, card, key });
    });
  });
  return out;
}

/** Each attached card on `unit`, with whether its bonus applies right now (for display). */
export function describeAttachments(unit: BattlefieldUnit | null | undefined): { card: CardItem; passive: CardPassive | null; active: boolean }[] {
  if (!unit?.attachedCards?.length) return [];
  const active = new Set(getAttachBonuses(unit).map((b) => b.key));
  const seen = new Set<string>();
  return unit.attachedCards.map((card) => {
    const attach = getAttachPassive(card);
    const key = attach ? attach.passive.id || attach.passive.name : card.id;
    // A second copy of the same passive gives nothing ("does not stack")
    const isActive = active.has(key) && !seen.has(key);
    seen.add(key);
    return { card, passive: attach?.passive || null, active: isActive };
  });
}

/** Extra max HP from attached cards (e.g. Fortifying Harmony). */
export function getAttachMaxHpBonus(unit: BattlefieldUnit | null | undefined): number {
  return getAttachBonuses(unit, 'modifyMaxHp').reduce((sum, b) => sum + (typeof b.effect.amount === 'number' ? b.effect.amount : 0), 0);
}

/** "That unit's AP is set to 1 more than the AP printed on that unit when it takes a turn" (e.g. Galvanic Harmony). */
export function getAttachTurnAp(unit: BattlefieldUnit, printedAp: number): { ap: number; source: string } | null {
  const b = getAttachBonuses(unit, 'setAp')[0];
  if (!b) return null;
  const plus = typeof b.effect.amount?.printedApPlus === 'number' ? b.effect.amount.printedApPlus : 0;
  return { ap: printedAp + plus, source: b.passive.name };
}
