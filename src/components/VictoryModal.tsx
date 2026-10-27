import React from 'react';
import { PlayerId } from '../types/game';
import { Trophy, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface VictoryModalProps {
  isOpen: boolean;
  winner: PlayerId | 'draw' | null;
  reason: string;
  onPlayAgain: () => void;
  onClose: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  winner,
  reason,
  onPlayAgain,
  onClose
}) => {
  if (!isOpen || !winner) return null;

  const isDraw = winner === 'draw';
  const winnerTitle = isDraw ? 'Match Ended in a Draw' : winner === 'player1' ? 'Player 1 Wins!' : 'Player 2 Wins!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col text-center">
        {/* Header */}
        <div className="p-8 pb-4 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-lg animate-bounce">
            {isDraw ? <ShieldAlert className="w-8 h-8" /> : <Trophy className="w-8 h-8" />}
          </div>

          <h3 className="font-serif font-black text-2xl text-amber-200 uppercase tracking-wider">
            {winnerTitle}
          </h3>

          <p className="text-sm font-mono text-stone-300 px-4">
            {reason}
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 flex gap-3 justify-center border-t border-stone-800 bg-stone-950">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
          >
            Review Board
          </button>
          <button
            onClick={onPlayAgain}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg ring-2 ring-sky-300 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
