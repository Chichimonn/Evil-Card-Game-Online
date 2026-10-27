import React, { useEffect, useRef, useState } from 'react';
import { CardPassive } from '../types/card';
import { PlayerId } from '../types/game';
import { Shield } from 'lucide-react';

export interface KnockbackChoiceModalProps {
  defender: PlayerId;
  unitName: string;
  passive: CardPassive;
  attackerName: string;
  abilityName: string;
  tiles: number;
  timeLimitMs?: number;
  onChoose: (useImmunity: boolean) => void;
}

/**
 * Lets the defending player decide whether to use an optional knockback immunity (e.g. Hold the Gate).
 * If no choice is made before the time limit, the knockback happens.
 */
export const KnockbackChoiceModal: React.FC<KnockbackChoiceModalProps> = ({
  defender,
  unitName,
  passive,
  attackerName,
  abilityName,
  tiles,
  timeLimitMs = 3000,
  onChoose
}) => {
  const [remainingMs, setRemainingMs] = useState(timeLimitMs);
  const decidedRef = useRef(false);
  const choose = (useImmunity: boolean) => {
    if (decidedRef.current) return;
    decidedRef.current = true;
    onChoose(useImmunity);
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

  const drawback = (passive.effects || []).some((e: any) => e.type === 'cannotInflictKnockback');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none animate-in fade-in">
      <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-stone-900 border-2 border-amber-400/90 shadow-[0_25px_60px_rgba(0,0,0,0.95)] max-w-md w-full text-center">
        <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-base uppercase tracking-wider">
          <Shield className="w-5 h-5 text-amber-400" />
          <span>{passive.name}</span>
        </div>
        <div className="text-xs font-mono text-stone-400 uppercase">
          {defender === 'player1' ? 'Player 1' : 'Player 2'} decides
        </div>
        <p className="text-sm text-stone-200 font-sans">
          {attackerName}'s <span className="font-semibold text-amber-200">{abilityName}</span> would knock{' '}
          <span className="font-semibold text-emerald-300">{unitName}</span> back {tiles} tile{tiles > 1 ? 's' : ''}.
          Make it immune to knockback until the end of this turn?
          {drawback && <span className="text-stone-400"> It will be unable to inflict knockback during your next turn.</span>}
        </p>

        <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${(remainingMs / timeLimitMs) * 100}%` }}
          />
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => choose(true)}
            className="flex-1 py-2 px-4 rounded-lg font-bold text-sm uppercase tracking-wide bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer transition-colors shadow-md"
          >
            Hold ({Math.ceil(remainingMs / 1000)}s)
          </button>
          <button
            onClick={() => choose(false)}
            className="flex-1 py-2 px-4 rounded-lg font-bold text-sm uppercase tracking-wide bg-stone-700 hover:bg-stone-600 text-stone-100 cursor-pointer transition-colors"
          >
            Allow Knockback
          </button>
        </div>
      </div>
    </div>
  );
};
