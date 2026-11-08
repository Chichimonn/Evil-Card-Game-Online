import React from 'react';
import { Users, Globe, X } from 'lucide-react';

interface PlayModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHotSeat: () => void;
  onOnline: () => void;
}

/**
 * Choosing how to play before a match. Hot Seat is both players at this screen; Online is against someone on another
 * device, through a room code (see OnlineLobbyModal).
 */
export const PlayModeModal: React.FC<PlayModeModalProps> = ({ isOpen, onClose, onHotSeat, onOnline }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <h3 className="font-serif font-bold text-lg text-stone-100">Choose how to play:</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modes */}
        <div className="p-6 flex flex-col gap-3 bg-stone-900/60">
          <button
            onClick={onOnline}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-800/70 bg-stone-950 hover:border-emerald-400 hover:bg-emerald-950/30 text-left transition-colors cursor-pointer"
          >
            <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif font-bold text-base text-stone-100">Online</span>
              <span className="text-xs text-stone-400">Play against someone on another device, with a room code.</span>
            </div>
          </button>

          <button
            onClick={onHotSeat}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-sky-700/70 bg-stone-950 hover:border-sky-400 hover:bg-sky-950/40 text-left transition-colors cursor-pointer"
          >
            <div className="p-2.5 rounded-lg bg-sky-950 border border-sky-800/60 text-sky-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif font-bold text-base text-stone-100">Hot Seat</span>
              <span className="text-xs text-stone-400">Two players take turns on this screen.</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
