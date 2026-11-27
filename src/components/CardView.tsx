import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { CardItem, CardAbility } from '../types/card';
import { CardArtFallback } from './CardArtFallback';
import { Heart, Zap, ShieldAlert } from 'lucide-react';
import { formatFusionRequirements, formatTributeRequirements } from '../utils/reinforceRules';
import { isStraightLineAbility } from '../utils/hexGridMath';
import { dealsDamageAsPartOfOwnMovement } from '../utils/movementMelee';
import { useProcessedArt } from '../utils/artHalo';
import { TYPE_LINES } from '../data/typeLines';
import { getCardFill, CARD_SURFACE_FILL, type CardFillEdges } from '../utils/classColours';

interface CardViewProps {
  card: CardItem;
  customArtUrl?: string | null;
  frameMode?: 'overlay' | 'css' | 'background';
  scale?: number;
  id?: string;
  extendToFitText?: boolean;
  // Which edges of the face fade in from black (default all four; e.g. the big card leaves out the bottom when its extra
  // actions carry the card on below it)
  fillEdges?: CardFillEdges;
}

const replaceStaticWithPassive = (str: string): string => {
  if (!str) return str;
  return str.replace(/\bStatic\b/g, 'Passive').replace(/\bstatic\b/g, 'passive');
};

const formatCardText = (str: string): string => {
  if (!str) return str;
  let res = replaceStaticWithPassive(str);
  res = res.replace(/\bR:\s*/g, 'Range: ');
  res = res.replace(/\bR(?=\d)/g, 'Range ');
  return res;
};

// Assist and Inspiring abilities stand out in bright colours, on the ability box and on their tag
// box: the look of an ability's box (drawn as a layer behind its text, see BoxFrame); border: its border width in px
const getAbilityHighlight = (ability: CardAbility): { box: string; border: number; tag: Record<string, string> } => {
  const tag = { assist: 'bg-cyan-500', inspiring: 'bg-fuchsia-600' };
  if (ability.tags?.includes('assist')) {
    return { box: 'border-[4px] border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.55)]', border: 4, tag };
  }
  if (ability.tags?.includes('inspiring')) {
    return { box: 'border-[4px] border-fuchsia-500 shadow-[0_0_14px_rgba(217,70,239,0.55)]', border: 4, tag };
  }
  return { box: 'border-2 border-stone-600', border: 2, tag };
};

/**
 * A passive's or ability's box, drawn as a layer behind its text rather than on the box itself, so the first box on a
 * card can start its background part way down (its first line spills over the art; see the fit in CardView). The box
 * keeps a transparent border of the same width, so its text sits exactly where it would.
 */
const BoxFrame: React.FC<{
  className: string;
  fill: React.CSSProperties;
  inset: { top: number; right: number; bottom: number; left: number };
  style?: React.CSSProperties;
}> = ({ className, fill, inset, style }) => (
  <div
    data-box-bg
    aria-hidden
    className={`absolute -z-10 pointer-events-none ${className}`}
    style={{ top: -inset.top, right: -inset.right, bottom: -inset.bottom, left: -inset.left, ...fill, ...style }}
  />
);

/**
 * The outline on all of a card's text (white on its colours and surfaces): a dark stroke drawn under each letter, so it
 * reads over anything behind it. Set once on the card face (every line inherits it) and on anything else drawing card
 * boxes (the big card's extra actions).
 */
export const CARD_TEXT_OUTLINE: React.CSSProperties = { WebkitTextStroke: '7px #0c0a09', paintOrder: 'stroke fill' };

// Gothic serif faces (bundled in src/assets/fonts, declared in index.css): blackletter for names, old-style serif for card text
export const CARD_HEADING_FONT = "'Card Pirata One', 'Cinzel', Georgia, serif";
export const CARD_BODY_FONT = "'Card IM Fell English', Georgia, serif";

/**
 * The background of a card's passive and ability boxes: the card's own colour (or the fade between its classes' colours)
 * with the off-black laid well over it, so only the card's colour shows behind the text (not the art or set
 * background under the first box).
 */
// The tint alone, for boxes drawn on the card's colour outside the card (the big card's extra actions, under it)
export const CARD_BOX_TINT: React.CSSProperties = { backgroundImage: 'linear-gradient(rgba(47, 40, 41, 0.72), rgba(47, 40, 41, 0.72))' };

