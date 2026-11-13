import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { CardItem, CardAbility } from '../types/card';
import { CardArtFallback } from './CardArtFallback';
import { Heart, Zap, Crosshair, ShieldAlert, Sparkles } from 'lucide-react';
import { formatFusionRequirements, formatTributeRequirements } from '../utils/reinforceRules';
import { isStraightLineAbility } from '../utils/hexGridMath';
import { useProcessedArt } from '../utils/artHalo';

interface CardViewProps {
  card: CardItem;
  customArtUrl?: string | null;
  frameMode?: 'overlay' | 'css' | 'background';
  scale?: number;
  id?: string;
  extendToFitText?: boolean;
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
const getAbilityHighlight = (ability: CardAbility): { box: string; tag: Record<string, string> } => {
  const tag = { assist: 'bg-cyan-500', inspiring: 'bg-fuchsia-600' };
  if (ability.tags?.includes('assist')) {
    return { box: 'border-[4px] border-cyan-400 bg-cyan-950 shadow-[0_0_14px_rgba(34,211,238,0.55)]', tag };
  }
  if (ability.tags?.includes('inspiring')) {
    return { box: 'border-[4px] border-fuchsia-500 bg-fuchsia-950 shadow-[0_0_14px_rgba(217,70,239,0.55)]', tag };
  }
  return { box: 'border-2 border-stone-600 bg-stone-800', tag };
};

// Gothic serif faces (bundled in src/assets/fonts, declared in index.css): blackletter for names, old-style serif for card text
export const CARD_HEADING_FONT = "'Card Pirata One', 'Cinzel', Georgia, serif";
export const CARD_BODY_FONT = "'Card IM Fell English', Georgia, serif";

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
const MAX_NAME_SIZE = 62;
const MIN_NAME_SIZE = 28;

const heading: React.CSSProperties = { fontFamily: CARD_HEADING_FONT, fontWeight: 400 };

// Numbers are drawn in a plain bold face (the gothic faces' numerals are hard to read), the rest stays as it is
const NUMERAL_STYLE: React.CSSProperties = { fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif", fontWeight: 700 };
const withNumerals = (value: string | number): React.ReactNode =>
  String(value)
    .split(/(\d+)/)
    .map((part, i) => (i % 2 === 1 ? <span key={i} style={NUMERAL_STYLE}>{part}</span> : part));

/**
 * A set's background picture at full size: its set's name as a file in the art folder (e.g. wrath_of_the_elements.png).
 * Used for the battlefield background in matches.
 */
export const getSetBackgroundPath = (card: CardItem): string | null =>
  card.set ? `/assets/art/${card.set.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png` : null;

/**
 * The same picture as drawn behind a card's art: a small copy (about 480p) in art/card-backgrounds, made by
 * "npm run card-backgrounds". Every card face embeds it, so the full-size file made loading slow.
 */
export const getCardBackgroundPath = (card: CardItem): string | null =>
  card.set ? `/assets/art/card-backgrounds/${card.set.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}.webp` : null;

export const CardView: React.FC<CardViewProps> = ({
  card,
  customArtUrl,
  scale = 1,
  id = 'card-render-canvas'
}) => {
  // Bumped once the card fonts finish loading, so the text is re-fitted with their real metrics
  const [fontsVersion, setFontsVersion] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  // The small copy of the set's background, else (a set whose copy hasn't been made yet) the full-size one
  const [setBackgroundFailed, setSetBackgroundFailed] = useState<string[]>([]);
  const setBackgroundSrc = [getCardBackgroundPath(card), getSetBackgroundPath(card)].find(
    (p): p is string => Boolean(p) && !setBackgroundFailed.includes(p!)
  );

  // Art to try, in order (custom art alone when given), with the white halo drawn around the figure
  const art = useProcessedArt(
    customArtUrl ? [customArtUrl] : [`/assets/art/${card.id}.png`, `/assets/${card.art || `art/${card.id}.png`}`]
  );

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
      let size = MAX_NAME_SIZE;
      nameEl.style.fontSize = `${size}px`;
      while (size > MIN_NAME_SIZE && nameEl.scrollWidth > nameEl.clientWidth) {
        size -= 2;
        nameEl.style.fontSize = `${size}px`;
      }
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
    }
  }, [card, fontsVersion]);

  const subtitle = (
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
        textRendering: 'geometricPrecision'
      }}
      className="relative shrink-0 shadow-2xl rounded-sm select-none bg-black overflow-hidden text-white flex flex-col"
      id={id}
      data-card-face={card.id}
    >
      {/* ================= TOP BAR: the name across the whole bar, type and HP/AP beneath ================= */}
      <div
        ref={headerRef}
        className="w-[702px] bg-stone-900 px-4 pt-2 pb-3 flex flex-col border-b-[3px] border-stone-600 shrink-0 z-10"
      >
        <h2
          ref={nameRef}
          style={heading}
          className="w-full text-white leading-tight whitespace-nowrap overflow-hidden text-center"
        >
          {withNumerals(replaceStaticWithPassive(card.name))}
        </h2>

        <div className="flex items-center justify-between gap-3 mt-1">
          {/* Wraps rather than cutting off, so a full reinforce requirement always shows */}
          <div className="flex flex-wrap items-center gap-x-2 min-w-0 text-[26px] font-bold text-white leading-tight">
            {subtitle}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center gap-1.5 px-3 py-0.5 bg-rose-950 border-[3px] border-rose-500 rounded-lg"
              title={`Hit Points: ${card.hp}`}
            >
              <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
              <span style={heading} className="text-[24px] text-white">HP</span>
              <span style={NUMERAL_STYLE} className="text-[36px] text-white leading-none tabular-nums">{card.hp}</span>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-0.5 bg-amber-950 border-[3px] border-amber-500 rounded-lg"
              title={`Action Points: ${card.ap}`}
            >
              <Zap className="w-7 h-7 text-amber-400 fill-amber-400" />
              <span style={heading} className="text-[24px] text-white">AP</span>
              <span style={NUMERAL_STYLE} className="text-[36px] text-white leading-none tabular-nums">{card.ap}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ART SECTION (takes whatever height the text leaves; cuts off bottom of art as needed) ================= */}
      <div
        className="w-[702px] flex-1 max-h-[530px] bg-stone-800 overflow-hidden border-b-[3px] border-stone-600 shrink z-0 flex items-start justify-center relative"
        style={{ minHeight: `${MIN_ART_HEIGHT}px` }}
      >
        {/* The set's background picture, if provided (else the plain background shows) */}
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

        {/* Fallback procedural art if no art file loads */}
        {art.status === 'error' && (
          <div className="absolute inset-0">
            <CardArtFallback card={card} />
          </div>
        )}
      </div>

      {/* ================= TEXT SECTION (font size set by the fit above; everything inside is in em) ================= */}
      <div
        ref={textRef}
        className="w-[702px] shrink-0 bg-stone-900 flex flex-col justify-start z-10 pointer-events-auto p-[var(--card-pad)] gap-[var(--card-gap)] leading-[var(--card-lh)]"
      >
        {/* Passives: tagged "Passive" on the name line (the rules text says when it applies) */}
        {card.passives && card.passives.length > 0 && (
          <div className="flex flex-col gap-[var(--card-gap)]">
            {card.passives.map((passive) => (
              <div
                key={passive.id || passive.name}
                className="bg-stone-800 border-l-[6px] border-amber-500 rounded-r text-white px-[0.3em] py-[var(--card-box-pad)]"
              >
                <div className="flex items-center gap-[0.25em]">
                  <span style={heading} className="text-white text-[1.1em] min-w-0 truncate">
                    {withNumerals(replaceStaticWithPassive(passive.name))}
                  </span>
                  <span className="shrink-0 text-white bg-amber-700 px-[0.25em] rounded font-bold text-[0.65em]">
                    Passive
                  </span>
                  {Boolean(passive.limits?.oncePerTurn) && (
                    <span className="shrink-0 font-bold text-white bg-rose-700 px-[0.25em] rounded text-[0.65em]">{withNumerals('1/Turn')}</span>
                  )}
                </div>
                <p className="text-white">{withNumerals(formatCardText(passive.text))}</p>
              </div>
            ))}
          </div>
        )}

        {/* Abilities */}
        {card.abilities && card.abilities.length > 0 && (
          <div className="flex flex-col gap-[var(--card-gap)]">
            {card.abilities.map((ability) => {
              const costDisplay = Array.isArray(ability.cost) ? ability.cost.join('-') : ability.cost;
              const highlight = getAbilityHighlight(ability);
              const chip = 'rounded font-bold flex items-center gap-[0.15em] px-[0.25em] text-[0.65em]';

              return (
                <div
                  key={ability.id || ability.name}
                  className={`${highlight.box} rounded-md flex flex-col px-[0.3em] py-[var(--card-box-pad)]`}
                >
                  {/* Ability Header: Cost, Name, Tags, Range */}
                  <div className="flex items-center gap-[0.25em] flex-wrap">
                    <span className="inline-flex items-center gap-[0.1em] bg-amber-600 text-white font-bold rounded px-[0.2em] text-[0.8em]">
                      <Zap className="w-[0.8em] h-[0.8em] fill-white" />
                      {withNumerals(`${costDisplay} AP`)}
                    </span>
                    <span style={heading} className="text-white text-[1.1em]">{withNumerals(ability.name)}</span>
                    {ability.tags?.map((tag) => (
                      <span
                        key={tag}
                        className={`${highlight.tag[tag] || 'bg-stone-600'} text-white rounded capitalize px-[0.25em] font-bold text-[0.65em]`}
                      >
                        {tag}
                      </span>
                    ))}
                    {isStraightLineAbility(ability) ? (
                      <span className={`bg-amber-800 text-white ${chip}`}>
                        <Zap className="w-[0.9em] h-[0.9em] text-amber-300" />
                        Straight Line
                      </span>
                    ) : (ability.usesPath || ability.id === 'bananarang') ? (
                      <span className={`bg-amber-800 text-white ${chip}`}>
                        <Sparkles className="w-[0.9em] h-[0.9em] text-amber-300" />
                        {withNumerals(`Path: ${ability.rangeText || (ability.range ? (ability.range[0] === ability.range[1] ? `${ability.range[0]} tiles` : `${ability.range[0]}-${ability.range[1]} tiles`) : '3 tiles')}`)}
                      </span>
                    ) : (ability.rangeText || (ability.range && ability.range.length > 0)) ? (
                      <span className={`bg-sky-800 text-white ${chip}`}>
                        <Crosshair className="w-[0.9em] h-[0.9em]" />
                        {withNumerals(`Range: ${ability.rangeText || (ability.range ? (ability.range.length > 1 ? `${ability.range[0]}-${ability.range[1]}` : ability.range[0]) : '')}`)}
                      </span>
                    ) : null}
                    {ability.limits?.oncePerTurn && <span className={`bg-rose-700 text-white ${chip}`}>{withNumerals('1/Turn')}</span>}
                  </div>

                  {/* Ability Body Text */}
                  <p className="text-white">{withNumerals(formatCardText(ability.text))}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tokens / Walls empty abilities notice */}
        {(!card.passives || card.passives.length === 0) && (!card.abilities || card.abilities.length === 0) && (
          <div className="flex flex-col items-center justify-center text-center p-[0.3em] text-white">
            <ShieldAlert className="w-[1.2em] h-[1.2em] mb-[0.2em] opacity-60" />
            <p style={heading} className="text-white text-[1.1em]">No Passive or Abilities</p>
            <p className="text-white">{withNumerals('This token unit has 0 AP and serves as a tactical obstacle.')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
