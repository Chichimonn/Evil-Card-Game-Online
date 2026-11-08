import { PlayerId } from '../types/game';
import { GameState } from '../game/gameState';
import { CardItem } from '../types/card';
import { HandoffAck, LogEntry, TurnHandoff } from '../game/turnHandoff';
import { VersionInfo } from '../version';

/**
 * Online play, Phase 3: everything the two players' games say to each other.
 *
 * Every message is an envelope { proto, n, type, payload }: `proto` is this file's protocol version (a game that speaks
 * another version is turned away during the hello), `n` counts the messages each side has sent (from 1), and `type`
 * picks the payload. Later phases add their own types here (the lobby in Phase 4, mid-turn decisions in Phase 5) and
 * bump NET_PROTOCOL.
 */
export const NET_PROTOCOL = 4;

export interface NetPayloads {
  // The first message each side sends: which game it is running, and its role in the room
  hello: { version: VersionInfo; role: 'host' | 'guest' };
  // The other side's hello was accepted (both games match)
  welcome: { version: VersionInfo };
  // The end of a turn (see game/turnHandoff.ts), and the receiver's answer to it
  handoff: { handoff: TurnHandoff };
  handoff_ack: { ack: HandoffAck };
  // The whole match as it stands, with its log and who sits where: for starting a match and for resyncing
  state_sync: { state: GameState; log: LogEntry[]; seats: Record<'host' | 'guest', PlayerId>; lastAckedSeq: number; epoch?: number };
  // Rejoining a match after a dropped link (Phase 7): each side says which match it has and how far along it is (epoch
  // counts the handoffs it has seen); the side that is further along sends the match (state_sync)
  rejoin_hello: { matchId: string; epoch: number; turn: number; activePlayer: PlayerId; fingerprint: string };
  // A player gives up the match
  concede: { player: PlayerId };
  // The lobby (Phase 4): a commitment to a secret, then the secret itself (see net/lobby.ts), and the deck a player
  // picked (whole cards, so both games deal the very same ones)
  lobby_commit: { commitment: string };
  lobby_reveal: { secret: number };
  lobby_deck: { name: string; cards: CardItem[] };
  // The coin flip (Rule 4): Player 2's call, then the winner's choice of who goes first
  coin_call: { side: 'heads' | 'tails' };
  coin_order: { first: PlayerId };
  // Mid-turn choices by the other player (Phase 5): the screen running the turn asks, the deciding player answers.
  // kind names the choice (see DECISION_KINDS); data is that choice's prompt and answer its result.
  decision_request: { id: number; kind: DecisionKind; data: any };
  decision_answer: { id: number; kind: DecisionKind; answer: any };
  // A readied interrupt (e.g. Ready Spell) taking over: the reacting player gets the game to act in, then hands it back
  react_start: { state: GameState; react: any; log: LogEntry[]; fingerprint: string };
  react_done: { state: GameState; log: LogEntry[]; fingerprint: string };
  // Keep-alive: answered at once, so each side knows the other is still there
  ping: { t: number };
  pong: { t: number };
  // Leaving the room, or being turned away, with the reason
  bye: { reason: string; canRejoin?: boolean };
}

export type NetMessageType = keyof NetPayloads;

/** The choices one player can be asked to make during the other's turn. */
export const DECISION_KINDS = ['knockback', 'scry', 'research', 'loot', 'deckArrange', 'popupOrder', 'readySpell', 'cardChoice'] as const;
export type DecisionKind = (typeof DECISION_KINDS)[number];

export type NetMessage = {
  [K in NetMessageType]: { proto: number; n: number; type: K; payload: NetPayloads[K] };
}[NetMessageType];

const isObj = (v: unknown): v is Record<string, any> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// The minimum each payload must have to be handled; the handlers check the rest (e.g. verifyHandoff)
const PAYLOAD_CHECKS: { [K in NetMessageType]: (p: any) => boolean } = {
  hello: (p) => isObj(p.version) && typeof p.version.gameVersion === 'string' && (p.role === 'host' || p.role === 'guest'),
  welcome: (p) => isObj(p.version),
  handoff: (p) => isObj(p.handoff) && isObj(p.handoff.state) && Array.isArray(p.handoff.entries),
  handoff_ack: (p) => isObj(p.ack) && typeof p.ack.ok === 'boolean',
  state_sync: (p) => isObj(p.state) && Array.isArray(p.log) && isObj(p.seats) && typeof p.lastAckedSeq === 'number',
  lobby_commit: (p) => typeof p.commitment === 'string' && /^[0-9a-f]{64}$/.test(p.commitment),
  lobby_reveal: (p) => typeof p.secret === 'number',
  lobby_deck: (p) => typeof p.name === 'string' && Array.isArray(p.cards) && p.cards.length > 0 && p.cards.every((c: any) => isObj(c) && typeof c.id === 'string'),
  coin_call: (p) => p.side === 'heads' || p.side === 'tails',
  coin_order: (p) => p.first === 'player1' || p.first === 'player2',
  decision_request: (p) => typeof p.id === 'number' && DECISION_KINDS.includes(p.kind) && isObj(p.data),
  decision_answer: (p) => typeof p.id === 'number' && DECISION_KINDS.includes(p.kind) && isObj(p.answer),
  react_start: (p) => isObj(p.state) && isObj(p.react) && Array.isArray(p.log) && typeof p.fingerprint === 'string',
  react_done: (p) => isObj(p.state) && Array.isArray(p.log) && typeof p.fingerprint === 'string',
  rejoin_hello: (p) => typeof p.matchId === 'string' && typeof p.epoch === 'number' && typeof p.turn === 'number' && (p.activePlayer === 'player1' || p.activePlayer === 'player2') && typeof p.fingerprint === 'string',
  concede: (p) => p.player === 'player1' || p.player === 'player2',
  ping: (p) => typeof p.t === 'number',
  pong: (p) => typeof p.t === 'number',
  bye: (p) => typeof p.reason === 'string'
};

export function makeMessage<K extends NetMessageType>(type: K, payload: NetPayloads[K], n: number): NetMessage {
  return { proto: NET_PROTOCOL, n, type, payload } as NetMessage;
}

/** Reads a received message. Returns an error (instead of throwing) when it isn't one this game understands. */
export function parseMessage(raw: unknown): { ok: true; msg: NetMessage } | { ok: false; reason: string } {
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return { ok: false, reason: 'The message could not be read.' };
    }
  }
  if (!isObj(data)) return { ok: false, reason: 'The message is not an object.' };
  if (data.proto !== NET_PROTOCOL) return { ok: false, reason: `Message protocol ${data.proto} does not match this game (${NET_PROTOCOL}).` };
  if (typeof data.n !== 'number') return { ok: false, reason: 'The message has no number.' };
  const check = PAYLOAD_CHECKS[data.type as NetMessageType];
  if (!check) return { ok: false, reason: `Unknown message type "${String(data.type)}".` };
  if (!isObj(data.payload) || !check(data.payload)) return { ok: false, reason: `The "${data.type}" message is missing parts.` };
  return { ok: true, msg: data as NetMessage };
}
