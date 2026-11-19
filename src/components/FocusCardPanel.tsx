import React, { useLayoutEffect, useRef, useState } from 'react';
import { CardAbility, CardItem } from '../types/card';
import { BattlefieldUnit } from '../types/game';
import { CardView } from './CardView';
import { getAbilityApCost } from '../utils/promotedAbilities';
import { isOncePerTurn, getTurnUsageCount, isAbilityLockedForUnit } from '../utils/turnLimits';

/**
 * The match's one big card: the card in focus (a hand card hovered, a unit on the board, or the unit taking the turn),
 * drawn live as the card itself. For the unit taking the turn, the abilities printed on it are its buttons: each one's
 * box lights up around its edge on hover and presses in when clicked (an ability that can't be used now is dimmed).
 * Everything else that unit can do (Move, Draw, Pass, granted and promoted abilities...) goes underneath, as children.
 *
 * The buttons are see-through layers laid over the card's own ability boxes (found by their data-box marker, the
 * passives' boxes first, then the abilities' in order), so the card is drawn exactly as everywhere else.
 */

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
  children?: React.ReactNode;
}

type BoxRect = { left: number; top: number; width: number; height: number };

export const FocusCardPanel: React.FC<Props> = ({
  card,
  customArtUrl,
  turnUnit,
  activeAbility,
  onAbilityClick,
  onHoverAbility,
  locked = false,
  tag,
  children
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);
  const [rects, setRects] = useState<BoxRect[]>([]);
  const [pressed, setPressed] = useState<number | null>(null);

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
      return;
    }
    const measure = () => {
      const frame = frameRef.current;
      const root = cardRef.current;
      if (!frame || !root) return;
      const base = frame.getBoundingClientRect();
      const boxes = Array.from(root.querySelectorAll<HTMLElement>('[data-box]'));
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

  return (
    <div className="w-full flex flex-col gap-1.5">
      <div ref={frameRef} className="relative w-full aspect-[5/7] rounded-xl overflow-visible select-none">
        <div className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl bg-black">
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

        {/* The printed abilities, as buttons over their boxes */}
        {interactive &&
          turnUnit &&
          abilities.map((ability, i) => {
            const rect = rects[passiveCount + i];
            if (!rect) return null;
            // (one with a choice of cost is picked from its buttons underneath)
            const variableCost = Array.isArray(ability.cost);
            const cost = getAbilityApCost(ability);
            const usedUp = isOncePerTurn(ability) && getTurnUsageCount(turnUnit, ability.id || ability.name) >= 1;
            const isLocked = isAbilityLockedForUnit(turnUnit, ability);
            const usable = !locked && !variableCost && !usedUp && !isLocked && turnUnit.currentAp >= cost;
            const isActive = activeAbility?.id === ability.id || activeAbility?.parentAbilityId === ability.id;
            const why = variableCost
              ? 'choose its cost from the buttons below'
              : isLocked
                ? 'locked'
                : usedUp
                  ? 'already used this turn'
                  : turnUnit.currentAp < cost
                    ? `needs ${cost} AP`
                    : locked
                      ? 'finish the current choice first'
                      : '';
            return (
              <button
                key={ability.id || i}
                type="button"
                disabled={!usable}
                onClick={() => onAbilityClick?.(ability)}
                onMouseDown={() => usable && setPressed(i)}
                onMouseUp={() => setPressed(null)}
                onMouseEnter={() => onHoverAbility?.(ability)}
                onMouseLeave={() => {
                  setPressed(null);
                  onHoverAbility?.(null);
                }}
                title={usable ? `${ability.name} (${cost} AP)` : `${ability.name}: ${why}`}
                className={`absolute rounded-lg transition-[box-shadow,transform,background-color] duration-100 ${
                  usable ? 'cursor-pointer hover:ring-2 hover:ring-amber-300 hover:shadow-[0_0_18px_rgba(252,211,77,0.75)]' : 'cursor-not-allowed bg-black/45'
                } ${isActive ? 'ring-2 ring-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.85)] animate-pulse' : ''}`}
                style={{
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                  // (pressed: it sinks in)
                  transform: pressed === i ? 'scale(0.97)' : undefined,
                  boxShadow: pressed === i ? 'inset 0 0 0 3px rgba(252,211,77,0.9), inset 0 4px 14px rgba(0,0,0,0.6)' : undefined
                }}
              />
            );
          })}
      </div>
      {children}
    </div>
  );
};
