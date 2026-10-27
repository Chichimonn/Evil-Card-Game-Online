import React from 'react';
import { PlayerId } from '../types/game';
import { Scroll, Layers, XCircle } from 'lucide-react';

interface FieldNotesModalProps {
  unitName: string;
  activePlayer: PlayerId;
  player1DeckCount: number;
  player2DeckCount: number;
  onSelectPlayer: (targetPlayer: PlayerId) => void;
  onCancel?: () => void;
}

export const FieldNotesModal: React.FC<FieldNotesModalProps> = ({
  unitName,
  activePlayer,
  player1DeckCount,
  player2DeckCount,
  onSelectPlayer,
  onCancel
}) => {
  const isP1 = activePlayer === 'player1';

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in">
      <div className="flex flex-col items-center gap-5 p-6 sm:p-8 rounded-2xl bg-stone-900 border-2 border-amber-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-lg w-full">
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-base sm:text-lg uppercase tracking-wider">
            <Scroll className="w-5 h-5 text-amber-400" />
            <span>Field Notes: Reveal Top Card</span>
          </div>
          <div className="text-xs sm:text-sm text-stone-300 font-sans max-w-sm">
            <span className="font-semibold text-amber-200">{unitName}</span>: Choose either player&apos;s deck to reveal its top card. You may then choose to put that card on the bottom of their deck.
          </div>
        </div>

        {/* Player Deck Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full my-2">
          {/* Player 1 Deck */}
          <button
            onClick={() => onSelectPlayer('player1')}
            className={`group flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer text-center ${
              isP1
                ? 'bg-sky-950/40 border-sky-500/70 hover:border-sky-400 hover:bg-sky-900/50 hover:scale-102 hover:shadow-[0_0_20px_rgba(14,165,233,0.4)]'
                : 'bg-stone-800/80 border-stone-600/70 hover:border-amber-400 hover:bg-stone-800 hover:scale-102 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sky-950/80 border border-sky-400/60 text-sky-300 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="font-mono font-bold text-sm text-stone-100 flex items-center justify-center gap-1">
                <span>Player 1&apos;s Deck</span>
              </div>
              <div className="text-xs font-semibold text-sky-400 mt-0.5">
                {isP1 ? '(Your Deck)' : "(Opponent's Deck)"}
              </div>
              <div className="text-[11px] text-stone-400 font-mono mt-1">
                {player1DeckCount} {player1DeckCount === 1 ? 'card' : 'cards'} remaining
              </div>
            </div>
            <div className="w-full py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-sky-600/90 group-hover:bg-sky-500 text-stone-950 transition-colors">
              Inspect Deck
            </div>
          </button>

          {/* Player 2 Deck */}
          <button
            onClick={() => onSelectPlayer('player2')}
            className={`group flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer text-center ${
              !isP1
                ? 'bg-rose-950/40 border-rose-500/70 hover:border-rose-400 hover:bg-rose-900/50 hover:scale-102 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                : 'bg-stone-800/80 border-stone-600/70 hover:border-amber-400 hover:bg-stone-800 hover:scale-102 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
            }`}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-950/80 border border-rose-400/60 text-rose-300 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="font-mono font-bold text-sm text-stone-100 flex items-center justify-center gap-1">
                <span>Player 2&apos;s Deck</span>
              </div>
              <div className="text-xs font-semibold text-rose-400 mt-0.5">
                {!isP1 ? '(Your Deck)' : "(Opponent's Deck)"}
              </div>
              <div className="text-[11px] text-stone-400 font-mono mt-1">
                {player2DeckCount} {player2DeckCount === 1 ? 'card' : 'cards'} remaining
              </div>
            </div>
            <div className="w-full py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-600/90 group-hover:bg-rose-500 text-stone-950 transition-colors">
              Inspect Deck
            </div>
          </button>
        </div>

        {/* Optional Cancel */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-red-300 hover:text-red-100 bg-red-950/40 hover:bg-red-900/60 border border-red-700/60 transition-colors cursor-pointer mt-1"
          >
            <XCircle className="w-4 h-4 text-red-400" />
            <span>Cancel Assist (Send to Graveyard)</span>
          </button>
        )}
      </div>
    </div>
  );
};
