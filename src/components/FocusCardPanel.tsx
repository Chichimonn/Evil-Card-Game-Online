import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CardAbility, CardItem } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import { CardView, CARD_HEADING_FONT, CARD_BODY_FONT } from './CardView';
import { getAbilityApCost } from '../utils/promotedAbilities';
import { isOncePerTurn, getTurnUsageCount, isAbilityLockedForUnit } from '../utils/turnLimits';

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
 * An action the unit taking the turn has besides its printed abilities (Move, Draw, Assist, an ability granted to it),
 * drawn as one more ability box under the card's own: the same look (its name hanging over the top of the box, outlined
 * in black), in the colour its button always had.
 */
export interface FocusAction {
  key: string;
  name: string;
  cost?: string; // e.g. "1 AP"
  text?: string;
  // Its colour: the box's border, and the name's colour
  tone: { border: string; name: string };
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
  children?: React.ReactNode;
}

type BoxRect = { left: number; top: number; width: number; height: number };

// The light around a box: on hover, and (stronger) while it's the ability being used
const HOVER_GLOW = '0 0 0 3px rgba(252, 211, 77, 1), 0 0 18px rgba(252, 211, 77, 0.75)';
const ACTIVE_GLOW = '0 0 0 4px rgba(251, 191, 36, 1), 0 0 26px rgba(251, 191, 36, 0.9)';
const PRESSED_GLOW = 'inset 0 4px 14px rgba(0, 0, 0, 0.6), 0 0 0 3px rgba(252, 211, 77, 1)';

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

  // Each printed ability: whether it can be used now (and why not), and whether it's the one being used
  const abilityStates = abilities.map((ability) => {
    if (!turnUnit) return { usable: false, active: false, cost: 0, why: '' };
    // (one with a choice of cost is picked from its buttons in the action menu)
    const variableCost = Array.isArray(ability.cost);
    const cost = getAbilityApCost(ability);
    const usedUp = isOncePerTurn(ability) && getTurnUsageCount(turnUnit, ability.id || ability.name) >= 1;
    const isLocked = isAbilityLockedForUnit(turnUnit, ability);
    const usable = !locked && !variableCost && !usedUp && !isLocked && turnUnit.currentAp >= cost;
    const active = activeAbility?.id === ability.id || activeAbility?.parentAbilityId === ability.id;
    const why = variableCost
      ? 'choose its cost in the action menu'
      : isLocked
        ? 'locked'
        : usedUp
          ? 'already used this turn'
          : turnUnit.currentAp < cost
            ? `needs ${cost} AP`
            : locked
              ? 'finish the current choice first'
              : '';
    return { usable, active, cost, why };
  });
  const stateKey = JSON.stringify(abilityStates.map((a) => [a.usable, a.active]));

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
      touched.push(box, layer);
    });
    return () => {
      touched.forEach((el) => {
        el.style.boxShadow = '';
        el.style.opacity = '';
        el.style.transform = '';
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, rects, hovered, pressed, stateKey, card.id]);

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
    return () => {
      number.textContent = printed;
      number.style.color = '';
      badge.title = `Action Points: ${card.ap}`;
    };
  }, [currentAp, card.id, card.ap, rects]);

  // The extra actions' boxes, in the card's proportions: the name line, and how far it hangs over the box's top
  const nameSize = Math.round(38 * scale);
  const overhang = Math.round(nameSize * 0.55);

  // One action's box (an action under the card, or a borrowed ability): see FocusAction
  const renderBox = (a: FocusAction) => {
    const isPressed = pressedAction === a.key;
    return (
            <button
              key={a.key}
              type="button"
              disabled={!a.usable}
              onClick={a.onClick}
              onMouseDown={() => a.usable && setPressedAction(a.key)}
              onMouseUp={() => setPressedAction(null)}
              onMouseEnter={() => a.onHover?.(true)}
              onMouseLeave={() => {
                setPressedAction(null);
                a.onHover?.(false);
              }}
              title={a.usable ? `${a.name}${a.cost ? ` (${a.cost})` : ''}` : `${a.name}: ${a.why || 'not now'}`}
              className={`group relative isolate w-full text-left transition-[transform,opacity] duration-100 ${
                a.usable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
              }`}
              style={{
                marginTop: -overhang,
                padding: `0 ${Math.round(14 * scale)}px ${Math.round(10 * scale)}px`,
                transform: isPressed ? 'scale(0.97)' : undefined
              }}
            >
              {/* The box itself, from halfway down the name: under the text, so its light never crosses the name */}
              <span
                aria-hidden
                className={`absolute inset-x-0 bottom-0 -z-10 rounded-lg border-2 bg-stone-900 transition-shadow duration-100 ${a.tone.border} ${
                  a.active
                    ? 'shadow-[0_0_0_4px_rgba(251,191,36,1),0_0_26px_rgba(251,191,36,0.9)]'
                    : a.usable
                      ? 'group-hover:shadow-[0_0_0_3px_rgba(252,211,77,1),0_0_18px_rgba(252,211,77,0.75)]'
                      : ''
                }`}
                style={{
                  top: overhang,
                  boxShadow: isPressed ? PRESSED_GLOW : undefined
                }}
              />
              <span className="flex items-center" style={{ gap: Math.round(10 * scale) }}>
                {a.cost && (
                  <span
                    className="inline-flex items-center bg-amber-600 text-white font-bold rounded-md shrink-0"
                    style={{ fontSize: Math.round(26 * scale), padding: `0 ${Math.round(6 * scale)}px`, fontFamily: CARD_BODY_FONT }}
                  >
                    {a.cost}
                  </span>
                )}
                <span
                  className={a.tone.name}
                  style={{
                    fontFamily: CARD_HEADING_FONT,
                    fontSize: nameSize,
                    lineHeight: 1.1,
                    // (outlined in black, as a box's first line is on the card, where it hangs over the edge)
                    WebkitTextStroke: `${Math.max(2, Math.round(7 * scale))}px #0c0a09`,
                    paintOrder: 'stroke fill'
                  }}
                >
                  {a.name}
                </span>
              </span>
              {a.text && (
                <span className="block text-white" style={{ fontFamily: CARD_BODY_FONT, fontSize: Math.round(30 * scale), lineHeight: 1.2 }}>
                  {a.text}
                </span>
              )}
            </button>
    );
  };

  // A borrowing's progress and its Done and Cancel, after its borrowed abilities
  const renderSubControls = () => {
    const c = subActions?.controls;
    if (!c || (!c.label && !c.onDone && !c.onCancel)) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {c.label && <span className="text-[10px] font-mono text-amber-200 mr-auto">{c.label}</span>}
        {c.onDone && (
          <button
            type="button"
            onClick={c.onDone}
            className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
            title="Stop choosing and use the chosen abilities"
          >
            Done
          </button>
        )}
        {c.onCancel && (
          <button
            type="button"
            onClick={c.onCancel}
            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-[10px] uppercase tracking-wider cursor-pointer border border-stone-600 transition-colors"
            title="Cancel (the AP is already spent; any remaining uses are lost)"
          >
            Cancel
          </button>
        )}
      </div>
    );
  };

  // How far a borrowed ability's box is set in from the one borrowing it
  const indent = Math.round(48 * scale);
  // The printed ability doing the borrowing (if that's one of the card's own): its borrowed abilities go just under its box
  const borrowerIndex = subActions ? abilities.findIndex((ab) => ab.id === subActions.parentKey) : -1;
  const borrowerRect = borrowerIndex >= 0 ? rects[passiveCount + borrowerIndex] : undefined;

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="w-full flex flex-col shadow-2xl rounded-xl">
        <div ref={frameRef} className="relative w-full aspect-[5/7] overflow-visible select-none">
          <div className={`absolute inset-0 overflow-hidden bg-black ${actions.length > 0 ? 'rounded-t-xl' : 'rounded-xl'}`}>
            <div
              ref={cardRef}
              className="absolute top-0 left-0 pointer-events-none"
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: '750px', height: '1050px' }}
            >
              <CardView card={card} customArtUrl={customArtUrl} scale={1} id={`focus-card-${card.id}`} />
            </div>
          </div>
          {tag && (
            <span
              className={`absolute -top-3 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest shadow ${tag.className}`}
            >
              {tag.text}
            </span>
          )}

          {/* Abilities a printed ability is borrowing, while it's selected: just under its box, set in, on black so they
              read over the card's text beneath */}
          {subActions && borrowerRect && (subActions.items.length > 0 || subActions.controls) && (
            <div
              className="absolute z-20 bg-black/95 rounded-lg flex flex-col shadow-[0_8px_24px_rgba(0,0,0,0.8)]"
              style={{
                top: borrowerRect.top + borrowerRect.height + Math.round(4 * scale),
                left: borrowerRect.left + indent,
                width: borrowerRect.width - indent,
                padding: `${overhang + Math.round(6 * scale)}px ${Math.round(10 * scale)}px ${Math.round(12 * scale)}px`,
                gap: overhang + Math.round(14 * scale)
              }}
            >
              {subActions.items.map((sub) => (
                <React.Fragment key={sub.key}>{renderBox(sub)}</React.Fragment>
              ))}
              {renderSubControls()}
            </div>
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

        {/* The other actions: the card's text area carried on below it, one box each, its name hanging over the top of
            the box as on the card */}
        {actions.length > 0 && (
          <div
            className="w-full bg-black rounded-b-xl flex flex-col"
            style={{
              padding: `${overhang + Math.round(6 * scale)}px ${Math.round(24 * scale)}px ${Math.round(24 * scale)}px`,
              gap: overhang + Math.round(14 * scale)
            }}
          >
            {actions.map((a) => (
              <React.Fragment key={a.key}>
                {renderBox(a)}
                {/* Abilities it's borrowing, while it's selected (e.g. an Inspiring ability granted to it that uses a
                    promoted card's ability): under it, set in */}
                {subActions && subActions.parentKey === a.key && (
                  <div className="flex flex-col" style={{ marginLeft: indent, gap: overhang + Math.round(14 * scale), marginTop: overhang }}>
                    {subActions.items.map((sub) => (
                      <React.Fragment key={sub.key}>{renderBox(sub)}</React.Fragment>
                    ))}
                    {renderSubControls()}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};
