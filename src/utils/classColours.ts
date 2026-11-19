import type { CSSProperties } from 'react';
import { CardItem } from '../types/card';

/**
 * Each class's colour on a card face: a dark shade of a hue on the rainbow, different enough from its neighbours to tell
 * apart (neighbouring hues also alternate lighter and darker), dark enough that white text reads over it (the top half
 * of the name sits on it). It is the card's border: the edge all the way round the face. Everything read on the card
 * (the bar behind the name and type line, the passive and ability boxes) is one dark surface, CARD_SURFACE_COLOUR, on
 * every card.
 *
 * A card of several classes (e.g. Flaming Mage) isn't one mixed colour: it fades from one class's colour to the
 * other's across the card, left to right. A card with no class tag takes the classes its reinforce requirement names (Promote a Knight,
 * Fusion: 2 Mages and/or Fighters, Tribute 2: At least 1 Flaming); a card with none of those has a plain grey border.
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
// The border of a card with no class (a grey a step lighter than the surface, so the edge still reads as one)
export const NEUTRAL_CARD_COLOUR = '#44403c';

/**
 * The one dark surface of everything read on a card face: the name bar and every passive's and ability's box. The same
 * colour as the app's top bar.
 */
export const CARD_SURFACE_COLOUR = '#2f2829';

/** The off-black at a card's edges, that its colour fades in from (see getCardFill). */
export const CARD_EDGE_COLOUR = '#1c1917';
export const CARD_SURFACE_FILL: CSSProperties = { backgroundColor: CARD_SURFACE_COLOUR };

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

/**
 * How far in (card pixels: the face is 750 wide) a single colour fades from the off-black at the card's edges (the
 * CARD_EDGE_COLOUR) to its full colour.
 */
export const CARD_EDGE_FADE = 80;

/**
 * Which edges of the area being filled are the card's own edges, so fade in from black there. A card face: all four.
 * Something carrying the card on below it (the big card's extra actions): the sides and bottom, not the top, so it
 * continues the face seamlessly. Something laid over the card (none): the colour alone.
 */
export type CardFillEdges = { top?: boolean; bottom?: boolean; sides?: boolean };

/**
 * The card's border as CSS: what's behind everything read on the card. It fades inward from the off-black at the card's
 * edges (CARD_EDGE_FADE) to its colour: a single colour (a class's, or the grey of a card with no class), or for a card
 * of several classes, the fade across the card, left to right, between its classes' colours (the edge fade laid over it).
 */
export function getCardFill(card: CardItem, edges: CardFillEdges = { top: true, bottom: true, sides: true }): CSSProperties {
  const colours = getColourClasses(card).map((c) => CLASS_COLOURS[c]);
  const f = CARD_EDGE_FADE;
  // The edge fade (on top), then the classes' fade across the card when it has several (under it)
  const layers = [
    edges.sides && `linear-gradient(to right, ${CARD_EDGE_COLOUR} 0px, transparent ${f}px, transparent calc(100% - ${f}px), ${CARD_EDGE_COLOUR} 100%)`,
    edges.top && `linear-gradient(to bottom, ${CARD_EDGE_COLOUR} 0px, transparent ${f}px)`,
    edges.bottom && `linear-gradient(to top, ${CARD_EDGE_COLOUR} 0px, transparent ${f}px)`,
    colours.length > 1 && `linear-gradient(to right, ${colours.join(', ')})`
  ].filter(Boolean);
  const base = colours[0] || NEUTRAL_CARD_COLOUR;
  return layers.length ? { backgroundColor: base, backgroundImage: layers.join(', ') } : { backgroundColor: base };
}
