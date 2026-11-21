import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CardAbility, CardItem } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import {
  CardView,
  CardAbilityBox,
  alignCardBoxes,
  readCardTextFit,
  CARD_TEXT_CLASS,
  CARD_TEXT_OUTLINE,
  CARD_BODY_FONT,
  CARD_FACE_WIDTH,
  CARD_FACE_PADDING
} from './CardView';
import { getCardFill } from '../utils/classColours';
import { SLOW_PULSE_SOFT_CSS, pulseInStep } from './GameLogPanel';
import { getAbilityApCost } from '../utils/promotedAbilities';
import { canUseAbilityThisTurn } from '../utils/turnLimits';

/**
 * The match's one big card: the card in focus (a hand card hovered, a unit on the board, or the unit taking the turn),
 * drawn live as the card itself. For the unit taking the turn, the abilities printed on it are its buttons: each one's
 * box lights up around its edge on hover and presses in when clicked (an ability that can't be used now is dimmed).
 * Its other actions (Move, Draw, Assist, abilities granted to it) are more boxes of the same kind under the card's own.
 *
 * The printed abilities' buttons are see-through layers over the card's own ability boxes (found by their data-box
 * marker, the passives' boxes first, then the abilities' in order), for the clicks. The light itself is drawn on the box's
 * own coloured layer inside the card (data-box-bg), which sits under the box's text: so a name that hangs over the top
 * of its box (as every box's first line does) stays on top of the light, as it's printed.
 */

/**
 * An action the unit taking the turn has besides its printed abilities (Move, Draw, Assist, an ability granted or
 * borrowed, a choice of cost), drawn as one more ability box under the card's own. It is drawn by the card's own box
 * (CardAbilityBox, in CardView), in the card's colour and at the card's text size, so it always looks like the card.
 */
export interface FocusAction {
  key: string;
  name: string;
  cost?: string; // its cost chip, e.g. "1 AP" or "Free" (none if left out)
  text?: string;
  // The ability itself, when it is one (granted or borrowed): drawn exactly as a card prints it (its tags, range and so
  // on); the name and text above are used otherwise
  ability?: CardAbility;
  // Tags for an action that isn't an ability (e.g. ["assist"]: drawn in Assist's colours, as on a card)
  tags?: string[];
  usable: boolean;
  active?: boolean; // selected right now (e.g. Move while moving)
  why?: string; // shown on hover when it can't be used
  onClick: () => void;
  onHover?: (on: boolean) => void;
}

/** Abilities being borrowed while the ability borrowing them is selected (see the subActions prop). */
export interface FocusSubActions {
  parentKey: string;
  items: FocusAction[];
  // For a chain of them: its progress (e.g. "Chosen 1/3"), Done (stop choosing), Cancel (the AP stays spent)
  controls?: { label?: string; onDone?: () => void; onCancel?: () => void };
}

interface Props {
  card: CardItem;
  customArtUrl?: string;
  // The unit taking the turn, when this is it: its printed abilities become buttons
  turnUnit?: BattlefieldUnit | null;
  activeAbility?: CardAbility | null;
  onAbilityClick?: (ability: CardAbility) => void;
  onHoverAbility?: (ability: CardAbility | null) => void;
  // Nothing can be chosen right now (e.g. locked into an Assist)
  locked?: boolean;
  // A label over the card's top edge (e.g. "Enemy")
  tag?: { text: string; className: string } | null;
  // The turn's other actions, as boxes under the card's own (see FocusAction)
  actions?: FocusAction[];
  // Abilities being borrowed (e.g. a promoted card's abilities used for free) while the ability borrowing them is
  // selected: drawn under it, set in. parentKey: that ability's id (a printed one) or its action's key (one underneath).
  subActions?: FocusSubActions | null;
  // Options worth a look right now (the unit picked, nothing done yet): they swell gently, in step with the turn banner.
  // A printed ability's id, or an extra action's key.
  pulsingKeys?: Set<string>;
  children?: React.ReactNode;
}

type BoxRect = { left: number; top: number; width: number; height: number };

