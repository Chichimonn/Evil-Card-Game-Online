import { CardItem } from '../types/card';
import { initialCardsData } from '../data/cardsData';

/**
 * The order cards are listed in (the card gallery, the deck editor):
 *
 * 1. Every unit except fairies; the gallery puts the newest set first (the deck editor doesn't group by set).
 * 2. Within that: basic units, then promotes, then tributes, then fusions; alphabetical within each.
 * 3. Fairies, together, after every other unit (alphabetical among themselves).
 * 4. Tokens last, wherever they're listed.
 */

// The sets in release order: the order they first appear in the card data (it's grouped by set, oldest first)
const SET_RELEASE_ORDER: string[] = [];
initialCardsData.cards.forEach((c) => c.set && !SET_RELEASE_ORDER.includes(c.set) && SET_RELEASE_ORDER.push(c.set));

const isToken = (card: CardItem) => card.type === 'token' || Boolean(card.isWall) || Boolean(card.art?.includes('token'));
const isFairy = (card: CardItem) => Boolean(card.classTags?.some((t) => t.toLowerCase() === 'fairy'));

/** Which block a card is in: other units, then fairies, then tokens. */
export const cardSortGroup = (card: CardItem): number => (isToken(card) ? 2 : isFairy(card) ? 1 : 0);

const KIND_ORDER = ['basic', 'promote', 'tribute', 'fusion'];
/** Basic units first, then promotes, tributes and fusions. */
export const cardKindRank = (card: CardItem): number => {
  if (card.basic === true || card.reinforce?.mode === 'basic' || !card.reinforce) return 0;
  const i = KIND_ORDER.indexOf(card.reinforce.mode);
  return i < 0 ? KIND_ORDER.length : i;
};

// Newest set first; a card with no set (or a set not in the data) after every set
const setRank = (card: CardItem): number => {
  const i = card.set ? SET_RELEASE_ORDER.indexOf(card.set) : -1;
  return i < 0 ? SET_RELEASE_ORDER.length : SET_RELEASE_ORDER.length - 1 - i;
};

/**
 * Compares two cards in the listing order above. bySet: group by set, newest first (the gallery). within: how cards of
 * the same block (and set) are ordered; by default kind, then name.
 */
export function compareCards(
  a: CardItem,
  b: CardItem,
  opts: { bySet?: boolean; within?: (a: CardItem, b: CardItem) => number } = {}
): number {
  const group = cardSortGroup(a) - cardSortGroup(b);
  if (group !== 0) return group;
  // (fairies and tokens aren't split by set)
  if (opts.bySet && cardSortGroup(a) === 0) {
    const set = setRank(a) - setRank(b);
    if (set !== 0) return set;
  }
  if (opts.within) return opts.within(a, b);
  return cardKindRank(a) - cardKindRank(b) || a.name.localeCompare(b.name);
}