export const getCardBoxFill = (card: CardItem): React.CSSProperties => {
  const base = getCardFill(card, {});
  const tint = 'linear-gradient(rgba(47, 40, 41, 0.72), rgba(47, 40, 41, 0.72))';
  return { backgroundColor: base.backgroundColor, backgroundImage: base.backgroundImage ? `${tint}, ${base.backgroundImage}` : tint };
};

const CARD_WIDTH = 750;
const CARD_HEIGHT = 1050;
const CARD_PADDING = 24;
// The art keeps at least this much height; the text takes everything else
const MIN_ART_HEIGHT = 300;
// Card text starts as large as this and shrinks only as far as the card needs to fit it,
// after first tightening its spacing (these steps, loosest first; values are in em)
const TEXT_SPACING_STEPS = [
  { lineHeight: '1.15', gap: '0.25em', pad: '0.3em', boxPad: '0.2em' },
  { lineHeight: '1.05', gap: '0.15em', pad: '0.2em', boxPad: '0.1em' },
  { lineHeight: '0.98', gap: '0.08em', pad: '0.12em', boxPad: '0.04em' }
];
const MAX_TEXT_SIZE = 36;
const MIN_TEXT_SIZE = 18;
// The name's size: a name too long for the bar at this size is squeezed sideways to fit it (it stays one line)
const NAME_SIZE = 72;
// The type line's usual size, and a point (in card pixels)
const TYPE_LINE_SIZE = 26;
const POINT = 4 / 3;

const heading: React.CSSProperties = { fontFamily: CARD_HEADING_FONT, fontWeight: 400 };

// The passives' and abilities' text: a point (1.33px) smaller than the text section's fitted size
const BODY_TEXT_STYLE: React.CSSProperties = { fontSize: 'calc(1em - 1.33px)' };

// Numbers are drawn in a plain bold face (the gothic faces' numerals are hard to read), the rest stays as it is
const NUMERAL_STYLE: React.CSSProperties = { fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontWeight: 700 };
const withNumerals = (value: string | number): React.ReactNode =>
  String(value)
    .split(/(\d+)/)
    .map((part, i) => (i % 2 === 1 ? <span key={i} style={NUMERAL_STYLE}>{part}</span> : part));

/**
 * A set's background picture at full size: its set's name as a file in the art folder (e.g. wrath_of_the_elements.webp,
 * made from a .png dropped in by "npm run card-backgrounds"). Used for the battlefield background in matches.
 */
export const getSetBackgroundPath = (card: CardItem): string | null =>
  card.set ? `/assets/art/${card.set.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}.webp` : null;

/**
 * The same picture as drawn behind a card's art: a small copy (about 480p) in art/card-backgrounds, made by
 * "npm run card-backgrounds". Every card face embeds it, so the full-size file made loading slow.
 */
export const getCardBackgroundPath = (card: CardItem): string | null =>
  card.set ? `/assets/art/card-backgrounds/${card.set.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}.webp` : null;

/** The art files a card face tries, in order: the art named after the card's id, else the one its data names. */
export const getCardArtPaths = (card: CardItem): string[] => [
  `/assets/art/${card.id}.png`,
  `/assets/${card.art || `art/${card.id}.png`}`
];

/**
 * Lines up the boxes drawn inside root (passives' and abilities', marked data-box): each box's colour and ring start at
 * the middle of its first line of tags, so the ring's top edge runs through the centre of the cost and tag chips and the
 * top half of the name line sits on what's behind the box (outlined to read there). The card face does this for its own
 * boxes; anything else drawing card boxes (the big card's extra actions, see FocusCardPanel) does it for its own.
 */
export function alignCardBoxes(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-box]').forEach((box) => {
    const head = box.querySelector<HTMLElement>('[data-box-head]');
    const bg = box.querySelector<HTMLElement>(':scope > [data-box-bg]');
    if (!head || !bg) return;
    // (offsets are from the box's padding edge, as the layer's are)
    const anchor = (head.firstElementChild as HTMLElement | null) || head;
    const mid = anchor.offsetTop + anchor.offsetHeight / 2;
    const ringTop = parseFloat(getComputedStyle(bg).borderTopWidth) || 0;
    bg.style.top = `${Math.round(mid - ringTop / 2)}px`;
    head.style.webkitTextStroke = String(CARD_TEXT_OUTLINE.WebkitTextStroke);
    head.style.paintOrder = String(CARD_TEXT_OUTLINE.paintOrder);
  });
}

