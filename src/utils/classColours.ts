import type { CSSProperties } from 'react';
import { CardItem } from '../types/card';

/**
 * Each class's colour on a card face: a dark shade of a hue on the rainbow, dark enough that white text reads easily
 * over it, and different enough from its neighbours to tell apart (neighbouring hues also alternate lighter and
 * darker). It fills the card's text boxes and the bar behind the bottom half of its name and the top half of its type
 * line.
 *
 * A card of several classes (e.g. Flaming Mage) isn't one mixed colour: it fades from one class's colour to the
 * other's across the card, left to right. A card with no class tag takes the classes its reinforce requirement names (Promote a Knight,
 * Fusion: 2 Mages and/or Fighters, Tribute 2: At least 1 Flaming); a card with none of those is plain dark grey.
 */

// The classes in rainbow order: each gets an evenly spaced hue, alternately a little lighter and darker
const CLASS_ORDER = [
  'Fighter', // crimson
  'Flaming', // red
  'Wildcat', // red-orange
  'Plunderer', // orange-brown
  'Lancer', // bronze
  'Solar', // amber
  'Skeleton', // bone yellow
  'Lightning', // yellow
  'Ooze', // chartreuse
  'Plant', // green
  'Drakeling', // emerald
  'Alien', // teal
  'Ghost', // cyan
  'Frozen', // ice blue
  'Nimbus', // sky blue
  'Knight', // steel blue
  'Lunar', // midnight blue
  'Mage', // indigo
  'Assassin', // violet
  'Sage', // purple
  'Fairy' // magenta
];
const START_HUE = 5;
const CHROMA = 0.085;
const LIGHTNESS = [0.27, 0.32];
export const NEUTRAL_CARD_COLOUR = '#1c1917';

const toHex = (L: number, C: number, hue: number): string => {
  const rad = (hue * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
  return (
    '#' +
    lin
      .map((x) => {
        const c = Math.max(0, Math.min(1, x));
        const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
        return Math.round(255 * v).toString(16).padStart(2, '0');
      })
      .join('')
  );
};

/** Each class's colour (computed once). */
export const CLASS_COLOURS: Record<string, string> = Object.fromEntries(
  CLASS_ORDER.map((c, i) => [c, toHex(LIGHTNESS[i % 2], CHROMA, START_HUE + (i * 360) / CLASS_ORDER.length)])
);

/** The classes that colour a card (see the module comment). */
export function getColourClasses(card: CardItem): string[] {
  const known = (words: string[]) => [...new Set(words.filter((w) => w in CLASS_COLOURS))];
  const tagged = known(card.classTags || []);
  if (tagged.length) return tagged;
  return known(((card.reinforce?.requirement || []) as string[][]).flat());
}

/** The card's fill as CSS: its class colour, a gradient across the card between its classes' colours, or dark grey. */
export function getCardFill(card: CardItem): CSSProperties {
  const colours = getColourClasses(card).map((c) => CLASS_COLOURS[c]);
  if (colours.length === 0) return { backgroundColor: NEUTRAL_CARD_COLOUR };
  if (colours.length === 1) return { backgroundColor: colours[0] };
  return { backgroundColor: colours[0], backgroundImage: `linear-gradient(to right, ${colours.join(', ')})` };
}
