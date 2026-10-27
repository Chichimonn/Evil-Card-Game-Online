import React, { useEffect, useRef, useState } from 'react';
import { PlayerId } from '../types/game';
import { Zap } from 'lucide-react';

export interface TimedYesNoModalProps {
  decider: PlayerId;
  title: string;
  question: string;
  timeLimitMs?: number;
  onChoose: (yes: boolean) => void;
}

/**
 * A yes/no question for one player on a timer (e.g. Ready Spell: "Have [unit] use [ability]?").
 * If no choice is made before the time limit, the answer is no.
 */
export const TimedYesNoModal: React.FC<TimedYesNoModalProps> = ({
  decider,
  title,
  question,
  timeLimitMs = 2000,
  onChoose
}) => {
  const [remainingMs, setRemainingMs] = useState(timeLimitMs);
  const decidedRef = useRef(false);
  const choose = (yes: boolean) => {
    if (decidedRef.current) return;
    decidedRef.current = true;
    onChoose(yes);
  };

  useEffect(() => {
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const left = Math.max(0, timeLimitMs - (Date.now() - startedAt));
      setRemainingMs(left);
      if (left <= 0) {
        clearInterval(interval);
        choose(false);
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-in fade-in">
      <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-stone-900 border-2 border-violet-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-md w-full text-center">
        <div className="flex items-center gap-2 text-violet-300 font-mono font-bold text-base uppercase tracking-wider">
          <Zap className="w-5 h-5 text-violet-400" />
          <span>{title}</span>
        </div>
        <div className="text-xs font-mono text-stone-400 uppercase">
          {decider === 'player1' ? 'Player 1' : 'Player 2'} decides
        </div>
        <p className="text-sm text-stone-200 font-sans">{question}</p>

        <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
          <div
            className="h-full bg-violet-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${(remainingMs / timeLimitMs) * 100}%` }}
          />
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => choose(true)}
            className="flex-1 py-2 px-4 rounded-lg font-bold text-sm uppercase tracking-wide bg-violet-500 hover:bg-violet-400 text-stone-950 cursor-pointer transition-colors shadow-md"
          >
            Yes
          </button>
          <button
            onClick={() => choose(false)}
            className="flex-1 py-2 px-4 rounded-lg font-bold text-sm uppercase tracking-wide bg-stone-700 hover:bg-stone-600 text-stone-100 cursor-pointer transition-colors"
          >
            No ({Math.ceil(remainingMs / 1000)}s)
          </button>
        </div>
      </div>
    </div>
  );
};