/**
 * The card text section's fitted size and spacing (set by the card's fit, see CardView), to draw more boxes the same size
 * beside a card face (the big card's extra actions). Empty until the card has been fitted.
 */
export function readCardTextFit(cardRoot: HTMLElement | null): React.CSSProperties {
  const text = cardRoot?.querySelector<HTMLElement>('[data-card-text]');
  if (!text || !text.style.fontSize) return {};
  const out: Record<string, string> = { fontSize: text.style.fontSize };
  ['--card-lh', '--card-gap', '--card-pad', '--card-box-pad'].forEach((v) => (out[v] = text.style.getPropertyValue(v)));
  return out as React.CSSProperties;
}

/** The card text section's box spacing (from the fitted values above): for drawing more boxes the way the card does. */
export const CARD_TEXT_CLASS = 'flex flex-col p-[var(--card-pad)] gap-[var(--card-gap)] leading-[var(--card-lh)]';

/** The card's own width and side padding (card pixels): its text section is CARD_WIDTH - 2 * CARD_PADDING wide. */
export const CARD_FACE_WIDTH = 750;
export const CARD_FACE_PADDING = 24;

/**
 * One ability's box, exactly as printed on a card: its frame (Assist and Inspiring in their bright colours) in the card's
 * fill, its cost chip, name, tag chips (melee, range and so on), and its text, in em of the text section's font size. The big
 * card draws the unit's other actions (Move, Draw, abilities granted or borrowed) with it too, so they always look like
 * the card's own boxes: change a box's look here and it changes on every card face and on the big card alike.
 * costLabel: a cost to show instead of the ability's own (e.g. "Free"); null: no cost chip. frameStyle: laid on the box's
 * drawn layer (e.g. the big card's light around it).
 */
