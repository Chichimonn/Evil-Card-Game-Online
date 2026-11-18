import { CardItem } from '../types/card';
import { BattlefieldUnit, PlayerId } from '../types/game';
import { unitMatchesRequirement } from '../utils/reinforceRules';
import { getHexDistance } from '../utils/hexGridMath';

/**
 * Endless (singleplayer): a horde mode against a computer opponent.
 *
 * - The player brings a deck; the computer has no hand or deck and never uses cards.
 * - Each wave, the computer puts units into play on its home row. When every one of them is gone, the next wave comes.
 * - Waves 1-10 have a Threat Level of 2, waves 11-20 a Threat Level of 3, and so on. A unit's cost is the number of cards
 *   that go into it: a basic unit 1, a promoted unit 2, a Fusion N or Tribute N unit N + 1. A wave spends its whole Threat
 *   Level, one unit at a time (the most expensive units it can afford are the most likely).
 * - Every 10 waves the player's board, hand and graveyard are shuffled back into their deck, and a new starting phase
 *   (setup) begins.
 * - When a wave comes in, the player's units on the computer's half of the board are placed on the empty tile on their
 *   own half closest to where they are.
 */

export const ENDLESS_PLAYER: PlayerId = 'player1';
export const ENDLESS_CPU: PlayerId = 'player2';
export const WAVES_PER_ROUND = 10;

/** Units the computer never fields: their strength is drawing and handling cards, which it doesn't have. */
export const CPU_EXCLUDED_UNITS = new Set<string>([
  'archivist_sage',
  'blood_sage',
  'fateweaver_sage',
  'lunar_sage',
  'surveying_sage',
  'skeleton_sage',
  'conflict_correspondent',
  'grandfather_mystic' // Grandfather Oracle
]);

/** The Threat Level for a wave (waves are numbered from 1): the cost of the units it brings, starting at 2. */
export const waveBudget = (wave: number): number => Math.floor((wave - 1) / WAVES_PER_ROUND) + 2;

/** Whether this wave is the first of a new round of 10 (after the first), when the player's board is reset. */
export const startsNewRound = (wave: number): boolean => wave > 1 && (wave - 1) % WAVES_PER_ROUND === 0;

const isBasic = (c: CardItem) => c.basic !== false && (c.basic === true || c.reinforce?.mode === 'basic' || !c.reinforce);

/** How many cards go into a unit (see the module comment). */
export function unitCost(card: CardItem): number {
  const r = card.reinforce;
  if (!r || r.mode === 'basic' || isBasic(card)) return 1;
  if (r.mode === 'promote') return 2;
  if (r.mode === 'fusion') return (r.count || r.requirement?.length || 2) + 1;
  if (r.mode === 'tribute') return (r.count || 2) + 1;
  return 1;
}

/** The units the computer may field: any unit card except tokens, fairies and the card-draw units above. */
export function cpuUnitPool(allCards: CardItem[]): CardItem[] {
  return allCards.filter(
    (c) =>
      c.type !== 'token' &&
      !c.isWall &&
      !CPU_EXCLUDED_UNITS.has(c.id) &&
      !(c.classTags || []).includes('Fairy') &&
      !(c.passives || []).some((p) => (p.effects || []).some((e: any) => e.type === 'attach'))
  );
}

const pick = <T,>(list: T[], random: () => number): T => list[Math.floor(random() * list.length)];

const matchesAny = (card: CardItem, words: string[]) =>
  words.length === 0 || words.some((w) => w === '*' || unitMatchesRequirement({ card } as BattlefieldUnit, w));

/**
 * Random cards under a promoted or fused unit ("Its promotions and fusions get randomly determined inputs when put into
 * play"): for each card it needs, a random basic unit that fits that requirement slot.
 */
export function randomPromotedCards(card: CardItem, basics: CardItem[], random: () => number): CardItem[] {
  const r = card.reinforce;
  if (!r || (r.mode !== 'promote' && r.mode !== 'fusion')) return [];
  const slots = (r.requirement || []) as string[][];
  const count = r.mode === 'promote' ? 1 : r.count || slots.length || 2;
  const out: CardItem[] = [];
  for (let i = 0; i < count; i++) {
    // One slot ("2 Knights", "2 Mages and/or Fighters") covers every card; several ("1 Mage + 1 Plunderer") one each,
    // and any past the listed slots may be any basic unit
    const words = slots.length === 1 ? slots[0] : slots[i] || [];
    const fits = basics.filter((b) => matchesAny(b, words));
    out.push(pick(fits.length ? fits : basics, random));
  }
  return out;
}

/**
 * The units of a wave: spend the Threat Level one unit at a time, each a random affordable unit, favouring the most expensive
 * cost it can afford (so a Threat Level of 2 is one promoted unit, not two basic ones, when it can be).
 */
export function chooseWaveUnits(budget: number, pool: CardItem[], random: () => number): CardItem[] {
  const out: CardItem[] = [];
  let left = budget;
  while (left > 0) {
    const affordable = pool.filter((c) => unitCost(c) <= left);
    if (affordable.length === 0) break;
    const top = Math.max(...affordable.map(unitCost));
    const card = pick(affordable.filter((c) => unitCost(c) === top), random);
    out.push(card);
    left -= unitCost(card);
  }
  return out;
}

export const homeRow = (player: PlayerId): number => (player === 'player1' ? 1 : 6);
const ownHalf = (player: PlayerId, hex: string) => {
  const row = parseInt(hex.slice(1), 10);
  return player === 'player1' ? row <= 3 : row >= 4;
};
const ALL_HEXES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].flatMap((c) => [1, 2, 3, 4, 5, 6].map((r) => `${c}${r}`));

/**
 * The empty tiles of a player's home row, in a random order, for a wave to be placed on.
 */
export function freeHomeRowHexes(player: PlayerId, board: Record<string, BattlefieldUnit>, random: () => number): string[] {
  const row = homeRow(player);
  const free = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((c) => `${c}${row}`).filter((h) => !board[h]);
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free;
}

/**
 * Places every unit of `player` that is on the other half of the board on the empty tile of its own half closest to
 * where it is (a place, not a move). Units the furthest in are placed first. Returns the new board and what moved.
 */
export function pullBackToOwnHalf(
  board: Record<string, BattlefieldUnit>,
  player: PlayerId
): { board: Record<string, BattlefieldUnit>; moved: { name: string; from: string; to: string }[] } {
  const next = { ...board };
  const moved: { name: string; from: string; to: string }[] = [];
  const intruders = Object.keys(next)
    .filter((h) => next[h].owner === player && !ownHalf(player, h))
    .sort((a, b) => Math.abs(parseInt(b.slice(1), 10) - homeRow(player)) - Math.abs(parseInt(a.slice(1), 10) - homeRow(player)));
  intruders.forEach((from) => {
    const free = ALL_HEXES.filter((h) => ownHalf(player, h) && !next[h]);
    if (free.length === 0) return;
    const to = free.reduce((best, h) => (getHexDistance(from, h) < getHexDistance(from, best) ? h : best), free[0]);
    const u = next[from];
    delete next[from];
    next[to] = { ...u, hexId: to };
    moved.push({ name: u.card.name, from, to });
  });
  return { board: next, moved };
}
