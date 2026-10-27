import React, { useState } from 'react';
import { CardItem } from '../types/card';
import { CardPreview } from './CardPreview';
import { BookOpen } from 'lucide-react';

interface ResearchModalProps {
  cards: CardItem[];
  sourceTitle: string;
  unitName: string;
  customArtMap: Record<string, string>;
  restOnTop?: boolean;
  promptText?: string; // replaces "Choose 1 card to put into your hand. The other card..."
  buttonLabel?: string; // replaces "Take to Hand"
  onChoose: (chosenIndex: number) => void;
  onCancel?: () => void;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({
  cards,
  sourceTitle,
  unitName,
  customArtMap,
  restOnTop = false,
  promptText,
  buttonLabel = 'Take to Hand',
  onChoose,
  onCancel
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in">
      <div className="flex flex-col items-center gap-5 p-6 sm:p-8 rounded-2xl bg-stone-900 border-2 border-amber-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-4xl w-full">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-base sm:text-lg uppercase tracking-wider">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>{sourceTitle}</span>
          </div>
          <div className="text-xs sm:text-sm text-stone-300 font-sans">
            <span className="font-semibold text-amber-200">{unitName}</span>:{' '}
            {promptText ? (
              promptText
            ) : (
              <>
                Choose <span className="text-emerald-300 font-bold">1 card</span> to put into your hand.
                {cards.length > 1 && (
                  <span className="text-stone-400">
                    {' '}The other card will be put {restOnTop ? 'back on top' : 'on the bottom'} of your deck.
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Cards Display */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 my-2">
          {cards.map((card, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={`${card.id}_${idx}`}
                className="flex flex-col items-center gap-3 transition-transform duration-150"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div
                  onClick={() => onChoose(idx)}
                  className={`cursor-pointer rounded-xl transition-all duration-200 ${
                    isHovered
                      ? 'scale-105 shadow-[0_0_25px_rgba(245,158,11,0.6)] ring-2 ring-amber-400'
                      : 'hover:scale-102 shadow-xl ring-1 ring-stone-700'
                  }`}
                >
                  <CardPreview card={card} customArtUrl={customArtMap[card.id]} />
                </div>

                <button
                  onClick={() => onChoose(idx)}
                  className={`w-full py-2 px-4 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wide cursor-pointer transition-all shadow-md ${
                    isHovered
                      ? 'bg-amber-400 text-stone-950 scale-105 shadow-amber-500/50'
                      : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                  }`}
                >
                  {buttonLabel}
                </button>
              </div>
            );
          })}
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-red-300 hover:text-red-100 bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 transition-colors cursor-pointer mt-1"
          >
            Cancel Assist (Send to Graveyard)
          </button>
        )}
      </div>
    </div>
  );
};
