import React, { useEffect, useState } from 'react';
import { Users, Globe, X, Infinity as InfinityIcon, Map, Lock, User, ChevronLeft } from 'lucide-react';

interface PlayModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHotSeat: () => void;
  onOnline: () => void;
  onEndless: () => void;
}

type Players = 'single' | 'multi';

/**
 * Choosing how to play before a match, in two steps: the number of players, then a mode for it.
 * Singleplayer: Endless is waves of computer opponents (see game/endless.ts); Campaign isn't out yet.
 * Multiplayer: Online is against someone on another device, through a room code (see OnlineLobbyModal); Hot Seat is
 * both players at this screen.
 */
export const PlayModeModal: React.FC<PlayModeModalProps> = ({ isOpen, onClose, onHotSeat, onOnline, onEndless }) => {
  const [players, setPlayers] = useState<Players | null>(null);
  // (each time it opens, it starts from the first step)
  useEffect(() => {
    if (isOpen) setPlayers(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const option = (
    props: { onClick?: () => void; icon: React.ReactNode; title: string; detail: string; colour: 'amber' | 'emerald' | 'sky' | 'rose' },
    key?: string
  ) => {
    const colours = {
      amber: 'border-amber-700/70 hover:border-amber-400 hover:bg-amber-950/30 text-amber-400 bg-amber-950 border-amber-800/60',
      emerald: 'border-emerald-800/70 hover:border-emerald-400 hover:bg-emerald-950/30 text-emerald-400 bg-emerald-950 border-emerald-800/60',
      sky: 'border-sky-700/70 hover:border-sky-400 hover:bg-sky-950/40 text-sky-400 bg-sky-950 border-sky-800/60',
      rose: 'border-rose-800/70 hover:border-rose-400 hover:bg-rose-950/30 text-rose-400 bg-rose-950 border-rose-800/60'
    }[props.colour].split(' ');
    const [border, hoverBorder, hoverBg, iconText, iconBg, iconBorder] = colours;
    return (
      <button
        key={key}
        onClick={props.onClick}
        className={`flex items-center gap-4 p-4 rounded-xl border-2 ${border} bg-stone-950 ${hoverBorder} ${hoverBg} text-left transition-colors cursor-pointer`}
      >
        <div className={`p-2.5 rounded-lg ${iconBg} border ${iconBorder} ${iconText} shrink-0`}>{props.icon}</div>
        <div className="flex flex-col min-w-0">
          <span className="font-serif font-bold text-base text-stone-100">{props.title}</span>
          <span className="text-xs text-stone-400">{props.detail}</span>
        </div>
      </button>
    );
  };

  const title = players === 'single' ? 'Singleplayer' : players === 'multi' ? 'Multiplayer' : 'Choose how to play:';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md max-h-full bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between gap-2 bg-stone-950/80">
          <div className="flex items-center gap-2 min-w-0">
            {players && (
              <button
                onClick={() => setPlayers(null)}
                className="p-1.5 -ml-2 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                aria-label="Back"
                title="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-serif font-bold text-lg text-stone-100 truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-3 bg-stone-900/60 overflow-y-auto">
          {/* Step 1: how many players */}
          {players === null && (
            <>
              {option({
                onClick: () => setPlayers('single'),
                icon: <User className="w-5 h-5" />,
                title: 'Singleplayer',
                detail: 'Play against the computer.',
                colour: 'amber'
              })}
              {option({
                onClick: () => setPlayers('multi'),
                icon: <Users className="w-5 h-5" />,
                title: 'Multiplayer',
                detail: 'Play against another person.',
                colour: 'rose'
              })}
            </>
          )}

          {/* Step 2: a singleplayer mode */}
          {players === 'single' && (
            <>
              {option({
                onClick: onEndless,
                icon: <InfinityIcon className="w-5 h-5" />,
                title: 'Endless',
                detail: 'Hold out against wave after wave of computer opponents.',
                colour: 'amber'
              })}
              <div
                aria-disabled="true"
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-stone-800 bg-stone-950/60 text-left opacity-60 cursor-not-allowed select-none"
              >
                <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-500 shrink-0">
                  <Map className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-serif font-bold text-base text-stone-300">Campaign</span>
                  <span className="text-xs text-stone-500">Coming 2027</span>
                </div>
                <Lock className="w-4 h-4 text-stone-500 shrink-0" />
              </div>
            </>
          )}

          {/* Step 2: a multiplayer mode */}
          {players === 'multi' && (
            <>
              {option({
                onClick: onOnline,
                icon: <Globe className="w-5 h-5" />,
                title: 'Online',
                detail: 'Play against someone on another device, with a room code.',
                colour: 'emerald'
              })}
              {option({
                onClick: onHotSeat,
                icon: <Users className="w-5 h-5" />,
                title: 'Hot Seat',
                detail: 'Two players take turns on this screen.',
                colour: 'sky'
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
