import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ScrollText, X } from 'lucide-react';
import { LogEntry, LogKind, logTextFor } from '../game/turnHandoff';
import type { PlayerId } from '../types/game';

// The shared match log (online play, Phase 2): the same record on both screens. Its button sits with the camera
// controls, and the log opens above it. It stays usable while the game is waiting on the other player
// (data-input-always).
//
// The game's notices (what just happened, what to click next) are written here rather than shown over the battlefield,
// so the log is open from the start, as tall as its newest one or two entries (expand it to read further back). A new
// entry flashes, then settles over about 5 seconds, so how recent it is can be told at a glance.

const KIND_STYLE: Record<LogKind, string> = {
  turn: 'text-amber-300 font-bold',
  move: 'text-sky-300',
  unit: 'text-stone-300',
  cards: 'text-emerald-300',
  choice: 'text-fuchsia-300',
  note: 'text-stone-400 italic'
};

// How long a new entry stands out
const FLASH_MS = 5000;
// Three quick flashes, then a slow fade
const FLASH_CSS = `
@keyframes log-flash {
  0% { background-color: rgba(251, 191, 36, 0.45); }
  7% { background-color: rgba(251, 191, 36, 0.1); }
  14% { background-color: rgba(251, 191, 36, 0.45); }
  21% { background-color: rgba(251, 191, 36, 0.1); }
  28% { background-color: rgba(251, 191, 36, 0.4); }
  100% { background-color: rgba(251, 191, 36, 0); }
}
.log-flash { animation: log-flash ${FLASH_MS}ms ease-out forwards; }
@keyframes log-pinned-pulse {
  0%, 100% { background-color: rgba(251, 191, 36, 0.06); }
  50% { background-color: rgba(251, 191, 36, 0.24); }
}
.log-pinned { animation: log-pinned-pulse 3.5s ease-in-out infinite; }
`;

interface Props {
  entries: LogEntry[];
  // The latest turn handoff's result, e.g. "Turn 4 handed to P2: confirmed"
  handoffStatus: { text: string; ok: boolean } | null;
  // Who is reading (online: this screen's player; null in hot seat): entries private to the other player read publicly
  viewer: PlayerId | null;
  open: boolean;
  onToggle: () => void;
  // In the page's flow as wide as its container (under the action menu), its title bar always showing (it opens and
  // closes the list), rather than a button that opens the log above it
  inline?: boolean;
  // A standing notice kept under the entries for as long as it's given, pulsing slowly (e.g. Endless's wave)
  pinned?: string | null;
}

