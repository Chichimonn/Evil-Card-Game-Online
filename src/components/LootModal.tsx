import React, { useState, useEffect } from 'react';
import { CardItem } from '../types/card';
import { PlayerId } from '../types/game';
import { Coins, Check, ArrowDown, Sparkles } from 'lucide-react';
import { CardThumbnail } from './CardThumbnail';
import { CardPreview } from './CardPreview';

interface LootModalProps {
  isOpen: boolean;
  player: PlayerId;
  hand: CardItem[];
  count: number;
  sourceTitle: string;
  unitName: string;
  drawnCards: CardItem[];
  customArtMap: Record<string, string>;
  onConfirmLoot: (selectedIndices: number[]) => void;
}

export const LootModal: React.FC<LootModalProps> = ({
  isOpen,
  player,
  hand,
  count,
  sourceTitle,
  unitName,
  drawnCards,
  customArtMap,
  onConfirmLoot
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [hoveredCard, setHoveredCard] = useState<CardItem | null>(null);

  // Each loot starts with nothing selected. Back-to-back loots (e.g. Plunderer's Due's loot again) keep this window
  // open, so a new loot is recognised by its new draw, count or source, not by the window opening.
  useEffect(() => {
    if (isOpen) {
      setSelectedIndices([]);
      setHoveredCard(null);
    }
  }, [isOpen, drawnCards, count, sourceTitle, player]);

  if (!isOpen) return null;

  const isPlayer1 = player === 'player1';
  const previewCard =
    hoveredCard ||
    (selectedIndices.length > 0 ? hand[selectedIndices[selectedIndices.length - 1]] : hand[0]) ||
    null;

  const targetCount = Math.min(count, hand.length);

  const toggleCardIndex = (index: number) => {
    setSelectedIndices((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      }
      if (targetCount === 1) {
        return [index];
      }
      if (prev.length >= targetCount) {
        // If already at max, do nothing
        return prev;
      }
      return [...prev, index];
    });
  };

  const getSelectionOrderLabel = (index: number) => {
    const orderIdx = selectedIndices.indexOf(index);
    if (orderIdx === -1) return null;
    const orderNum = orderIdx + 1;
    if (targetCount === 1) {
      return '#1 (Bottom)';
    }
    if (orderNum === targetCount) {
      return `#${orderNum} (Very Bottom)`;
    }
    return `#${orderNum} (Bottom)`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-4xl bg-stone-900 border-2 border-amber-500/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-amber-200 flex items-center gap-2">
                <span>{sourceTitle}: Loot {count}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono ${
                    isPlayer1
                      ? 'bg-sky-950 text-sky-300 border border-sky-700'
                      : 'bg-rose-950 text-rose-300 border border-rose-700'
                  }`}
                >
                  {isPlayer1 ? 'Player 1' : 'Player 2'}
                </span>
              </h3>
              <p className="text-xs font-mono text-stone-300 mt-0.5">
                <span className="text-amber-300 font-semibold">{unitName}</span>: Drew {drawnCards.length} card{drawnCards.length !== 1 ? 's' : ''}. Choose {targetCount} card{targetCount !== 1 ? 's' : ''} from your hand to put on the bottom of your deck.
              </p>
            </div>
          </div>
        </div>

        {/* Rule explanation banner */}
        <div className="px-6 py-2.5 bg-amber-950/40 border-b border-amber-900/40 flex items-center gap-2 text-[11px] font-mono text-amber-200">
          <ArrowDown className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Order to Deck:</strong> Cards go to the bottom of your deck in the exact order selected. The <strong>last chosen card</strong> will be placed on the <strong>very bottom</strong>.
          </span>
        </div>

        {/* Card Selector Body with Preview Panel */}
        <div className="p-6 flex flex-col md:flex-row gap-5 max-h-[62vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-stone-300">
                Selected for Bottom of Deck:{' '}
                <strong className={selectedIndices.length === targetCount ? 'text-emerald-400' : 'text-amber-400'}>
                  {selectedIndices.length}
                </strong>{' '}
                / {targetCount} cards
              </span>
              {selectedIndices.length > 0 && (
                <button
                  onClick={() => setSelectedIndices([])}
                  className="text-stone-400 hover:text-amber-300 underline font-semibold cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {hand.map((card, idx) => {
                const isSelected = selectedIndices.includes(idx);
                const orderLabel = getSelectionOrderLabel(idx);
                const isJustDrawn = drawnCards.some((dc) => dc.id === card.id);

                return (
                  <div
                    key={`loot-card-${card.id}-${idx}`}
                    onMouseEnter={() => setHoveredCard(card)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => toggleCardIndex(idx)}
                    className={`relative aspect-[5/7] rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-amber-400 ring-4 ring-amber-400/60 scale-102 shadow-xl shadow-amber-500/30 -translate-y-1'
                        : 'border-stone-800 hover:border-stone-600 opacity-90 hover:opacity-100 hover:scale-101'
                    }`}
                  >
                    <CardThumbnail card={card} customArtUrl={customArtMap[card.id]} />

                    {/* Freshly drawn tag indicator */}
                    {isJustDrawn && !isSelected && (
                      <div className="absolute top-1.5 left-1.5 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/90 text-stone-950 font-mono font-bold text-[9px] shadow-md pointer-events-none">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Drawn</span>
                      </div>
                    )}

                    {/* Selection overlay with order badge */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-amber-950/60 backdrop-blur-xs flex flex-col items-center justify-center gap-1 z-20">
                        <div className="w-7 h-7 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-lg">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <span className="px-2 py-0.5 rounded bg-black/80 border border-amber-400 text-amber-300 font-mono font-bold text-[10px] shadow-lg text-center">
                          {orderLabel}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview Column */}
          {previewCard && (
            <div className="w-60 sm:w-64 shrink-0 hidden md:flex flex-col items-center justify-center p-3 bg-stone-950/70 rounded-xl border border-stone-800">
              <CardPreview card={previewCard} customArtUrl={customArtMap[previewCard.id]} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-stone-400 truncate max-w-md">
            {selectedIndices.length > 0 ? (
              <span className="text-stone-300">
                Order to bottom:{' '}
                {selectedIndices
                  .map((idx, pos) => {
                    const isLast = pos === targetCount - 1;
                    return (
                      <span key={idx} className="font-bold text-amber-300">
                        {pos + 1}. {hand[idx]?.name}
                        {isLast ? ' (Very Bottom)' : ''}
                        {pos < selectedIndices.length - 1 ? ' → ' : ''}
                      </span>
                    );
                  })}
              </span>
            ) : (
              <span className="italic text-stone-500">
                Click {targetCount} card{targetCount !== 1 ? 's' : ''} in the order they should go to the bottom of the deck.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onConfirmLoot(selectedIndices)}
              disabled={selectedIndices.length !== targetCount}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-serif font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                selectedIndices.length === targetCount
                  ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-lg ring-2 ring-amber-300'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <ArrowDown className="w-4 h-4 stroke-[2.5]" />
              <span>
                Put on Bottom of Deck ({selectedIndices.length}/{targetCount})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
