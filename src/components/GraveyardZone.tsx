import React, { useState, useMemo } from 'react';
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
}

// Scaled up by 50% for gameplay readability
export const GraveyardZone: React.FC<GraveyardZoneProps> = ({
  title,
  owner,
  cards,
  customArtMap,
  onHoverCard
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<CardItem | null>(null);
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
        className="flex flex-col items-center select-none relative group/gy"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Graveyard Label */}
        <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-stone-300 font-bold mb-1 flex items-center gap-1">
          <Skull className="w-3 h-3 text-stone-400" />
          <span>{title}</span>
          <span className="text-stone-400 font-normal">({cards.length})</span>
        </span>

        {/* Shrunk compact graveyard card slot: w-12 sm:w-14 */}
        <div
          onClick={() => {
            if (cards.length > 0) setShowModal(true);
          }}
          className={`w-12 sm:w-14 aspect-[5/7] rounded-lg flex flex-col items-center justify-center p-0.5 transition-all relative overflow-hidden ${
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

      {/* Graveyard Modal Overlay */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowModal(false)}
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
                  <p className="text-xs font-mono text-stone-400">{cards.length} total cards removed from play</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Cards Grid with Preview Panel */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-stone-900/50">
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {groupedCards.length === 0 ? (
                  <div className="py-12 text-center text-stone-500 font-mono text-sm">
                    Graveyard is empty
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {groupedCards.map(({ card, count }) => (
                      <div 
                        key={`gy-modal-card-${card.id}`}
                        onMouseEnter={() => {
                          setHoveredCard(card);
                          onHoverCard?.(card);
                        }}
                        onMouseLeave={() => {
                          setHoveredCard(null);
                          onHoverCard?.(null);
                        }}
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

              {/* Modal Card Preview Side Panel */}
              <div className="w-64 sm:w-72 shrink-0 hidden md:flex flex-col items-center justify-center p-4 bg-stone-950/80 border-t md:border-t-0 md:border-l border-stone-800">
                {hoveredCard ? (
                  <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-150">
                    <CardPreview card={hoveredCard} customArtUrl={customArtMap[hoveredCard.id]} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4 text-stone-500 font-mono text-xs gap-2 select-none">
                    <Eye className="w-8 h-8 opacity-40 text-stone-400" />
                    <p>Hover over any card in the graveyard to preview its full details and abilities</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-stone-800 bg-stone-950 text-right">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 text-xs font-mono font-bold bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
