import { BattlefieldUnit, PlayerId } from '../types/game';
import { GameState, GAME_STATE_VERSION } from './gameState';
import { checkVersionMatch } from '../version';

/**
 * Online play, Phase 2: the action log and the turn handoff.
 *
 * The snapshot (GameState) is the authority; the log is the readable record of how the game got there. At the end of
 * a turn, the player who took it hands over the log entries made since the last handoff, the state, and the state's
 * fingerprint. The other side checks the fingerprint and the log's numbering, loads the state, and acknowledges.
 */

export type LogKind =
  | 'turn' // a turn starts or ends, a unit is chosen to take the turn, a pass
  | 'move' // a unit changed tile (moved, knocked back, pulled, placed)
  | 'unit' // a unit entered or left play, or its damage or armour changed
  | 'cards' // cards drawn, discarded or returned (counts per zone)
  | 'choice' // an answer to a choice prompt
  | 'note'; // what the game reported (the notification text)

export interface LogEntry {
  seq: number; // numbered from 1, without gaps, across the whole match
  turn: number;
  player: PlayerId; // whose turn it was
  kind: LogKind;
  text: string;
  // Hidden information (Phase 6): text naming cards only one player may see (their hand, the cards they looked at).
  // Everyone else reads publicText instead.
  privateTo?: PlayerId;
  publicText?: string;
}

/** What a viewer may read of a log entry (null viewer: hot seat, both players at one screen, sees everything). */
export function logTextFor(entry: LogEntry, viewer: PlayerId | null): string {
  if (!entry.privateTo || !viewer || entry.privateTo === viewer) return entry.text;
  return entry.publicText ?? 'Something only the other player can see happened.';
}

export interface TurnHandoff {
  protocol: number;
  from: PlayerId;
  to: PlayerId;
  turn: number; // the turn number in the handed-over state (the turn that is starting)
  firstSeq: number; // seq of entries[0], or the next seq if there are none
  entries: LogEntry[];
  state: GameState;
  fingerprint: string;
}

export interface HandoffAck {
  protocol: number;
  turn: number;
  fingerprint: string;
  lastSeq: number;
  ok: boolean;
  reason?: string;
}

/** Bump when the handoff or ack shape changes. */
export const HANDOFF_PROTOCOL = 1;

/** JSON with object keys sorted at every level (and undefined fields dropped), so equal states give equal text. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : sortKeys(v)));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = sortKeys(v);
    }
    return out;
  }
  return value;
}

/** cyrb53: a fast 53-bit string hash, as 14 hex digits. Not cryptographic: it catches drift and corruption. */
function hash53(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, '0');
}

/** The state's fingerprint: the same on both screens exactly when the states are the same. */
export function fingerprintState(state: GameState): string {
  return hash53(canonicalJson(state));
}

export function buildHandoff(from: PlayerId, state: GameState, entries: LogEntry[], nextSeq: number): TurnHandoff {
  return {
    protocol: HANDOFF_PROTOCOL,
    from,
    to: from === 'player1' ? 'player2' : 'player1',
    turn: state.turnCount,
    firstSeq: entries.length > 0 ? entries[0].seq : nextSeq,
    entries,
    state,
    fingerprint: fingerprintState(state)
  };
}

/**
 * The receiving side's check of a handoff: the right protocol and game version, a fingerprint that matches the state,
 * log entries that carry on from the last one it has (lastSeq) without gaps, and a turn that moves forward.
 */