export const CardAbilityBox: React.FC<{
  ability: CardAbility;
  fill?: React.CSSProperties;
  costLabel?: string | null;
  frameStyle?: React.CSSProperties;
}> = ({ ability, fill = CARD_SURFACE_FILL, costLabel, frameStyle }) => {
  const costDisplay = Array.isArray(ability.cost) ? ability.cost.join('-') : ability.cost;
  const cost = costLabel === undefined ? `${costDisplay} AP` : costLabel;
  const highlight = getAbilityHighlight(ability);
  // A tag: colour-coded text only
  const chip = 'rounded-md font-bold px-[0.25em] text-[0.65em]';
  // An Assist or Inspiring ability's own tag stays beside its name, and its other tags go on the line under it
  // (an attack dealing damage as part of its user's own movement or placement is melee by the rules, so it shows the
  // Melee tag whether or not its card data has one)
  const tags = [...(ability.tags || [])];
  if (!tags.includes('melee') && dealsDamageAsPartOfOwnMovement(ability)) tags.unshift('melee');
  const leadTags = tags.filter((t) => t === 'assist' || t === 'inspiring');
  const otherTags = tags.filter((t) => t !== 'assist' && t !== 'inspiring');
  const tagChip = (tag: string) => (
    <span key={tag} className={`${highlight.tag[tag] || 'bg-stone-600'} text-white capitalize ${chip}`}>
      {tag}
    </span>
  );
  // The reach of an area around this unit, when the ability has no range of its own (e.g. "otherUnitsWithinRange:5")
  const areaRange = (ability.effects || [])
    .map((e: any) => (typeof e.area === 'string' ? e.area.match(/WithinRange:(\d+)$/)?.[1] : undefined))
    .find(Boolean);
  // A Range chip only for a Range tag of the card: not on a melee ability (melee and ranged are exclusive), nor when the
  // range is only how far it moves its user, written in its text (rangeIsMoveDistance, e.g. Bright Swoop)
  const showRange =
    Boolean(ability.rangeText || (ability.range && ability.range.length > 0)) &&
    !tags.includes('melee') &&
    !ability.rangeIsMoveDistance;
  // Any tag besides an Assist or Inspiring one (they go on the line under it)
  const hasOtherTags =
    otherTags.length > 0 ||
    isStraightLineAbility(ability) ||
    Boolean(ability.usesPath) ||
    showRange ||
    Boolean(areaRange) ||
    Boolean(ability.tagNote);
  return (
    <div
      data-box
      className="relative isolate rounded-md flex flex-col px-[0.3em] py-[var(--card-box-pad)] border-solid border-transparent"
      style={{ borderWidth: highlight.border }}
    >
      <BoxFrame
        className={`${highlight.box} rounded-lg`}
        fill={fill}
        inset={{ top: highlight.border, right: highlight.border, bottom: highlight.border, left: highlight.border }}
        style={frameStyle}
      />
      {/* Ability Header: Cost, Name, Tags, Range */}
      <div data-box-head className="flex items-center gap-[0.25em] flex-wrap">
        {cost !== null && (
          <span className="inline-flex items-center gap-[0.1em] bg-amber-600 text-white font-bold rounded-md px-[0.2em] text-[0.8em]">
            <Zap className="w-[0.8em] h-[0.8em] fill-white" />
            {withNumerals(cost)}
          </span>
        )}
        <span style={heading} className="text-white text-[1.35em]">{withNumerals(ability.name)}</span>
        {leadTags.map(tagChip)}
        {/* (an Assist or Inspiring ability: the rest start a new line) */}
        {leadTags.length > 0 && hasOtherTags && <span aria-hidden className="basis-full h-0" />}
        {otherTags.map(tagChip)}
        {isStraightLineAbility(ability) ? (
          // Aimed by choosing a direction: what it hits down that line, and how far it reaches (e.g. Iron Quarrel:
          // "Straight Line: First Unit" + "Range: 1-3"; Quartz Ray: "Straight Line: All Units")
          <>
            <span className={`bg-amber-800 text-white ${chip}`}>
              {`Straight Line: ${ability.effects?.some((e: any) => e.area === 'allUnitsInLine') ? 'All Units' : 'First Unit'}`}
            </span>
            {(ability.rangeText || (ability.range && ability.range.length > 0)) && (
              <span className={`bg-sky-800 text-white ${chip}`}>
                {withNumerals(`Range: ${ability.rangeText || (ability.range!.length > 1 ? `${ability.range![0]}-${ability.range![1]}` : ability.range![0])}`)}
              </span>
            )}
          </>
        ) : ability.usesPath ? (
          // A path drawn tile by tile, which must run straight for some (e.g. Glacial Spikes: "Straight Path: 3 tiles")
          <span className={`bg-amber-800 text-white ${chip}`}>
            {withNumerals(
              `${(ability as any).pathRule === 'straight' ? 'Straight Path' : 'Path'}: ${
                ability.rangeText
                  ? `${ability.rangeText} tile${ability.rangeText === '1' ? '' : 's'}`
                  : ability.range
                  ? ability.range[0] === ability.range[1]
                    ? `${ability.range[0]} tiles`
                    : `${ability.range[0]}-${ability.range[1]} tiles`
                  : '3 tiles'
              }`
            )}
          </span>
        ) : showRange ? (
          <span className={`bg-sky-800 text-white ${chip}`}>
            {withNumerals(`Range: ${ability.rangeText || (ability.range ?(ability.range.length > 1 ? `${ability.range[0]}-${ability.range[1]}` : ability.range[0]) : '')}`)}
          </span>
        ) : areaRange ? (
          // An area around this unit with its own reach (e.g. Death Wail: "all other units in range", range 5)
          <span className={`bg-sky-800 text-white ${chip}`}>
            {withNumerals(`Range: ${areaRange}`)}
          </span>
        ) : null}
        {ability.tagNote && <span className={`bg-violet-800 text-white ${chip}`}>{withNumerals(ability.tagNote)}</span>}
      </div>

      {/* Ability Body Text */}
      {ability.text && <p className="text-white font-bold" style={BODY_TEXT_STYLE}>{withNumerals(formatCardText(ability.text))}</p>}
    </div>
  );
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  customArtUrl,
  scale = 1,
  id = 'card-render-canvas',
  fillEdges
}) => {
  // Bumped once the card fonts finish loading, so the text is re-fitted with their real metrics
  const [fontsVersion, setFontsVersion] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  // The top frame: one ring around the name bar, the art and the first passive/ability, the set background inside it
  const frameRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  // The bar's bottom row (type line, HP, AP): the bar ends halfway down it, the rest hangs over the art
  const bottomRowRef = useRef<HTMLDivElement>(null);
  const typeLineRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  // The small copy of the set's background, else (a set whose copy hasn't been made yet) the full-size one
  const [setBackgroundFailed, setSetBackgroundFailed] = useState<string[]>([]);
  const setBackgroundSrc = [getCardBackgroundPath(card), getSetBackgroundPath(card)].find(
    (p): p is string => Boolean(p) && !setBackgroundFailed.includes(p!)
  );

  // Art to try, in order (custom art alone when given), with the white halo drawn around the figure
  const art = useProcessedArt(customArtUrl ? [customArtUrl] : getCardArtPaths(card));

  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) setFontsVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Size the name to fill the top bar on one line, then the card text as large as the card allows
  // (all text sizes below are em of the text section's font size)
  useLayoutEffect(() => {
    const nameEl = nameRef.current;
    if (nameEl) {
      nameEl.style.fontSize = `${NAME_SIZE}px`;
      const nameText = nameEl.querySelector<HTMLElement>('[data-name-text]');
      if (nameText) {
        nameText.style.transform = '';
        const fit = nameEl.clientWidth / nameText.offsetWidth;
        if (fit < 1) nameText.style.transform = `scaleX(${fit.toFixed(4)})`;
      }
    }
    // The bar's background starts halfway down the name: its top half sits on the black of the card's border
    // The top frame's ring width; the ring's top edge runs through the middle of the name, and the bar's colour fills the
    // ring from there, out to its sides
    const frameEl = frameRef.current;
    const ring = frameEl ? parseFloat(getComputedStyle(frameEl).borderTopWidth) || 0 : 0;
    const nameMid = nameEl ? nameEl.offsetTop + nameEl.offsetHeight / 2 : 0;
    const headerBg = headerRef.current?.querySelector<HTMLElement>('[data-header-bg]');
    if (nameEl && headerBg) {
      headerBg.style.top = `${Math.round(nameMid + ring / 2)}px`;
      headerBg.style.left = `${ring}px`;
      headerBg.style.right = `${ring}px`;
    }
    // The type line on one line: up to 2 points larger when that still fits beside the HP and AP (a point at a time), else
    // its usual size, squeezed sideways to fit like a long name
    const typeLine = typeLineRef.current;
    const typeText = typeLine?.querySelector<HTMLElement>('[data-type-text]');
    if (typeLine && typeText) {
      typeText.style.transform = '';
      const sizes = [TYPE_LINE_SIZE + 2 * POINT, TYPE_LINE_SIZE + POINT, TYPE_LINE_SIZE];
      for (const size of sizes) {
        typeLine.style.fontSize = `${size}px`;
        if (typeText.offsetWidth <= typeLine.clientWidth) break;
      }
      const fit = typeLine.clientWidth / typeText.offsetWidth;
      if (fit < 1) typeText.style.transform = `scaleX(${fit.toFixed(4)})`;
    }
    // The bar ends halfway down the lowest line of text in its bottom row: the type line or the HP/AP badges, whichever
    // is lower. The rest of the row hangs below, over the art.
    const rowEl = bottomRowRef.current;
    if (rowEl) {
      rowEl.style.marginBottom = '0px';
      const rowHeight = rowEl.offsetHeight;
      let cut = rowHeight / 2;
      const typeEl = typeLineRef.current;
      if (typeEl) {
        const lineHeight = parseFloat(getComputedStyle(typeEl).lineHeight) || typeEl.offsetHeight;
        cut = Math.max(cut, typeEl.offsetTop + typeEl.offsetHeight - lineHeight / 2);
      }
      rowEl.style.marginBottom = `-${Math.round(rowHeight - cut)}px`;
    }
    const textEl = textRef.current;
    const headerEl = headerRef.current;
    if (textEl && headerEl) {
      const available = CARD_HEIGHT - CARD_PADDING * 2 - headerEl.offsetHeight - MIN_ART_HEIGHT;
      const apply = (size: number, spacing: (typeof TEXT_SPACING_STEPS)[number]) => {
        textEl.style.fontSize = `${size}px`;
        textEl.style.setProperty('--card-lh', spacing.lineHeight);
        textEl.style.setProperty('--card-gap', spacing.gap);
        textEl.style.setProperty('--card-pad', spacing.pad);
        textEl.style.setProperty('--card-box-pad', spacing.boxPad);
        return textEl.scrollHeight <= available;
      };
      // Largest size that fits at any spacing (else the smallest size, tightest spacing, as left by the last try)
      fit: for (let size = MAX_TEXT_SIZE; size >= MIN_TEXT_SIZE; size--) {
        for (const spacing of TEXT_SPACING_STEPS) {
          if (apply(size, spacing)) break fit;
        }
      }
      // Like the top bar, the text box's frame starts halfway down its first line of text (the first passive's or
      // ability's name line): the top of the text spills up over the art, and the art takes the space it frees
      // The first box's own background starts at the same line, so the top half of its first line sits on the art (outlined
      // to read there, like the type line); every other box is drawn whole
      // Every box's colour starts halfway down its first line, so the top half of each name line sits on what is
      // behind the box: the art for the first one, the black of the card for the rest (outlined to read there)
      alignCardBoxes(textEl);
      const firstHead = textEl.querySelector<HTMLElement>('[data-box-head]');
      const firstBox = firstHead?.closest<HTMLElement>('[data-box]') || null;
      const headMid = firstHead ? firstHead.offsetTop + firstHead.offsetHeight / 2 : 0;
      // (a box's own offset is from the text section)
      const cut = firstHead ? Math.round(firstBox ? firstBox.offsetTop + headMid : headMid) : 0;
      textEl.style.marginTop = `-${cut}px`;

      // The first box's colour reaches out to the top frame's ring on both sides and to its bottom
      let topBottom = cut; // the bottom of what the top frame holds, in the text section
      if (firstBox) {
        const bg = firstBox.querySelector<HTMLElement>(':scope > [data-box-bg]');
        const cs = getComputedStyle(firstBox);
        const bl = parseFloat(cs.borderLeftWidth) || 0;
        const br = parseFloat(cs.borderRightWidth) || 0;
        const bb = parseFloat(cs.borderBottomWidth) || 0;
        if (bg) {
          // (its outer edges sit on the top frame's: a ring of its own, e.g. Inspiring, is laid over the frame's along
          // its box, and the frame's plain ring shows everywhere else)
          // (a box without a full ring of its own, e.g. a passive, stays inside the frame's ring so that ring shows)
          const ownRing = (parseFloat(getComputedStyle(bg).borderRightWidth) || 0) > 0;
          const edge = ownRing ? 0 : ring;
          bg.style.left = `${Math.round(edge - (firstBox.offsetLeft + bl))}px`;
          bg.style.right = `${Math.round(firstBox.offsetLeft + firstBox.offsetWidth - br - (textEl.clientWidth - edge))}px`;
          bg.style.bottom = `${Math.round(-(bb + ring - edge))}px`;
          bg.style.borderRadius = ownRing ? '12px' : '9px';
        }
        topBottom = firstBox.offsetTop + firstBox.offsetHeight;
      } else if (firstHead) {
        topBottom = firstHead.offsetTop + firstHead.offsetHeight + 8;
      }
      // Behind the text is the card's border colour (the face's own background, showing through), except the top frame,
      // which reaches down around the first box
      textEl.style.background = 'transparent';

      // The top frame: from the middle of the name to below the first box, the width of the card's inside
      if (frameEl && headerEl) {
        const top = headerEl.offsetTop + nameMid - ring / 2;
        const bottom = textEl.offsetTop + topBottom + ring;
        frameEl.style.top = `${Math.round(top)}px`;
        frameEl.style.height = `${Math.max(0, Math.round(bottom - top))}px`;
      }
    }

    // The name bar's and the boxes' ripple lined up with the card's own (see getCardBoxFill): drawn the size of the whole
    // card, shifted by where each one sits on it, so the card's colour runs on unbroken under their tint
    const face = headerRef.current?.closest<HTMLElement>('[data-card-face]');
    if (face) {
      const base = face.getBoundingClientRect();
      const k = base.width / CARD_WIDTH || 1;
      face.querySelectorAll<HTMLElement>('[data-box-bg], [data-header-bg]').forEach((layer) => {
        const r = layer.getBoundingClientRect();
        layer.style.backgroundSize = `100% 100%, ${CARD_WIDTH}px ${CARD_HEIGHT}px`;
        layer.style.backgroundPosition = `0 0, ${Math.round((base.left - r.left) / k)}px ${Math.round((base.top - r.top) / k)}px`;
        layer.style.backgroundRepeat = 'no-repeat';
      });
    }
  }, [card, fontsVersion]);

  // The type line as the card text database words it (see data/typeLines.ts), else one made from the reinforce data
  const typeLine = TYPE_LINES[card.id];
  // The card's class colour, or a fade between its classes' colours (see utils/classColours.ts): its border, all the way
  // round. What's read on it (the name bar, the text boxes) is that colour, darkened (see getCardBoxFill).
  const cardFill = getCardFill(card, fillEdges);
  const boxFill = getCardBoxFill(card);
  // The top frame's ring is always the plain one; a first ability with its own ring (e.g. Inspiring) keeps it around
  // its own box, laid over the frame's
  const topRingClass = 'border-[3px] border-stone-600';
  const subtitle = typeLine ? (
    <span title={typeLine}>{withNumerals(typeLine)}</span>
  ) : (
    <>
      {card.basic && <span>Basic Unit</span>}
      {card.reinforce?.mode === 'promote' && <span>{withNumerals(`Promote [${card.reinforce.requirement?.[0]?.[0] || 'Unit'}]`)}</span>}
      {card.reinforce?.mode === 'fusion' && (
        <span title={`Fusion: ${formatFusionRequirements(card)}`}>
          {withNumerals(`Fusion: ${formatFusionRequirements(card)}`)}
        </span>
      )}
      {card.reinforce?.mode === 'tribute' && <span>{withNumerals(formatTributeRequirements(card))}</span>}
      {card.isWall && <span>Token · Wall</span>}
      {card.type && !card.basic && !card.reinforce && <span>{withNumerals(replaceStaticWithPassive(card.type))}</span>}
    </>
  );

  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top center',
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        padding: `${CARD_PADDING}px`,
        fontFamily: CARD_BODY_FONT,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'geometricPrecision',
        // (every line of text on the card outlined alike)
        ...CARD_TEXT_OUTLINE,
        // (the border: the card's padding, all the way round)
        ...cardFill
      }}
      className="relative shrink-0 shadow-2xl rounded-sm select-none overflow-hidden text-white flex flex-col"
      id={id}
      data-card-face={card.id}
    >
      {/* ================= TOP FRAME: a ring around the name bar, the art and the first passive/ability, as if they were
          one ability, with the set's background picture behind all of it (placed and sized in the fit above) ================= */}
      <div
        ref={frameRef}
        data-top-frame
        aria-hidden
        className={`absolute overflow-hidden rounded-xl pointer-events-none border-solid ${topRingClass}`}
        style={{ left: CARD_PADDING, right: CARD_PADDING, top: CARD_PADDING, height: 0 }}
      >
        {setBackgroundSrc && (
          <img
            key={setBackgroundSrc}
            src={setBackgroundSrc}
            alt=""
            data-set-background
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setSetBackgroundFailed((f) => [...f, setBackgroundSrc])}
          />
        )}
      </div>

      {/* ================= TOP BAR: the name across the whole bar, type and HP/AP beneath ================= */}
      {/* The bar's frame ends halfway down its bottom row (type line, HP and AP), which bursts out over the art below */}
      <div
        ref={headerRef}
        className="w-[702px] px-4 pt-2 pb-[3px] flex flex-col shrink-0 z-10 relative isolate overflow-visible"
      >
        {/* The bar itself, in the card's class colour: from halfway down the name (set in the fit above) to its frame */}
        <div
          data-header-bg
          aria-hidden
          className="absolute bottom-0 -z-10 rounded-xl border-b-[3px] border-stone-600 pointer-events-none"
          style={{ top: 0, left: 0, right: 0, ...boxFill }}
        />
        <h2
          ref={nameRef}
          style={heading}
          className="w-full text-white leading-tight whitespace-nowrap flex justify-center"
        >
          {/* (squeezed sideways, from its middle, when it's wider than the bar: see the fit above) */}
          <span data-name-text className="inline-block shrink-0 origin-center">
            {withNumerals(replaceStaticWithPassive(card.name))}
          </span>
        </h2>

        <div ref={bottomRowRef} className="flex items-center justify-between gap-3 mt-1 relative">
          {/* One line, squeezed sideways when it's long (see the fit), so a full reinforce requirement always shows.
              Outlined, to read over the art. */}
          <div
            ref={typeLineRef}
            className="flex-1 min-w-0 text-[26px] font-bold text-white leading-tight whitespace-nowrap"
            style={{ ...CARD_TEXT_OUTLINE, textShadow: '0 3px 6px rgba(0,0,0,0.9)' }}
          >
            <span data-type-text className="inline-flex items-center gap-x-2 origin-left">
              {subtitle}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center gap-1.5 px-3 py-0.5 bg-rose-950 border-[3px] border-rose-500 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.85)]"
              title={`Hit Points: ${card.hp}`}
            >
              <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
              <span style={heading} className="text-[30px] text-white">HP</span>
              <span style={NUMERAL_STYLE} className="text-[36px] text-white leading-none tabular-nums">{card.hp}</span>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-0.5 bg-amber-950 border-[3px] border-amber-500 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.85)]"
              title={`Action Points: ${card.ap}`}
            >
              <Zap className="w-7 h-7 text-amber-400 fill-amber-400" />
              <span style={heading} className="text-[30px] text-white">AP</span>
              <span style={NUMERAL_STYLE} className="text-[36px] text-white leading-none tabular-nums">{card.ap}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ART SECTION (takes whatever height the text leaves; cuts off bottom of art as needed) ================= */}
      <div
        className="w-[702px] flex-1 max-h-[600px] overflow-hidden shrink z-0 flex items-start justify-center relative"
        style={{ minHeight: `${MIN_ART_HEIGHT}px` }}
      >
        {/* (the set's background picture is behind it, in the top frame) */}

        {/* While the art is being cleaned up, the card face capture waits on this marker */}
        {art.status === 'pending' && <div className="absolute inset-0" data-art-pending={card.id} />}
        {art.status === 'ready' && (
          <img
            src={art.src}
            alt={card.name}
            data-art-card-id={card.id}
            className="relative w-full h-full object-cover object-top"
          />
        )}

        {/* "[no art found]" while the card has no art file */}
        {art.status === 'error' && (
          <div className="absolute inset-0">
            <CardArtFallback card={card} />
          </div>
        )}
      </div>

      {/* ================= TEXT SECTION (font size set by the fit above; everything inside is in em) ================= */}
      <div
        ref={textRef}
        data-card-text
        className="w-[702px] shrink-0 flex flex-col justify-start relative z-10 pointer-events-auto p-[var(--card-pad)] gap-[var(--card-gap)] leading-[var(--card-lh)]"
      >
        {/* Passives: tagged "Passive" on the name line (the rules text says when it applies) */}
        {card.passives && card.passives.length > 0 && (
          <div className="flex flex-col gap-[var(--card-gap)]">
            {card.passives.map((passive) => (
              <div
                key={passive.id || passive.name}
                data-box
                className="relative isolate border-l-[6px] border-transparent text-white px-[0.3em] py-[var(--card-box-pad)]"
              >
                <BoxFrame className="border-l-[6px] border-amber-500 rounded-lg" fill={boxFill} inset={{ top: 0, right: 0, bottom: 0, left: 6 }} />
                <div data-box-head className="flex items-center gap-[0.25em]">
                  <span style={heading} className="text-white text-[1.35em] min-w-0">
                    {withNumerals(replaceStaticWithPassive(passive.name))}
                  </span>
                  <span className="shrink-0 text-white bg-amber-700 px-[0.25em] rounded-md font-bold text-[0.65em]">
                    Passive
                  </span>
                </div>
                <p className="text-white font-bold" style={BODY_TEXT_STYLE}>{withNumerals(formatCardText(passive.text))}</p>
              </div>
            ))}
          </div>
        )}

        {/* Abilities */}
        {card.abilities && card.abilities.length > 0 && (
          <div className="flex flex-col gap-[var(--card-gap)]">
            {card.abilities.map((ability) => (
              <CardAbilityBox key={ability.id || ability.name} ability={ability} fill={boxFill} />
            ))}
          </div>
        )}

        {/* Tokens / Walls with no passives or abilities: a notice drawn as a plain ability box, so it sits over the art the
            way an ability does (its first line spilling onto the art, the box's colour filling the top frame) */}
        {(!card.passives || card.passives.length === 0) && (!card.abilities || card.abilities.length === 0) && (
          <div
            data-box
            className="relative isolate rounded-md flex flex-col px-[0.3em] py-[var(--card-box-pad)] border-solid border-transparent"
            style={{ borderWidth: 2 }}
          >
            <BoxFrame className="border-2 border-stone-600 rounded-lg" fill={boxFill} inset={{ top: 2, right: 2, bottom: 2, left: 2 }} />
            <div data-box-head className="flex items-center gap-[0.25em] flex-wrap">
              <span className="inline-flex items-center gap-[0.1em] bg-stone-600 text-white font-bold rounded-md px-[0.2em] text-[0.8em]">
                <ShieldAlert className="w-[0.8em] h-[0.8em]" />
                Token
              </span>
              <span style={heading} className="text-white text-[1.35em]">No Passive or Abilities</span>
            </div>
            <p className="text-white font-bold" style={BODY_TEXT_STYLE}>{withNumerals('This token unit has 0 AP and serves as a tactical obstacle.')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
