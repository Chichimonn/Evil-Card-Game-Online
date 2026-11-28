import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CardItem } from '../types/card';
import { CardThumbnail } from './CardThumbnail';
import { CardPreview } from './CardPreview';
import { Skull, X, Eye } from 'lucide-react';

interface GraveyardZoneProps {
  title: string;
  owner: 'player' | 'opponent';
  cards: CardItem[];
  customArtMap: Record<string, string>;
  onHoverCard?: (card: CardItem | null) => void;
  // Leave out the label over the card slot (the title still heads the inspect window)
  hideLabel?: boolean;
  // The card slot's width, as a class (its height follows the card's shape); small by default
  slotWidthClass?: string;
}

// Scaled up by 50% for gameplay readability
export const GraveyardZone: React.FC<GraveyardZoneProps> = ({
  title,
  owner,
  cards,
  customArtMap,
  onHoverCard,
  hideLabel = false,
  slotWidthClass = 'w-12 sm:w-14'
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // The card opened from the graveyard, shown big in its own window over it
  const [openCard, setOpenCard] = useState<CardItem | null>(null);
  // (Escape closes the open card first, then the graveyard)
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openCard) setOpenCard(null);
      else setShowModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal, openCard]);
  const closeGraveyard = () => {
    setOpenCard(null);
    setShowModal(false);
  };
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  // Group cards for the visual grid
  const groupedCards = useMemo(() => {
    const map = new Map<string, { card: CardItem; count: number }>();
    cards.forEach((card) => {
      const existing = map.get(card.id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(card.id, { card, count: 1 });
      }
    });
    return Array.from(map.values());
  }, [cards]);

  return (
    <>
      <div 
        className={`flex flex-col items-center select-none relative group/gy ${slotWidthClass === 'w-full' ? 'self-stretch' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Graveyard Label */}
        {!hideLabel && <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-stone-300 font-bold mb-1 flex items-center gap-1">
          <Skull className="w-3 h-3 text-stone-400" />
          <span>{title}</span>
          <span className="text-stone-400 font-normal">({cards.length})</span>
        </span>}

        {/* Shrunk compact graveyard card slot: w-12 sm:w-14 */}
        <div
          onClick={() => {
            if (cards.length > 0) setShowModal(true);
          }}
          className={`${slotWidthClass} aspect-[5/7] rounded-lg flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden ${
            topCard
              ? 'border-2 border-stone-700 bg-stone-900 shadow-xl cursor-pointer hover:border-sky-400 group'
              : 'border-2 border-dashed border-stone-800 bg-stone-950/40 text-stone-600'
          }`}
          title={
            topCard
              ? `${title}: ${cards.length} cards. Top card: ${topCard.name}. Click to inspect graveyard.`
              : `${title}: Empty`
          }
        >
          {topCard ? (
            <>
              <div className="absolute inset-0 z-0">
                <CardThumbnail card={topCard} customArtUrl={customArtMap[topCard.id]} />
              </div>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors z-10 flex items-center justify-center">
                <div className="p-1.5 rounded-full bg-stone-950/80 border border-stone-700 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              {cards.length > 1 && (
                <div className="absolute bottom-1 right-1 z-20 px-1 py-0.2 rounded bg-stone-950/90 border border-stone-700 text-[10px] font-mono font-bold text-stone-300 shadow-md">
                  +{cards.length - 1}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-stone-600">
              <Skull className="w-5 h-5 stroke-1" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Empty</span>
            </div>
          )}
        </div>
      </div>

      {/* Graveyard Modal Overlay. Drawn straight into the app's root rather than here: the slot sits in boxes with a
          backdrop blur, which would otherwise hold a "fixed" window inside them (shrunk to the box, unreadable). */}
      {showModal && createPortal(<>
      {(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeGraveyard}
        >
          <div 
            className="w-full max-w-4xl max-h-[85vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-stone-800 text-stone-300">
                  <Skull className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-100">{title}</h3>
                  <p className="text-xs font-mono text-stone-400">
                    {cards.length} total cards removed from play · click a card to see it in full
                  </p>
                </div>
              </div>
              <button
                onClick={closeGraveyard}
                className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Cards Grid */}
            <div className="flex-1 overflow-hidden flex flex-col bg-stone-900/50">
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {groupedCards.length === 0 ? (
                  <div className="py-12 text-center text-stone-500 font-mono text-sm">
                    Graveyard is empty
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {groupedCards.map(({ card, count }) => (
                      <div 
                        key={`gy-modal-card-${card.id}`}
                        onClick={() => setOpenCard(card)}
                        onMouseEnter={() => onHoverCard?.(card)}
                        onMouseLeave={() => onHoverCard?.(null)}
                        className="flex flex-col gap-1.5 bg-stone-950 p-2 rounded-xl border border-stone-800 hover:border-sky-500/50 transition-colors group relative cursor-pointer"
                      >
                        <div className="w-full aspect-[5/7] rounded-lg overflow-hidden relative shadow-md">
                          <CardThumbnail card={card} customArtUrl={customArtMap[card.id]} />
                          {count > 1 && (
                            <div className="absolute top-1.5 right-1.5 z-20 px-2 py-0.5 rounded-full bg-sky-500 text-stone-950 text-xs font-mono font-black shadow-lg">
                              ×{count}
                            </div>
                          )}
                        </div>
                        <div className="px-1 py-0.5">
                          <div className="font-serif font-bold text-xs text-stone-200 truncate">{card.name}</div>
                          <div className="text-[10px] font-mono text-stone-400 flex items-center justify-between mt-0.5">
                            <span>{card.hp} HP</span>
                            <span>{card.ap} AP</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-stone-800 bg-stone-950 text-right">
              <button
                onClick={closeGraveyard}
                className="px-4 py-1.5 text-xs font-mono font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The opened card, big in its own window over the graveyard (click anywhere or Escape to go back) */}
      {openCard && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setOpenCard(null)}
          title="Click to go back to the graveyard"
        >
          <button
            onClick={() => setOpenCard(null)}
            className="absolute top-4 right-4 p-2 text-stone-300 hover:text-white rounded-lg bg-stone-900/80 hover:bg-stone-800 border border-stone-700 transition-colors cursor-pointer"
            aria-label="Back to the graveyard"
          >
            <X className="w-5 h-5" />
          </button>
          <CardPreview
            card={openCard}
            customArtUrl={customArtMap[openCard.id]}
            // (the page is drawn at 125%, so 68vh is 85% of the window)
            imageClassName="max-h-[68vh] max-w-[72vw]"
          />
        </div>
      )}
      </>, document.querySelector('[data-app-root]') ?? document.body)}
    </>
  );
};