// The light around a box: on hover, and (stronger) while it's the ability being used
const HOVER_GLOW = '0 0 0 3px rgba(252, 211, 77, 1), 0 0 18px rgba(252, 211, 77, 0.75)';
const ACTIVE_GLOW = '0 0 0 4px rgba(251, 191, 36, 1), 0 0 26px rgba(251, 191, 36, 0.9)';
const PRESSED_GLOW = 'inset 0 4px 14px rgba(0, 0, 0, 0.6), 0 0 0 3px rgba(252, 211, 77, 1)';

// The card's text size and spacing before its fit has been read (the card face's largest, loosest: see CardView)
const DEFAULT_TEXT_FIT: React.CSSProperties = {
  fontSize: '36px',
  ['--card-lh' as string]: '1.15',
  ['--card-gap' as string]: '0.25em',
  ['--card-pad' as string]: '0.3em',
  ['--card-box-pad' as string]: '0.2em'
};

/**
 * Card boxes drawn beside the card face, as the card draws them: in card pixels (width), at the card's fitted text size
 * and spacing (fit), scaled down with the card. Takes up its scaled height. Its boxes are lined up as the card's are.
 * border: the card's border fill, to carry the card on below it (its coloured edge down the sides and along the bottom,
 * the card's text section inside it, all in that colour); without one, just the boxes.
 */
const ScaledCardText: React.FC<{
  scale: number;
  width: number;
  fit: React.CSSProperties;
  border?: React.CSSProperties;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ scale, width, fit, border, className = '', style, children }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  // (every render: its boxes may have changed)
  useLayoutEffect(() => {
    if (innerRef.current) alignCardBoxes(innerRef.current);
  });
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ height: height * scale, ...style }}>
      <div
        ref={innerRef}
        // (card text: the app's font rules leave it in the card's fonts, see typography.css)
        data-card-boxes
        className={`absolute top-0 left-0 text-white ${border ? '' : CARD_TEXT_CLASS}`}
        style={{
          width,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          fontFamily: CARD_BODY_FONT,
          WebkitFontSmoothing: 'antialiased',
          ...CARD_TEXT_OUTLINE,
          ...fit,
          ...(border ? { ...border, padding: `0 ${CARD_FACE_PADDING}px ${CARD_FACE_PADDING}px` } : {})
        }}
      >
        {border ? <div className={CARD_TEXT_CLASS}>{children}</div> : children}
      </div>
    </div>
  );
};