export default function GameLogPanel({ entries, handoffStatus, viewer, open, onToggle, inline = false, pinned = null }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Compact (the newest one or two entries) or expanded (as tall as fits)
  const [expanded, setExpanded] = useState(false);
  // Expanded, the log opens upward from its button: as tall as fits between the button and the top bar (at most 380px)
  const [maxHeight, setMaxHeight] = useState(380);
  // Compact, the list is as tall as its last two entries
  const [compactListHeight, setCompactListHeight] = useState(48);

  // When each entry was first seen here (for its flash). Entries already there when the log first shows (e.g. a game
  // loaded back) don't flash.
  const seenAtRef = useRef<Map<number, number>>(new Map());
  const seededRef = useRef(false);
  const lastCountRef = useRef(0);
  // (a new match starts the log over, numbering from 1 again: forget the old one)
  if (entries.length < lastCountRef.current) seenAtRef.current.clear();
  lastCountRef.current = entries.length;
  const now = Date.now();
  entries.forEach((e) => {
    if (!seenAtRef.current.has(e.seq)) seenAtRef.current.set(e.seq, seededRef.current ? now : 0);
  });
  seededRef.current = true;

  useLayoutEffect(() => {
    if (!open || !wrapRef.current || inline) return;
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
  }, [open, inline]);

  // Compact: fit the last two entries (and the turn heading between them, if any)
  useLayoutEffect(() => {
    if (!open || expanded || !listRef.current) return;
    const rows = Array.from(listRef.current.querySelectorAll<HTMLElement>('[data-log-row]'));
    if (rows.length === 0) return;
    const entryRows = rows.filter((r) => r.dataset.logRow === 'entry');
    const firstShown = entryRows[Math.max(0, entryRows.length - 2)];
    const from = rows.indexOf(firstShown);
    const height = rows.slice(from).reduce((sum, r) => sum + r.offsetHeight + 2, 0);
    setCompactListHeight(Math.min(160, height + 8));
  }, [open, expanded, entries.length]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, expanded, entries.length, compactListHeight]);

  let lastTurn: number | null = null;
  return (
    // (scrolling over the log scrolls the log only, not the battlefield's zoom)
    <div ref={wrapRef} data-input-always className="relative pointer-events-auto" onWheel={(e) => e.stopPropagation()}>
      <style>{FLASH_CSS}</style>
      {!inline && (
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
      )}
      {/* Inline and closed: just its title bar, which opens it */}
      {inline && !open && (
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-stone-900/95 border border-stone-700/80 shadow-2xl backdrop-blur-md text-xs font-mono text-stone-300 hover:text-amber-300 cursor-pointer"
          title="Show the match log"
        >
          <span className="flex items-center gap-2 font-bold">
            <ScrollText className="w-4 h-4 text-amber-400" /> Match log
          </span>
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
      {open && (
        <div
          className={`${
            inline ? 'w-full' : 'absolute bottom-full right-0 mb-2 z-[60] w-[min(420px,calc(100vw-32px))]'
          } flex flex-col rounded-xl bg-stone-950/95 border border-stone-700 shadow-2xl text-xs font-mono`}
          style={expanded ? { height: maxHeight } : undefined}
        >
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-stone-800">
            <span className="flex items-center gap-2 text-stone-200 font-bold">
              <ScrollText className="w-4 h-4 text-amber-400" /> Match log
            </span>
            <span className="flex items-center gap-2">
              <button
                onClick={() => setExpanded((x) => !x)}
                className="text-stone-400 hover:text-stone-100 cursor-pointer"
                title={expanded ? 'Show only the newest entries' : 'Show more of the log'}
              >
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button onClick={onToggle} className="text-stone-400 hover:text-stone-100 cursor-pointer" title="Hide the log">
                <X className="w-4 h-4" />
              </button>
            </span>
          </div>
          <div
            ref={listRef}
            className={`${expanded ? 'flex-1' : ''} overflow-y-auto px-3 py-1 space-y-0.5`}
            style={expanded ? undefined : { height: compactListHeight }}
          >
            {entries.length === 0 && <div className="text-stone-500">Nothing yet.</div>}
            {entries.map((e) => {
              const header = e.turn !== lastTurn;
              lastTurn = e.turn;
              const age = now - (seenAtRef.current.get(e.seq) ?? 0);
              const flashing = age < FLASH_MS;
              return (
                <React.Fragment key={e.seq}>
                  {header && (
                    <div data-log-row="turn" className="pt-1 text-stone-500 border-t border-stone-800/60 mt-1">
                      Turn {e.turn}
                    </div>
                  )}
                  <div
                    data-log-row="entry"
                    className={`${KIND_STYLE[e.kind]} rounded px-1 -mx-1 ${flashing ? 'log-flash' : ''}`}
                    // (a re-render mid-flash carries on where it was)
                    style={flashing ? { animationDelay: `-${age}ms` } : undefined}
                  >
                    <span className="text-stone-600 mr-1">{e.player === 'player1' ? 'P1' : 'P2'}</span>
                    {logTextFor(e, viewer)}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {pinned && (
            <div className="log-pinned px-3 py-1.5 border-t border-stone-800 text-amber-200 font-bold">{pinned}</div>
          )}
          {/* (the turn handoff's details, fingerprints and all, are for the console: the log says only that something
              went wrong, in plain words) */}
          {handoffStatus && !handoffStatus.ok && (
            <div className="px-3 py-1.5 border-t border-stone-800 text-red-400">
              The two games got out of step; they're being matched up again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
