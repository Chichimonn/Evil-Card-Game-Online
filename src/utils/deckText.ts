import { CardItem } from '../types/card';
import { resolveCardId } from '../data/cardsData';

/**
 * A deck written as text, for copying out and pasting in (the deck editor's Edit as Text):
 *
 *   Deck: My EVIL Deck
 *   3x Sentinel Knight
 *   2x Garnet Mage
 *
 * The first line names the deck; each other line is a number of copies and a card's name (or id). "x" is optional
 * ("3 Sentinel Knight" works), letter case doesn't matter, and blank lines are skipped.
 */

export const DECK_SIZE = 40;
export const MAX_COPIES = 3;

export function formatDeckText(name: string, entries: { card: CardItem; quantity: number }[]): string {
  return [`Deck: ${name}`, ...entries.map((e) => `${e.quantity}x ${e.card.name}`)].join('\n');
}

export interface ParsedDeck {
  name: string;
  entries: { card: CardItem; quantity: number }[];
  total: number;
  problems: string[]; // why it can't be saved (empty: it can)
}

/** Reads a deck from text, and says what (if anything) stops it from being saved. */
export function parseDeckText(text: string, cards: CardItem[]): ParsedDeck {
  const problems: string[] = [];
  let name = '';
  const counts = new Map<string, number>();
  const byName = new Map(cards.map((c) => [c.name.toLowerCase(), c]));
  const byId = new Map(cards.map((c) => [c.id, c]));

  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const title = line.match(/^deck\s*:\s*(.*)$/i);
    if (title) {
      name = title[1].trim();
      return;
    }
    const m = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (!m) {
      problems.push(`Couldn't read "${line}" (write it like "3x Sentinel Knight").`);
      return;
    }
    const wanted = m[2].trim().toLowerCase();
    const card = byName.get(wanted) || byId.get(resolveCardId(wanted)) || byId.get(wanted);
    if (!card) {
      problems.push(`No card called "${m[2].trim()}".`);
      return;
    }
    counts.set(card.id, (counts.get(card.id) || 0) + parseInt(m[1], 10));
  });

  const entries = [...counts].map(([id, quantity]) => ({ card: byId.get(id)!, quantity }));
  entries.forEach((e) => {
    if (e.quantity > MAX_COPIES) problems.push(`${e.card.name}: ${e.quantity} copies (at most ${MAX_COPIES}).`);
  });
  const total = entries.reduce((sum, e) => sum + e.quantity, 0);
  if (total !== DECK_SIZE) problems.push(`The deck has ${total} cards: it needs exactly ${DECK_SIZE}.`);
  if (!name) problems.push('Name the deck on its first line, like "Deck: My EVIL Deck".');
  return { name, entries, total, problems };
}
