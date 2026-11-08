import React, { useEffect, useState } from 'react';
import { PlayerId } from '../types/game';
import { playCardDrawSound } from '../utils/audio';

interface CoinFlipModalProps {
  isOpen: boolean;
  onComplete: (firstPlayer: PlayerId) => void;
  // The match's seeded random, so the flip is part of the replayable game (see utils/rng)
  random: () => number;
  // Online (Phase 4): who may act on this screen, and the other player's call and choice as they arrive. Hot seat
  // leaves these out, and this screen does everything.
  canCall?: boolean;
  canChoose?: (winner: PlayerId) => boolean;
  onCall?: (side: 'heads' | 'tails') => void;
  remoteCall?: 'heads' | 'tails' | null;
  remoteOrder?: PlayerId | null;
}

export const CoinFlipModal: React.FC<CoinFlipModalProps> = ({
  isOpen,
  onComplete,
  random,
  canCall = true,
  canChoose = () => true,
  onCall,
  remoteCall = null,
  remoteOrder = null
}) => {
  const [caller] = useState<PlayerId>('player2'); // Player 1 flips, Player 2 calls
  const [calledSide, setCalledSide] = useState<'heads' | 'tails' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<'heads' | 'tails' | null>(null);
  const [winner, setWinner] = useState<PlayerId | null>(null);

  // Each match starts with a fresh coin (the modal stays mounted between matches)
  useEffect(() => {
    if (!isOpen) return;
    setCalledSide(null);
    setIsFlipping(false);
    setFlipResult(null);
    setWinner(null);
  }, [isOpen]);
  // The other player's call, then their choice of order (online)
  useEffect(() => {
    if (isOpen && remoteCall && !calledSide) handleCallAndFlip(remoteCall);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, remoteCall, calledSide]);
  useEffect(() => {
    if (isOpen && remoteOrder && winner) onComplete(remoteOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, remoteOrder, winner]);

  if (!isOpen) return null;

  const handleCallAndFlip = (side: 'heads' | 'tails', local = false) => {
    if (isFlipping || calledSide) return;
    if (local) onCall?.(side);
    setCalledSide(side);
    setIsFlipping(true);
    setFlipResult(null);
    setWinner(null);
    playCardDrawSound();

    // The result is decided now (the delay is only the animation), so it doesn't depend on timing
    const result: 'heads' | 'tails' = random() < 0.5 ? 'heads' : 'tails';
    setTimeout(() => {
      setFlipResult(result);
      const isCorrect = side === result;
      const winPlayer: PlayerId = isCorrect ? caller : 'player1';
      setWinner(winPlayer);
      setIsFlipping(false);
      playCardDrawSound();
    }, 1000);
  };

  const handleChooseOrder = (firstPlayer: PlayerId) => {
    playCardDrawSound();
    onComplete(firstPlayer);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-xl shadow-2xl p-6 flex flex-col items-center text-center gap-5">
        {/* Minimal Header */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-mono uppercase tracking-widest text-stone-500 font-bold">
            Rule 4
          </span>
          <h3 className="font-serif font-bold text-lg text-stone-200">
            Coin Flip
          </h3>
        </div>

        {/* Minimalist Coin (No 'EVIL' text, H for heads, T for tails) */}
        <div className="relative w-20 h-20 flex items-center justify-center my-1">
          <div
            className={`w-20 h-20 rounded-full border-2 border-stone-600 bg-stone-950 shadow-md flex items-center justify-center font-mono font-black text-2xl text-stone-200 transition-transform ${
              isFlipping ? 'animate-[spin_0.25s_linear_infinite] scale-105 border-stone-400' : ''
            }`}
          >
            {flipResult === 'heads' ? 'H' : flipResult === 'tails' ? 'T' : isFlipping ? '•' : 'H / T'}
          </div>
        </div>

        {/* Phase 1: Call Heads or Tails */}
        {!winner && (
          <div className="flex flex-col items-center gap-3 w-full">
            <p className="text-xs text-stone-400">
              <span className="text-sky-400 font-semibold">P1</span> flips. <span className="text-rose-400 font-semibold">P2</span>, call:
            </p>

            <div className="flex gap-2.5 w-full">
              <button
                onClick={() => handleCallAndFlip('heads', true)}
                disabled={isFlipping || !canCall}
                className={`flex-1 py-2.5 rounded-lg font-mono font-bold text-xs border transition-colors cursor-pointer ${
                  calledSide === 'heads'
                    ? 'bg-stone-200 text-stone-950 border-white'
                    : 'bg-stone-950 hover:bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'
                }`}
              >
                Heads (H)
              </button>
              <button
                onClick={() => handleCallAndFlip('tails', true)}
                disabled={isFlipping || !canCall}
                className={`flex-1 py-2.5 rounded-lg font-mono font-bold text-xs border transition-colors cursor-pointer ${
                  calledSide === 'tails'
                    ? 'bg-stone-200 text-stone-950 border-white'
                    : 'bg-stone-950 hover:bg-stone-800 text-stone-300 border-stone-700 hover:border-stone-500'
                }`}
              >
                Tails (T)
              </button>
            </div>

            {isFlipping && (
              <span className="text-[11px] font-mono text-stone-400 animate-pulse">
                Flipping...
              </span>
            )}
            {!canCall && !isFlipping && (
              <span className="text-[11px] font-mono text-stone-400 animate-pulse">Waiting for Player 2 to call…</span>
            )}
          </div>
        )}

        {/* Phase 2: Winner Chooses Turn Order */}
        {winner && (
          <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-150">
            <div className="flex flex-col items-center">
              <span className="text-xs font-mono font-bold text-stone-300">
                Result: <strong className="text-white">{flipResult === 'heads' ? 'Heads (H)' : 'Tails (T)'}</strong>
              </span>
              <span className="text-xs text-stone-400 mt-1">
                <strong className={winner === 'player1' ? 'text-sky-400' : 'text-rose-400'}>
                  {winner === 'player1' ? 'Player 1' : 'Player 2'}
                </strong>{' '}
                won the flip.
              </span>
            </div>

            {!canChoose(winner) ? (
              <span className="text-[11px] font-mono text-stone-400 animate-pulse">
                Waiting for {winner === 'player1' ? 'Player 1' : 'Player 2'} to choose who goes first…
              </span>
            ) : (
            <div className="flex gap-2.5 w-full mt-1">
              <button
                onClick={() => handleChooseOrder(winner)}
                className="flex-1 py-2.5 rounded-lg bg-red-800 hover:bg-red-700 text-red-50 font-mono font-black text-xs transition-colors cursor-pointer active:scale-95"
              >
                Play First
              </button>
              <button
                onClick={() => handleChooseOrder(winner === 'player1' ? 'player2' : 'player1')}
                className="flex-1 py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-mono font-bold text-xs border border-stone-700 transition-colors cursor-pointer active:scale-95"
              >
                Play Second
              </button>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
