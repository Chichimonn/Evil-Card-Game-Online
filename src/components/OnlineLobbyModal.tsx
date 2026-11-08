import React, { useEffect, useState } from 'react';
import { Globe, X, Copy, Check } from 'lucide-react';
import type { RoomRole, RoomStatus } from '../net/connection';
import type { SelectableDeck } from './DeckSelectModal';

// The online lobby (Phase 4): host a room or join one by code, then each player picks their own deck. The match starts
// on both screens once both decks are in and the shared seed is agreed.

interface Props {
  isOpen: boolean;
  room: { role: RoomRole; code: string; status: RoomStatus; detail?: string } | null;
  customDecks: SelectableDeck[];
  presetDecks: SelectableDeck[];
  myDeckName: string | null; // the deck this player sent, once they're ready
  opponentDeckName: string | null;
  seedAgreed: boolean;
  onHost: () => void;
  onJoin: (code: string) => void;
  onReady: (deck: SelectableDeck) => void;
  // An online match saved in this browser (e.g. before a reload) that can be rejoined
  savedMatch: { code: string; turn: number; savedAt: number } | null;
  onRejoin: () => void;
  onLeave: () => void;
  onClose: () => void;
}

const BUSY: Partial<Record<RoomStatus, string>> = {
  opening: 'Opening the connection…',
  connecting: 'Finding the room…',
  handshake: 'Checking both games match…'
};

export default function OnlineLobbyModal({
  isOpen,
  room,
  customDecks,
  presetDecks,
  myDeckName,
  opponentDeckName,
  seedAgreed,
  onHost,
  onJoin,
  onReady,
  savedMatch,
  onRejoin,
  onLeave,
  onClose
}: Props) {
  const [code, setCode] = useState('');
  const [deckId, setDeckId] = useState('');
  const [copied, setCopied] = useState(false);
  const allDecks = [...customDecks, ...presetDecks];
  useEffect(() => {
    if (!deckId || !allDecks.some((d) => d.id === deckId)) setDeckId(allDecks[0]?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDecks, presetDecks]);
  if (!isOpen) return null;

  const live = room && room.status !== 'closed' && room.status !== 'error';
  const connected = room && (room.status === 'connected' || room.status === 'quiet');
  const deck = allDecks.find((d) => d.id === deckId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <h3 className="font-serif font-bold text-lg text-stone-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" /> Play online
          </h3>
          <button
            onClick={() => {
              if (live) onLeave();
              onClose();
            }}
            className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Close"
            title={live ? 'Leave the room' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 text-sm text-stone-300">
          {/* Host or join */}
          {!live && (
            <>
              {room?.detail && <p className="text-red-300 text-xs">{room.detail}</p>}
              {savedMatch && (
                <button
                  onClick={onRejoin}
                  className="w-full rounded-xl border-2 border-amber-700/80 bg-amber-950/40 hover:bg-amber-900/40 text-amber-100 py-3 cursor-pointer flex flex-col items-center"
                >
                  <span className="font-bold">Rejoin your match</span>
                  <span className="text-xs text-amber-300/80">
                    Room <span className="font-mono">{savedMatch.code}</span>, turn {savedMatch.turn}, saved{' '}
                    {Math.max(1, Math.round((Date.now() - savedMatch.savedAt) / 60000))} min ago
                  </span>
                </button>
              )}
              <button onClick={onHost} className="w-full rounded-xl bg-red-800 hover:bg-red-700 text-red-50 font-bold py-3 cursor-pointer">
                Host a game
              </button>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="flex-1 h-px bg-stone-800" /> or join one <span className="flex-1 h-px bg-stone-800" />
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  onJoin(code);
                }}
              >
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Room code"
                  maxLength={8}
                  className="flex-1 min-w-0 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 font-mono uppercase tracking-widest"
                />
                <button type="submit" className="rounded-xl bg-stone-800 hover:bg-stone-700 px-5 font-bold cursor-pointer">
                  Join
                </button>
              </form>
            </>
          )}

          {/* Waiting for the guest: the code to share */}
          {room && room.status === 'waiting' && (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-xs text-stone-400">Share this code with your opponent:</span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(room.code).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
                className="flex items-center gap-3 font-mono text-3xl tracking-[0.3em] text-amber-300 bg-stone-950 border border-stone-700 rounded-xl px-5 py-3 cursor-pointer"
                title="Copy the code"
              >
                {room.code}
                {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-stone-500" />}
              </button>
              <span className="text-xs text-stone-500 animate-pulse">Waiting for them to join…</span>
            </div>
          )}
          {room && BUSY[room.status] && <p className="text-center text-stone-400 animate-pulse">{BUSY[room.status]}</p>}

          {/* Connected: each player picks their own deck */}
          {connected && (
            <>
              <p className="text-xs text-emerald-400">
                Connected to room <span className="font-mono">{room.code}</span>
                {room.status === 'quiet' ? ' (the other player has gone quiet)' : ''}.
              </p>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-400">Your deck</span>
                <select
                  value={deckId}
                  onChange={(e) => setDeckId(e.target.value)}
                  disabled={Boolean(myDeckName)}
                  className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 disabled:opacity-60"
                >
                  {customDecks.length > 0 && (
                    <optgroup label="Your decks">
                      {customDecks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.cardCount} cards)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Preset decks">
                    {presetDecks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.cardCount} cards)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <button
                onClick={() => deck && onReady(deck)}
                disabled={!deck || Boolean(myDeckName)}
                className="w-full rounded-xl bg-red-800 hover:bg-red-700 disabled:bg-stone-800 disabled:text-stone-400 text-red-50 font-bold py-3 cursor-pointer disabled:cursor-default"
              >
                {myDeckName ? `Ready with ${myDeckName}` : 'Ready'}
              </button>
              <ul className="text-xs space-y-1 text-stone-400">
                <li>Opponent: {opponentDeckName ? <span className="text-emerald-400">ready ({opponentDeckName})</span> : 'choosing a deck…'}</li>
                <li>Shared seed: {seedAgreed ? <span className="text-emerald-400">agreed</span> : 'agreeing…'}</li>
              </ul>
              <p className="text-xs text-stone-500">
                The match starts once both players are ready. Seats and the coin flip come from a seed both games agree on,
                so neither player picks them.
              </p>
            </>
          )}

          {live && (
            <button onClick={onLeave} className="text-xs text-stone-500 hover:text-red-300 cursor-pointer self-center">
              Leave the room
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