export function verifyHandoff(h: TurnHandoff, lastSeq: number, lastTurn: number | null): HandoffAck {
  const nack = (reason: string): HandoffAck => ({ protocol: HANDOFF_PROTOCOL, turn: h?.turn ?? -1, fingerprint: h?.fingerprint ?? '', lastSeq, ok: false, reason });
  if (!h || typeof h !== 'object' || !h.state || !Array.isArray(h.entries)) return nack('Not a turn handoff.');
  if (h.protocol !== HANDOFF_PROTOCOL) return nack(`Handoff protocol ${h.protocol} does not match this game (${HANDOFF_PROTOCOL}).`);
  if (h.state.version !== GAME_STATE_VERSION) return nack(`Game state version ${h.state.version} does not match this game (${GAME_STATE_VERSION}).`);
  const match = checkVersionMatch({ gameVersion: h.state.gameVersion, buildId: h.state.buildId });
  if (!match.ok) return nack(match.reason || 'Different game version.');
  if (fingerprintState(h.state) !== h.fingerprint) return nack('The state does not match its fingerprint.');
  if (h.firstSeq !== lastSeq + 1) return nack(`The log carries on from entry ${h.firstSeq - 1}, but this side has up to entry ${lastSeq}.`);
  for (let i = 0; i < h.entries.length; i++) {
    if (h.entries[i].seq !== h.firstSeq + i) return nack(`Log entry ${h.firstSeq + i} is missing or out of order.`);
  }
  if (lastTurn !== null && h.turn < lastTurn) return nack(`The handoff is for turn ${h.turn}, but this side is already on turn ${lastTurn}.`);
  const last = h.entries.length > 0 ? h.entries[h.entries.length - 1].seq : lastSeq;
  return { protocol: HANDOFF_PROTOCOL, turn: h.turn, fingerprint: h.fingerprint, lastSeq: last, ok: true };
}

/** The sender's check of the acknowledgement it got back. */
export function isAckFor(ack: HandoffAck, h: TurnHandoff): boolean {
  return ack.ok && ack.protocol === HANDOFF_PROTOCOL && ack.turn === h.turn && ack.fingerprint === h.fingerprint;
}

const label = (p: PlayerId) => (p === 'player1' ? 'P1' : 'P2');

/** What changed on the board between two renders, as log lines (moves, units entering or leaving play, damage, armour). */
export function describeBoardChanges(
  before: Record<string, { hex: string; name: string; owner: PlayerId; damage: number; armour: number }>,
  after: Record<string, { hex: string; name: string; owner: PlayerId; damage: number; armour: number }>
): { kind: LogKind; text: string }[] {
  const out: { kind: LogKind; text: string }[] = [];
  for (const [id, a] of Object.entries(after)) {
    const b = before[id];
    if (!b) {
      out.push({ kind: 'unit', text: `${label(a.owner)} ${a.name} entered play on ${a.hex}` });
      continue;
    }
    if (b.hex !== a.hex) out.push({ kind: 'move', text: `${label(a.owner)} ${a.name} ${b.hex} → ${a.hex}` });
    if (b.damage !== a.damage) {
      out.push({
        kind: 'unit',
        text: a.damage > b.damage ? `${a.name} took ${a.damage - b.damage} damage (${a.damage} total)` : `${a.name} healed ${b.damage - a.damage} (${a.damage} damage left)`
      });
    }
    if (b.armour !== a.armour) out.push({ kind: 'unit', text: `${a.name} armour ${b.armour} → ${a.armour}` });
  }
  for (const [id, b] of Object.entries(before)) {
    if (!after[id]) out.push({ kind: 'unit', text: `${label(b.owner)} ${b.name} left play from ${b.hex}` });
  }
  return out;
}

/** Changes in each player's hand, deck and graveyard sizes, as log lines (counts only: hands stay hidden). */
export function describeCardChanges(
  before: Record<PlayerId, { hand: number; deck: number; grave: number }>,
  after: Record<PlayerId, { hand: number; deck: number; grave: number }>
): string[] {
  const out: string[] = [];
  (['player1', 'player2'] as PlayerId[]).forEach((p) => {
    const b = before[p];
    const a = after[p];
    const parts: string[] = [];
    const diff = (n: number, word: string) => n !== 0 && parts.push(`${word} ${n > 0 ? '+' : ''}${n}`);
    diff(a.hand - b.hand, 'hand');
    diff(a.deck - b.deck, 'deck');
    diff(a.grave - b.grave, 'graveyard');
    if (parts.length > 0) out.push(`${label(p)} cards: ${parts.join(', ')} (hand ${a.hand}, deck ${a.deck}, graveyard ${a.grave})`);
  });
  return out;
}

/** The parts of each unit (by id) that the log follows. */
export function boardLogSnapshot(
  board: Record<string, BattlefieldUnit>
): Record<string, { hex: string; name: string; owner: PlayerId; damage: number; armour: number }> {
  const out: Record<string, { hex: string; name: string; owner: PlayerId; damage: number; armour: number }> = {};
  for (const [hex, u] of Object.entries(board)) {
    out[u.instanceId] = { hex, name: u.card.name, owner: u.owner, damage: u.damageCounters, armour: u.armour };
  }
  return out;
}
