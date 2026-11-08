import React, { useEffect, useRef, useState } from 'react';
import { ScrollText, X } from 'lucide-react';
import { LogEntry, LogKind, logTextFor } from '../game/turnHandoff';
import type { PlayerId } from '../types/game';

// The shared match log (online play, Phase 2): the same record on both screens. It stays usable while the game is
// waiting on the other player (data-input-always).

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
  // The latest turn handoff's result, e.g. "Turn 4 handed to P2 ✓"
  handoffStatus: { text: string; ok: boolean } | null;
  // Who is reading (online: this screen's player; null in hot seat): entries private to the other player read publicly
  viewer: PlayerId | null;
}

export default function GameLogPanel({ entries, handoffStatus, viewer }: Props) {
  const [open, setOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const shown = showNotes ? entries : entries.filter((e) => e.kind !== 'note');

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, shown.length]);

  if (!open) {
    return (
      <button
        data-input-always
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 px-3 py-2 rounded-xl bg-stone-900/90 border border-stone-700 text-stone-300 hover:text-amber-300 text-xs font-mono shadow-lg cursor-pointer"
        title="Show the match log"
      >
        <ScrollText className="w-4 h-4" />
        Log ({entries.length})
        {handoffStatus && <span className={handoffStatus.ok ? 'text-emerald-400' : 'text-red-400'}>{handoffStatus.ok ? '✓' : '✗'}</span>}
      </button>
    );
  }

  let lastTurn: number | null = null;
  return (
    <div
      data-input-always
      className="fixed bottom-4 left-4 z-[60] w-[min(420px,calc(100vw-32px))] h-[min(380px,60vh)] flex flex-col rounded-xl bg-stone-950/95 border border-stone-700 shadow-2xl text-xs font-mono"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-800">
        <span className="flex items-center gap-2 text-stone-200 font-bold">
          <ScrollText className="w-4 h-4 text-amber-400" /> Match log
        </span>
        <span className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-stone-400 cursor-pointer">
            <input type="checkbox" checked={showNotes} onChange={(e) => setShowNotes(e.target.checked)} />
            messages
          </label>
          <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-100 cursor-pointer" title="Hide the log">
            <X className="w-4 h-4" />
          </button>
        </span>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {shown.length === 0 && <div className="text-stone-500">Nothing yet.</div>}
        {shown.map((e) => {
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
        <div className={`px-3 py-1.5 border-t border-stone-800 ${handoffStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>{handoffStatus.text}</div>
      )}
    </div>
  );
}
