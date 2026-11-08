import React, { useEffect, useState } from 'react';
import { CardItem } from '../types/card';
import { PlayerId } from '../types/game';
import { RefreshCw, Check, X } from 'lucide-react';
import { CardThumbnail } from './CardThumbnail';
import { CardPreview } from './CardPreview';

interface CycleModalProps {
  isOpen: boolean;
  player: PlayerId;
  hand: CardItem[];
  customArtMap: Record<string, string>;
  onConfirmCycle: (selectedIndices: number[]) => void;
  onCancel: () => void;
}

export const CycleModal: React.FC<CycleModalProps> = ({
  isOpen,
  player,
  hand,
  customArtMap,
  onConfirmCycle,
  onCancel
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [hoveredCard, setHoveredCard] = useState<CardItem | null>(null);

  // Each opening starts with nothing selected (the window stays mounted between players, so the previous player's
  // picks would otherwise carry over, possibly pointing past the end of this player's hand)
  useEffect(() => {
    setSelectedIndices([]);
    setHoveredCard(null);
  }, [isOpen, player]);

  if (!isOpen) return null;

  const isPlayer1 = player === 'player1';
  const previewCard = hoveredCard || (selectedIndices.length > 0 ? hand[selectedIndices[selectedIndices.length - 1]] : hand[0]) || null;

  const toggleCardIndex = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    if (selectedIndices.length === hand.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(hand.map((_, i) => i));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-4xl bg-stone-900 border-2 border-sky-500/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-950 border border-sky-400 text-sky-300">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-stone-100 flex items-center gap-2">
                <span>Cycle Cards</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${isPlayer1 ? 'bg-sky-950 text-sky-300 border border-sky-700' : 'bg-rose-950 text-rose-300 border border-rose-700'}`}>
                  {isPlayer1 ? 'Player 1' : 'Player 2'}
                </span>
              </h3>
              <p className="text-[11px] font-mono text-stone-400">
                Rule 5.2: Put chosen cards on bottom of deck, then draw that many
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Selector Body with Preview Panel */}
        <div className="p-6 flex flex-col md:flex-row gap-5 max-h-[65vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-stone-300">
                Selected: <strong className="text-sky-400">{selectedIndices.length}</strong> / {hand.length} cards
              </span>
              <button
                onClick={handleSelectAll}
                className="text-red-500 hover:text-red-400 underline font-semibold cursor-pointer"
              >
                {selectedIndices.length === hand.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {hand.map((card, idx) => {
                const isSelected = selectedIndices.includes(idx);
                return (
                  <div
                    key={`cycle-card-${idx}`}
                    onMouseEnter={() => setHoveredCard(card)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => toggleCardIndex(idx)}
                    className={`relative aspect-[5/7] rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-sky-400 ring-4 ring-sky-400/50 scale-102 shadow-lg shadow-sky-500/20 -translate-y-1'
                        : 'border-stone-800 hover:border-stone-600 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <CardThumbnail card={card} customArtUrl={customArtMap[card.id]} />

                    {isSelected && (
                      <div className="absolute inset-0 bg-sky-950/40 backdrop-blur-xs flex items-center justify-center z-20">
                        <div className="w-8 h-8 rounded-full bg-sky-400 text-stone-950 flex items-center justify-center font-bold shadow-lg">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
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
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <span className="text-xs text-stone-500 font-mono italic">
            Once-per-game action during reinforcement setup phase
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirmCycle(selectedIndices)}
              disabled={selectedIndices.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-serif font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                selectedIndices.length > 0
                  ? 'bg-red-800 hover:bg-red-700 text-red-50 shadow-lg ring-2 ring-red-600'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Cycle {selectedIndices.length} Cards</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
