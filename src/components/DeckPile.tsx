import React, { useState } from 'react';
import { CardItem } from '../types/card';
import { Layers } from 'lucide-react';

interface DeckPileProps {
  title: string;
  count: number;
  owner: 'player' | 'opponent';
  onDrawCard?: () => void;
  canDraw?: boolean;
}

// Shrunk compact deck pile for gameplay side-by-side positioning
export const DeckPile: React.FC<DeckPileProps> = ({
  title,
  count,
  owner,
  onDrawCard,
  canDraw = false
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex flex-col items-center select-none">
      {/* Label */}
      <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-stone-300 font-bold mb-1 flex items-center gap-1">
        <Layers className="w-3 h-3 text-sky-400" />
        <span>{title}</span>
        <span className="text-stone-400 font-normal">({count})</span>
      </span>

      {/* Shrunk compact deck pile slot: w-12 sm:w-14 */}
      <div
        onClick={() => {
          if (canDraw && onDrawCard) onDrawCard();
        }}
        className={`w-12 sm:w-14 aspect-[5/7] relative transition-transform duration-200 ${
          canDraw ? 'cursor-pointer hover:-translate-y-1.5 group active:scale-95' : 'cursor-default'
        }`}
        title={
          canDraw
            ? `Click to draw a card (${count} remaining in deck)`
            : `${title} (${count} cards remaining)`
        }
      >
        {/* Layer 3 - Bottom-most stack shadow card */}
        {count > 10 && (
          <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-lg bg-stone-900 border border-stone-800 shadow-sm" />
        )}

        {/* Layer 2 - Middle stack shadow card */}
        {count > 3 && (
          <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-lg bg-stone-900 border border-stone-800 shadow-sm" />
        )}

        {/* Layer 1 - Top card loading cardback.png from assets>frames */}
        <div className="absolute inset-0 rounded-lg overflow-hidden border-2 border-stone-700 bg-stone-950 shadow-xl z-10 group-hover:border-sky-400 transition-colors">
          {!imgError ? (
            <img
              src="/assets/frames/cardback.png"
              alt="Card Back"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center p-1 text-center border border-stone-800">
              <span className="text-xs font-serif font-black text-amber-500 uppercase tracking-widest">
                EVIL
              </span>
              <span className="text-[9px] font-mono text-stone-500 mt-0.5">
                {count}
              </span>
            </div>
          )}

          {canDraw && (
            <div className="absolute inset-0 bg-sky-950/20 group-hover:bg-sky-950/40 border-2 border-transparent group-hover:border-sky-400/80 transition-all flex items-center justify-center">
              <span className="text-[10px] font-mono font-black text-sky-300 uppercase tracking-wider bg-stone-950/80 px-1.5 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                Draw
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
