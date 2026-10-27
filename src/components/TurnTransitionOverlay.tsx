import React, { useEffect, useState, useRef } from 'react';
import { PlayerId } from '../types/game';
import { Swords, UserCheck } from 'lucide-react';

interface TurnTransitionOverlayProps {
  activePlayer: PlayerId;
  isOpen: boolean;
  onComplete: () => void;
}

export const TurnTransitionOverlay: React.FC<TurnTransitionOverlayProps> = ({
  activePlayer,
  isOpen,
  onComplete
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(2);
  const isPlayer1 = activePlayer === 'player1';
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(2);

      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);

      // Dismiss after 1.5 seconds or click
      timerRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onCompleteRef.current();
      }, 1500);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [isOpen]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onCompleteRef.current();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-300 select-none cursor-pointer"
      title="Click to dismiss and start turn"
    >
      <div className="flex flex-col items-center justify-center text-center max-w-xl w-full px-6">
        {/* Turn Number Tag with 5-Second Countdown */}
        <div className="flex items-center gap-3 mb-4">
</div>


        {/* Cinematic Player Turn Banner */}
        <div
          className={`w-full px-10 py-6 rounded-3xl border-2 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex items-center justify-center gap-5 ${
            isPlayer1
              ? 'bg-gradient-to-r from-stone-950 via-sky-950 to-stone-950 border-sky-400 shadow-sky-500/20 text-sky-200'
              : 'bg-gradient-to-r from-stone-950 via-rose-950 to-stone-950 border-rose-500 shadow-rose-500/20 text-rose-200'
          }`}
        >
          <div
            className={`p-3.5 rounded-2xl border ${
              isPlayer1
                ? 'bg-sky-900/80 border-sky-400/80 text-sky-300'
                : 'bg-rose-900/80 border-rose-400/80 text-rose-300'
            }`}
          >
            {isPlayer1 ? <UserCheck className="w-9 h-9" /> : <Swords className="w-9 h-9" />}
          </div>

          <div className="flex flex-col text-left">
            <span
              className={`font-serif font-black tracking-widest text-3xl sm:text-4xl uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] ${
                isPlayer1 ? 'text-sky-300' : 'text-rose-300'
              }`}
            >
              {isPlayer1 ? "Player 1's Turn" : "Player 2's Turn"}
            </span>
            <span className="text-xs font-mono text-stone-400 tracking-wider mt-0.5">
              {isPlayer1 ? "Reinforce on Row 1 or Activate Units" : "Reinforce on Row 6 or Activate Units"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