export const FocusCardPanel: React.FC<Props> = ({
  card,
  customArtUrl,
  turnUnit,
  activeAbility,
  onAbilityClick,
  onHoverAbility,
  locked = false,
  tag,
  actions = [],
  subActions = null,
  pulsingKeys,
  children
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);
  // The card's ability boxes: where they're drawn (for the click layers), and the elements (for the light)
  const [rects, setRects] = useState<BoxRect[]>([]);
  const boxesRef = useRef<HTMLElement[]>([]);
  // The printed ability under the pointer, and the one being pressed (by index among the card's abilities); the extra
  // action being pressed (by key)
  const [hovered, setHovered] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [pressedAction, setPressedAction] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  // The card face's fitted text size and spacing (read from it once fitted), for the extra boxes
  const [textFit, setTextFit] = useState<React.CSSProperties>({});

  // The card scaled to the panel's width
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(el.offsetWidth / 750);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Where the ability boxes are drawn (measured again for a while after the card changes: its text is fitted once its
  // fonts and art have loaded, which can move the boxes)
  const interactive = Boolean(turnUnit && onAbilityClick);
  useLayoutEffect(() => {
    if (!interactive) {
      setRects([]);
      boxesRef.current = [];
      return;
    }
    const measure = () => {
      const frame = frameRef.current;
      const root = cardRef.current;
      if (!frame || !root) return;
      const base = frame.getBoundingClientRect();
      const boxes = Array.from(root.querySelectorAll<HTMLElement>('[data-box]'));
      boxesRef.current = boxes;
      const next = boxes.map((box) => {
        // (the box's drawn layer, where it has one: it reaches past the box's own edges)
        const drawn = box.querySelector<HTMLElement>(':scope > [data-box-bg]') || box;
        const r = drawn.getBoundingClientRect();
        return { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
      });
      setRects((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      const fit = readCardTextFit(root);
      setTextFit((prev) => (JSON.stringify(prev) === JSON.stringify(fit) ? prev : fit));
    };
    measure();
    const timers = [60, 250, 600, 1200, 2500].map((ms) => setTimeout(measure, ms));
    window.addEventListener('resize', measure);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', measure);
    };
  }, [interactive, card.id, scale]);

  const passiveCount = (card.passives || []).length;
  const abilities = card.abilities || [];

  // Each printed ability: whether it can be used now (and why not: every rule the game checks when it's used, e.g.
  // once per turn, locks, "only if this unit moved this turn", barred costs), and whether it's the one being used.
  // One with a choice of cost (e.g. [1, 2]) is usable with AP for its cheapest; its costs are then offered under it.
  const abilityStates = abilities.map((ability) => {
    if (!turnUnit) return { usable: false, active: false, cost: '', why: '' };
    const costs = Array.isArray(ability.cost) ? ability.cost : [getAbilityApCost(ability)];
    const cheapest = Math.min(...costs);
    const check = canUseAbilityThisTurn(turnUnit, ability);
    const usable = !locked && check.allowed && turnUnit.currentAp >= cheapest;
    const active =
      activeAbility?.id === ability.id ||
      activeAbility?.parentAbilityId === ability.id ||
      activeAbility?.baseAbilityId === ability.id;
    const why = locked
      ? 'finish the current choice first'
      : !check.allowed
        ? check.reason || 'not now'
        : turnUnit.currentAp < cheapest
          ? `needs ${cheapest} AP`
          : '';
    return { usable, active, cost: costs.join('–'), why };
  });
  const stateKey = JSON.stringify(abilityStates.map((a) => [a.usable, a.active]));
  const pulseKey = pulsingKeys ? [...pulsingKeys].sort().join(',') : '';
  const isPulsing = (key: string | undefined) => Boolean(key && pulsingKeys?.has(key));
  // An extra box's swell starts in step with the turn banner when it starts pulsing, and keeps that timing while it
  // pulses (worked out again each render, its timing would jump)
  const pulseDelaysRef = useRef<Record<string, string>>({});
  Object.keys(pulseDelaysRef.current).forEach((k) => {
    if (!isPulsing(k)) delete pulseDelaysRef.current[k];
  });
  const pulseStyleFor = (key: string): React.CSSProperties => {
    if (!pulseDelaysRef.current[key]) pulseDelaysRef.current[key] = String(pulseInStep().animationDelay);
    return { animationDelay: pulseDelaysRef.current[key] };
  };

  // The light, dimming and press on the card's own ability boxes (drawn under their text, see above)
  useEffect(() => {
    if (!interactive) return;
    const touched: HTMLElement[] = [];
    abilities.forEach((_, i) => {
      const box = boxesRef.current[passiveCount + i];
      if (!box) return;
      const layer = box.querySelector<HTMLElement>(':scope > [data-box-bg]') || box;
      const st = abilityStates[i];
      layer.style.boxShadow = pressed === i ? PRESSED_GLOW : st.active ? ACTIVE_GLOW : hovered === i && st.usable ? HOVER_GLOW : '';
      box.style.opacity = st.usable || st.active ? '' : '0.5';
      box.style.transform = pressed === i ? 'scale(0.97)' : '';
      box.style.transition = 'transform 100ms, opacity 150ms';
      layer.style.transition = 'box-shadow 120ms';
      // (worth a look: the gentle swell, in step with the turn banner)
      if (isPulsing(abilities[i].id)) {
        box.classList.add('slow-pulse-soft');
        box.style.animationDelay = String(pulseInStep().animationDelay);
      }
      touched.push(box, layer);
    });
    return () => {
      touched.forEach((el) => {
        el.style.boxShadow = '';
        el.style.opacity = '';
        el.style.transform = '';
        el.classList.remove('slow-pulse-soft');
        el.style.animationDelay = '';
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, rects, hovered, pressed, stateKey, card.id, pulseKey]);

  // The unit's AP as it is now, on the card's own AP badge (its number; amber once some is spent), while its options are
  // being picked; the printed number comes back after
  const currentAp = turnUnit ? turnUnit.currentAp : null;
  useEffect(() => {
    if (currentAp === null) return;
    const badge = cardRef.current?.querySelector<HTMLElement>('[title^="Action Points:"]');
    const number = badge?.lastElementChild as HTMLElement | null | undefined;
    if (!badge || !number) return;
    const printed = number.textContent;
    number.textContent = String(currentAp);
    number.style.color = currentAp < card.ap ? '#fcd34d' : '';
    badge.title = `Action Points: ${currentAp} of ${card.ap} left this turn`;
    // (the unit taking its turn: its AP swells gently, in step with the suggested abilities)
    badge.classList.add('slow-pulse-soft');
    badge.style.animationDelay = String(pulseInStep().animationDelay);
    return () => {
      number.textContent = printed;
      number.style.color = '';
      badge.classList.remove('slow-pulse-soft');
      badge.style.animationDelay = '';
      badge.title = `Action Points: ${card.ap}`;
    };
  }, [currentAp, card.id, card.ap, rects]);

  // The extra boxes are the card's own (CardAbilityBox: the shared off-black surface), at its fitted text size; the area
  // under the card takes the card's border colour round it
  // (the area under the card carries the face on: its fade from black down the sides and along the bottom, not the top;
  // the borrowed abilities laid over the card: the colour alone)
  const continuedBorder = getCardFill(card, { sides: true, bottom: true });
  const overlayBorder = getCardFill(card, {});
  const fit = { ...DEFAULT_TEXT_FIT, ...textFit };
  // An action as the ability the box shows: the ability itself when it is one, else one made of its name, text and tags
  const asAbility = (a: FocusAction): CardAbility =>
    a.ability ?? ({ id: a.key, name: a.name, cost: 0, text: a.text || '', tags: a.tags } as CardAbility);

  // One action's box (an action under the card, a borrowed ability, a choice of cost): see FocusAction. The light, dimming
  // and press are the printed abilities' own.
  const renderBox = (a: FocusAction) => {
    const isPressed = pressedAction === a.key;
    const glow = isPressed ? PRESSED_GLOW : a.active ? ACTIVE_GLOW : hoveredAction === a.key && a.usable ? HOVER_GLOW : undefined;
    return (
      <button
        key={a.key}
        type="button"
        disabled={!a.usable}
        onClick={a.onClick}
        onMouseDown={() => a.usable && setPressedAction(a.key)}
        onMouseUp={() => setPressedAction(null)}
        onMouseEnter={() => {
          setHoveredAction(a.key);
          a.onHover?.(true);
        }}
        onMouseLeave={() => {
          setHoveredAction(null);
          setPressedAction(null);
          a.onHover?.(false);
        }}
        title={a.usable ? `${a.name}${a.cost ? ` (${a.cost})` : ''}` : `${a.name}: ${a.why || 'not now'}`}
        className={`block w-full text-left ${a.usable ? 'cursor-pointer' : 'cursor-not-allowed'} ${isPulsing(a.key) ? 'slow-pulse-soft' : ''}`}
        style={{
          ...(isPulsing(a.key) ? pulseStyleFor(a.key) : {}),
          opacity: a.usable || a.active ? undefined : 0.5,
          transform: isPressed ? 'scale(0.97)' : undefined,
          transition: 'transform 100ms, opacity 150ms'
        }}
      >
        <CardAbilityBox ability={asAbility(a)} costLabel={a.cost ?? null} frameStyle={{ boxShadow: glow, transition: 'box-shadow 120ms' }} />
      </button>
    );
  };

  // A borrowing's progress and its Done and Cancel, after its borrowed abilities (in em: drawn among the card's boxes)
  const renderSubControls = () => {
    const c = subActions?.controls;
    if (!c || (!c.label && !c.onDone && !c.onCancel)) return null;
    return (
      <div className="flex items-center gap-[0.3em] flex-wrap text-[0.6em]">
        {c.label && <span className="font-mono text-amber-200 mr-auto">{c.label}</span>}
        {c.onDone && (
          <button
            type="button"
            onClick={c.onDone}
            className="px-[0.5em] py-[0.15em] rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold uppercase tracking-wider cursor-pointer transition-colors"
            title="Stop choosing and use the chosen abilities"
          >
            Done
          </button>
        )}
        {c.onCancel && (
          <button
            type="button"
            onClick={c.onCancel}
            className="px-[0.5em] py-[0.15em] rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold uppercase tracking-wider cursor-pointer border border-stone-600 transition-colors"
            title="Cancel"
          >
            Cancel
          </button>
        )}
      </div>
    );
  };

  // How far (card pixels) a borrowed ability's box is set in from the one borrowing it
  const indent = 48;
  // The printed ability doing the borrowing (if that's one of the card's own): its borrowed abilities go just under its box
  const borrowerIndex = subActions ? abilities.findIndex((ab) => ab.id === subActions.parentKey) : -1;
  const borrowerRect = borrowerIndex >= 0 ? rects[passiveCount + borrowerIndex] : undefined;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {/* (the gentle swell of the options worth a look) */}
      <style>{SLOW_PULSE_SOFT_CSS}</style>
      <div className="w-full flex flex-col shadow-2xl rounded-xl">
        <div ref={frameRef} className="relative w-full aspect-[5/7] overflow-visible select-none">
          <div className={`absolute inset-0 overflow-hidden bg-black ${actions.length > 0 ? 'rounded-t-xl' : 'rounded-xl'}`}>
            <div
              ref={cardRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${CARD_FACE_WIDTH}px`, height: '1050px' }}
            >
              <CardView
                card={card}
                customArtUrl={customArtUrl}
                scale={1}
                id={`focus-card-${card.id}`}
                fillEdges={actions.length > 0 ? { top: true, sides: true } : undefined}
              />
            </div>
          </div>
          {tag && (
            <span
              className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest shadow ${tag.className}`}
            >
              {tag.text}
            </span>
          )}

          {/* Abilities a printed ability is borrowing, while it's selected: just under its box, set in, on the card's
              border colour (as the rest of the card), raised by a shadow over the card's text beneath */}
          {subActions && borrowerRect && (subActions.items.length > 0 || subActions.controls) && (
            <ScaledCardText
              scale={scale}
              width={Math.max(0, (borrowerRect.width - indent * scale) / scale)}
              fit={fit}
              className="z-20 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
              style={{
                ...overlayBorder,
                position: 'absolute',
                top: borrowerRect.top + borrowerRect.height + Math.round(4 * scale),
                left: borrowerRect.left + indent * scale,
                width: borrowerRect.width - indent * scale
              }}
            >
              {subActions.items.map((sub) => (
                <React.Fragment key={sub.key}>{renderBox(sub)}</React.Fragment>
              ))}
              {renderSubControls()}
            </ScaledCardText>
          )}

          {/* The printed abilities: clickable layers over their boxes (the light is drawn on the box itself) */}
          {interactive &&
            turnUnit &&
            abilities.map((ability, i) => {
              const rect = rects[passiveCount + i];
              if (!rect) return null;
              const st = abilityStates[i];
              return (
                <button
                  key={ability.id || i}
                  type="button"
                  disabled={!st.usable}
                  onClick={() => onAbilityClick?.(ability)}
                  onMouseDown={() => st.usable && setPressed(i)}
                  onMouseUp={() => setPressed(null)}
                  onMouseEnter={() => {
                    setHovered(i);
                    onHoverAbility?.(ability);
                  }}
                  onMouseLeave={() => {
                    setHovered(null);
                    setPressed(null);
                    onHoverAbility?.(null);
                  }}
                  title={st.usable ? `${ability.name} (${st.cost} AP)` : `${ability.name}: ${st.why}`}
                  className={`absolute rounded-lg bg-transparent ${st.usable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
                />
              );
            })}
        </div>

        {/* The other actions: the card's text area carried on below it, as the card draws it (its own boxes, its colour,
            its text size), lined up with the card's text */}
        {actions.length > 0 && (
          <ScaledCardText
            scale={scale}
            width={CARD_FACE_WIDTH}
            fit={fit}
            border={continuedBorder}
            className="w-full rounded-b-xl"
          >
            {actions.map((a) => (
              <React.Fragment key={a.key}>
                {renderBox(a)}
                {/* Abilities it's borrowing, while it's selected (e.g. an Inspiring ability granted to it that uses a
                    promoted card's ability): under it, set in */}
                {subActions && subActions.parentKey === a.key && (
                  <div className="flex flex-col gap-[var(--card-gap)]" style={{ marginLeft: indent }}>
                    {subActions.items.map((sub) => (
                      <React.Fragment key={sub.key}>{renderBox(sub)}</React.Fragment>
                    ))}
                    {renderSubControls()}
                  </div>
                )}
              </React.Fragment>
            ))}
          </ScaledCardText>
        )}
      </div>
      {children}
    </div>
  );
};
