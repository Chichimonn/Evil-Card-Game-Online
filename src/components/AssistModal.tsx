import React, { useState, useEffect } from 'react';
import { CardItem, CardAbility } from '../types/card';
import { CardArtFallback } from './CardArtFallback';
import { CardPreview } from './CardPreview';
import { X, Sparkles, ChevronLeft, ArrowRight } from 'lucide-react';

interface AssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistCards: { card: CardItem; index: number }[];
  onSelectAssist: (card: CardItem, index: number, ability: CardAbility) => void;
  customArtMap: Record<string, string>;
}

export const AssistModal: React.FC<AssistModalProps> = ({
  isOpen,
  onClose,
  assistCards,
  onSelectAssist,
  customArtMap
}) => {
  const [selectedCardEntry, setSelectedCardEntry] = useState<{ card: CardItem; index: number } | null>(null);
  const [hoveredCard, setHoveredCard] = useState<CardItem | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCardEntry(null);
      setHoveredCard(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const previewCard = hoveredCard || selectedCardEntry?.card || (assistCards.length > 0 ? assistCards[0].card : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-3xl bg-[#272021] border border-amber-500/80 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#433738]">
          <div className="flex items-center gap-2">
            {selectedCardEntry && (
              <button
                onClick={() => setSelectedCardEntry(null)}
                className="flex items-center gap-1 text-xs font-mono text-amber-300 hover:text-white px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 transition-colors mr-1 cursor-pointer"
                title="Back to card list"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-400"></span>
            </span>
            <h3 className="text-xl font-bold font-serif text-amber-200 truncate">
              {selectedCardEntry ? `Select Ability: ${selectedCardEntry.card.name}` : 'Use Assist / Inspiring Ability'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Explanation */}
        {!selectedCardEntry ? (
          <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-2.5 text-xs font-mono text-stone-300 space-y-1">
            <p>
              <strong className="text-amber-300">Assist:</strong> Reinforced to back row immediately, uses ability for free, then sent to Graveyard.
            </p>
            <p>
              <strong className="text-purple-300">Inspiring:</strong> Discarded to Graveyard, granting the inspiring ability to your active unit until the end of the turn.
            </p>
          </div>
        ) : (
          <p className="text-xs font-mono text-stone-300">
            {selectedCardEntry.card.name} has multiple Assist/Inspiring abilities. Choose which ability to activate:
          </p>
        )}

        {/* List & Preview Split */}
        <div className="flex gap-5 items-stretch">
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Step 1: List Cards in Hand */}
            {!selectedCardEntry ? (
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar">
            {assistCards.length === 0 ? (
              <div className="text-center p-6 text-stone-400 font-mono text-xs">
                No cards with an Assist or Inspiring ability in your hand.
              </div>
            ) : (
              assistCards.map(({ card, index }) => {
                const qualifyingAbilities = (card.abilities || []).filter(
                  (a) => a.tags?.includes('assist') || a.tags?.includes('inspiring')
                );
                if (qualifyingAbilities.length === 0) return null;

                const hasMultiple = qualifyingAbilities.length > 1;
                const primaryAbility = qualifyingAbilities[0];
                const hasAssist = qualifyingAbilities.some((a) => a.tags?.includes('assist'));
                const hasInspiring = qualifyingAbilities.some((a) => a.tags?.includes('inspiring'));

                return (
                  <div
                    key={`assist-modal-card-${card.id}-${index}`}
                    onMouseEnter={() => setHoveredCard(card)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => {
                      if (hasMultiple) {
                        setSelectedCardEntry({ card, index });
                      } else {
                        onSelectAssist(card, index, primaryAbility);
                      }
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-stone-900/90 border border-stone-700/80 hover:border-amber-400 hover:bg-amber-950/30 transition-all cursor-pointer group shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-16 rounded-md overflow-hidden shrink-0 border border-stone-700 bg-stone-950 relative">
                        <CardArtFallback card={card} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-stone-100 font-serif font-bold text-sm truncate">
                            {card.name}
                          </strong>
                          {hasAssist && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-400/80 text-amber-300 font-bold uppercase">
                              Assist
                            </span>
                          )}
                          {hasInspiring && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-400/80 text-purple-300 font-bold uppercase">
                              Inspiring
                            </span>
                          )}
                        </div>

                        {!hasMultiple ? (
                          <>
                            <span className="text-xs text-amber-200 font-serif font-semibold mt-0.5">
                              {primaryAbility.name}
                            </span>
                            <span className="text-[11px] text-stone-400 font-sans line-clamp-2">
                              {primaryAbility.text}
                            </span>
                          </>
                        ) : (
                          <div className="mt-1 flex flex-col gap-0.5">
                            <span className="text-xs font-serif font-semibold text-amber-300">
                              {qualifyingAbilities.length} Qualifying Abilities:
                            </span>
                            <span className="text-[11px] text-stone-400 font-mono">
                              {qualifyingAbilities.map((a) => a.name).join(' • ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg font-serif font-bold text-xs shrink-0 ml-3 shadow transition-colors flex items-center gap-1 cursor-pointer ${
                        hasMultiple
                          ? 'bg-stone-800 text-amber-300 border border-amber-500/60 group-hover:bg-amber-900/60'
                          : primaryAbility.tags?.includes('inspiring')
                          ? 'bg-purple-600 text-white group-hover:bg-purple-500'
                          : 'bg-amber-500 text-stone-950 group-hover:bg-amber-400'
                      }`}
                    >
                      {hasMultiple ? (
                        <>
                          <span>Choose Ability</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-current" />
                          <span>{primaryAbility.tags?.includes('inspiring') ? 'Inspire' : 'Activate'}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Step 2: Pick Ability for Selected Card */
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar">
            {(selectedCardEntry.card.abilities || [])
              .filter((a) => a.tags?.includes('assist') || a.tags?.includes('inspiring'))
              .map((ability) => {
                const isInspiring = ability.tags?.includes('inspiring');
                const isAssist = ability.tags?.includes('assist');

                return (
                  <div
                    key={`ability-choice-${ability.id}`}
                    onClick={() => onSelectAssist(selectedCardEntry.card, selectedCardEntry.index, ability)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer shadow-md group ${
                      isInspiring
                        ? 'bg-stone-900/95 border-purple-500/50 hover:border-purple-400 hover:bg-purple-950/30'
                        : 'bg-stone-900/95 border-amber-500/50 hover:border-amber-400 hover:bg-amber-950/30'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-stone-100 font-serif font-bold text-sm">
                          {ability.name}
                        </strong>
                        {isAssist && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-400/80 text-amber-300 font-bold uppercase">
                            Assist
                          </span>
                        )}
                        {isInspiring && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-400/80 text-purple-300 font-bold uppercase">
                            Inspiring
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-300 font-sans mt-1 leading-relaxed">
                        {ability.text}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`px-3.5 py-1.5 rounded-lg font-serif font-bold text-xs shrink-0 shadow flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        isInspiring
                          ? 'bg-purple-600 text-white group-hover:bg-purple-500'
                          : 'bg-amber-500 text-stone-950 group-hover:bg-amber-400'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      <span>{isInspiring ? 'Discard & Inspire Unit' : 'Activate Assist'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          {/* Card Preview Column */}
          {previewCard && (
            <div className="w-56 sm:w-64 shrink-0 hidden sm:flex flex-col items-center justify-center p-3 bg-stone-950/70 rounded-xl border border-[#433738]">
              <CardPreview card={previewCard} customArtUrl={customArtMap[previewCard.id]} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-[#433738]">
          {selectedCardEntry ? (
            <button
              onClick={() => setSelectedCardEntry(null)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Cards</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
