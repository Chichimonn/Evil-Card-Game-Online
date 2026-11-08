import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScrollText, X } from 'lucide-react';
import { LogEntry, LogKind, logTextFor } from '../game/turnHandoff';
import type { PlayerId } from '../types/game';

// The shared match log (online play, Phase 2): the same record on both screens. Its button sits with the camera
// controls, and the log opens above it. It stays usable while the game is waiting on the other player
// (data-input-always).

const KIND_STYLE: Record<LogKind, string> = {
  turn: 'text-amber-300 font-bold',
  move: 'text-sky-300',
  unit: 'text-stone-300',
  cards: 'text-emerald-300',
  choice: 'text-fuchsia-300',
  note: 'text-stone-400 italic'
};

interface Props {
  entries: LogEntry[];
  // The latest turn handoff's result, e.g. "Turn 4 handed to P2: confirmed"
  handoffStatus: { text: string; ok: boolean } | null;
  // Who is reading (online: this screen's player; null in hot seat): entries private to the other player read publicly
  viewer: PlayerId | null;
  open: boolean;
  onToggle: () => void;
}

export default function GameLogPanel({ entries, handoffStatus, viewer, open, onToggle }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // The log opens upward from its button: as tall as fits between the button and the top bar (at most 380px)
  const [maxHeight, setMaxHeight] = useState(380);
  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // (the panel area may be drawn scaled: convert the room on screen into the panel's own pixels)
      const scale = el.offsetHeight > 0 ? rect.height / el.offsetHeight : 1;
      const room = (rect.top - 100) / (scale || 1);
      setMaxHeight(Math.max(140, Math.min(380, room)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, entries.length]);

  let lastTurn: number | null = null;
  return (
    <div ref={wrapRef} data-input-always className="relative pointer-events-auto">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs font-mono font-bold backdrop-blur-md drop-shadow-xl cursor-pointer transition-colors ${
          open ? 'text-amber-300' : 'text-stone-300 hover:text-amber-300'
        }`}
        title={open ? 'Hide the match log' : 'Show the match log'}
      >
        <ScrollText className="w-3.5 h-3.5" />
        Log
      </button>
      {open && (
        <div
          className="absolute bottom-full right-0 mb-2 z-[60] w-[min(420px,calc(100vw-32px))] flex flex-col rounded-xl bg-stone-950/95 border border-stone-700 shadow-2xl text-xs font-mono"
          style={{ height: maxHeight }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone-800">
            <span className="flex items-center gap-2 text-stone-200 font-bold">
              <ScrollText className="w-4 h-4 text-amber-400" /> Match log
            </span>
            <button onClick={onToggle} className="text-stone-400 hover:text-stone-100 cursor-pointer" title="Hide the log">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {entries.length === 0 && <div className="text-stone-500">Nothing yet.</div>}
            {entries.map((e) => {
              const header = e.turn !== lastTurn;
              lastTurn = e.turn;
              return (
                <React.Fragment key={e.seq}>
                  {header && <div className="pt-1 text-stone-500 border-t border-stone-800/60 mt-1">Turn {e.turn}</div>}
                  <div className={KIND_STYLE[e.kind]}>
                    <span className="text-stone-600 mr-1">{e.player === 'player1' ? 'P1' : 'P2'}</span>
                    {logTextFor(e, viewer)}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {handoffStatus && (
            <div className={`px-3 py-1.5 border-t border-stone-800 ${handoffStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {handoffStatus.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
