import Peer, { DataConnection } from 'peerjs';
import { checkVersionMatch, LOCAL_VERSION } from '../version';
import { makeMessage, NetMessage, NetMessageType, NetPayloads, parseMessage } from './messages';

/**
 * Online play, Phase 3: a peer-to-peer link between the two players' games, found by a room code.
 *
 * The host opens a room (a PeerJS id made from the code) and waits; the guest joins with the code. PeerJS's public
 * server only introduces the two browsers: the game's messages then go directly between them (WebRTC). Once linked,
 * each side says hello with its game version; a different version is turned away. Only one guest fits in a room.
 */

export type RoomRole = 'host' | 'guest';
export type RoomStatus =
  | 'opening' // reaching the PeerJS server
  | 'waiting' // host: the room is open, waiting for the guest
  | 'connecting' // guest: reaching the host
  | 'handshake' // linked, checking each other's game version
  | 'connected' // ready for game messages
  | 'quiet' // connected, but nothing heard from the other side for a while
  | 'closed' // the other side left, or this side closed the room
  | 'error';

export interface RoomEvents {
  onStatus: (status: RoomStatus, detail?: string) => void;
  onMessage: (msg: NetMessage) => void;
}

const PEER_PREFIX = 'evil-card-game-room-';
// No 0/O or 1/I, so a code read aloud or copied by hand is hard to get wrong
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const PING_EVERY_MS = 5000;
const QUIET_AFTER_MS = 15000;

/** A new room code. (Not part of the game's results, so it doesn't use the match's seeded randomness.) */
export function makeRoomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** A typed-in code, tidied (case, spaces); null if it can't be a room code. */
export function normalizeRoomCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

export class RoomConnection {
  readonly role: RoomRole;
  code: string;
  status: RoomStatus = 'opening';
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private events: RoomEvents;
  private sent = 0;
  private theyAccepted = false; // the other side welcomed our hello
  private weAccepted = false; // we welcomed theirs
  private lastHeard = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private hostAttempts = 0;
  // Reopening a room with its old code (rejoining a match): a taken code is waited for, not replaced
  private fixedCode = false;
  // How the room ended: this side closed it, the other side left on purpose, or the link dropped (or the other side
  // left meaning to come back, e.g. reloading the page). Only a drop is worth reconnecting after.
  endedBy: 'us' | 'them' | 'drop' | null = null;

  private constructor(role: RoomRole, code: string, events: RoomEvents) {
    this.role = role;
    this.code = code;
    this.events = events;
  }

  /** Opens a new room and waits for a guest (code: reopen the room with this code, e.g. to rejoin a match). */
  static host(events: RoomEvents, code?: string): RoomConnection {
    const room = new RoomConnection('host', code || makeRoomCode(), events);
    room.fixedCode = Boolean(code);
    // (started once the caller holds the room, so its first status can name it)
    queueMicrotask(() => room.openHost());
    return room;
  }

  /** Joins the room with this code. */
  static join(code: string, events: RoomEvents): RoomConnection {
    const room = new RoomConnection('guest', code, events);
    queueMicrotask(() => room.openGuest());
    return room;
  }

  get isConnected(): boolean {
    return this.status === 'connected' || this.status === 'quiet';
  }

  /** Sends a game message. Returns false if there's no link to send it on. */
  send<K extends NetMessageType>(type: K, payload: NetPayloads[K]): boolean {
    if (!this.conn || !this.conn.open) return false;
    this.sent += 1;
    if (import.meta.env.DEV && type !== 'ping' && type !== 'pong') console.debug('[net] sending', type, this.sent);
    // As JSON text: PeerJS's binary packing turns undefined fields into null, which would change a state's fingerprint;
    // JSON drops them, as the fingerprint does
    const text = JSON.stringify(makeMessage(type, payload, this.sent));
    // (testing, dev server only: outgoing messages can be held back to simulate a slow link, in order)
    const lag = RoomConnection.testConditions;
    if (import.meta.env.DEV && (lag.lagMs > 0 || lag.jitterMs > 0)) {
      const at = Math.max(Date.now() + lag.lagMs + Math.random() * lag.jitterMs, this.lastSendAt + 1);
      this.lastSendAt = at;
      const conn = this.conn;
      setTimeout(() => conn.open && conn.send(text), at - Date.now());
      return true;
    }
    this.conn.send(text);
    return true;
  }

  // Testing (dev server only): a delay (plus up to jitterMs more) on every message this game sends
  static testConditions = { lagMs: 0, jitterMs: 0 };
  private lastSendAt = 0;

  /** Testing (dev server only): cut the link without a goodbye, as a lost network connection would. */
  simulateDrop(): void {
    if (!import.meta.env.DEV) return;
    this.conn?.close();
  }

  /** Leaves the room, telling the other side why (canRejoin: this side means to come back, e.g. a page reload). */
  close(reason = 'The other player left the room.', canRejoin = false): void {
    // (a room that already ended, e.g. a failed attempt, has nothing to close)
    if (this.status === 'closed' || this.status === 'error') return;
    this.endedBy = 'us';
    this.send('bye', { reason, canRejoin });
    this.shutdown('closed', reason);
  }

  private setStatus(status: RoomStatus, detail?: string) {
    this.status = status;
    this.events.onStatus(status, detail);
  }

  private shutdown(status: RoomStatus, detail?: string) {
    if (!this.endedBy) this.endedBy = 'drop';
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
    const conn = this.conn;
    const peer = this.peer;
    this.conn = null;
    this.peer = null;
    // (let a last message, e.g. a bye, go out first)
    setTimeout(() => {
      conn?.close();
      peer?.destroy();
    }, 200);
    this.setStatus(status, detail);
  }

  private openHost() {
    this.hostAttempts += 1;
    this.setStatus('opening');
    const peer = new Peer(PEER_PREFIX + this.code, { debug: 0 });
    this.peer = peer;
    peer.on('open', () => this.setStatus('waiting', this.code));
    peer.on('connection', (conn) => {
      if (this.conn) {
        // A room holds one guest
        conn.on('open', () => {
          conn.send(JSON.stringify(makeMessage('bye', { reason: 'That room already has two players.' }, 1)));
          setTimeout(() => conn.close(), 200);
        });
        return;
      }
      this.attach(conn);
    });
    peer.on('error', (err: any) => {
      if (err?.type === 'unavailable-id' && this.fixedCode && this.hostAttempts < 15) {
        // The old room may still be closing on the server: try the same code again shortly
        peer.destroy();
        setTimeout(() => this.status !== 'closed' && this.openHost(), 2000);
        return;
      }
      if (err?.type === 'unavailable-id' && !this.fixedCode && this.hostAttempts < 3) {
        // The code is taken: try another
        peer.destroy();
        this.code = makeRoomCode();
        this.openHost();
        return;
      }
      this.handlePeerError(err);
    });
  }

  private openGuest() {
    this.setStatus('opening');
    const peer = new Peer({ debug: 0 });
    this.peer = peer;
    peer.on('open', () => {
      this.setStatus('connecting');
      // (binary: PeerJS splits big messages, e.g. a whole match, into pieces; its JSON mode refuses anything over ~16KB)
      this.attach(peer.connect(PEER_PREFIX + this.code, { reliable: true, serialization: 'binary' }));
    });
    peer.on('error', (err: any) => this.handlePeerError(err));
  }

  private handlePeerError(err: any) {
    const type = err?.type as string | undefined;
    const detail =
      type === 'peer-unavailable'
        ? `No open room has the code ${this.code}.`
        : type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed'
        ? "Couldn't reach the connection server. Check your internet connection."
        : type === 'browser-incompatible'
        ? "This browser can't make peer-to-peer connections."
        : `Connection error${type ? ` (${type})` : ''}: ${err?.message || err}`;
    // Losing the server after the link is made doesn't matter: messages go directly between the two games
    if (this.isConnected && (type === 'network' || type === 'socket-closed' || type === 'disconnected')) return;
    this.shutdown('error', detail);
  }

  private attach(conn: DataConnection) {
    this.conn = conn;
    conn.on('open', () => {
      this.setStatus('handshake');
      this.lastHeard = Date.now();
      this.send('hello', { version: LOCAL_VERSION, role: this.role });
    });
    conn.on('data', (data) => this.receive(data));
    conn.on('close', () => {
      if (this.status !== 'closed' && this.status !== 'error') this.shutdown('closed', 'The connection to the other player closed.');
    });
    conn.on('error', (err: any) => this.shutdown('error', `Connection error: ${err?.message || err}`));
  }

  private receive(data: unknown) {
    this.lastHeard = Date.now();
    if (this.status === 'quiet') this.setStatus('connected');
    const parsed = parseMessage(data);
    if (!parsed.ok) {
      // During the hello, a message this game can't read means the other game is a different version: say so and stop
      if (this.status === 'handshake') {
        const reason = `The other player's game doesn't match this one (${parsed.reason})`;
        this.send('bye', { reason });
        this.shutdown('error', reason);
        return;
      }
      console.warn('[net] ignored a message:', parsed.reason, data);
      return;
    }
    const msg = parsed.msg;
    if (import.meta.env.DEV && msg.type !== 'ping' && msg.type !== 'pong') console.debug('[net] received', msg.type, msg.n);
    switch (msg.type) {
      case 'hello': {
        const match = checkVersionMatch(msg.payload.version);
        if (!match.ok || msg.payload.role === this.role) {
          const reason = !match.ok ? match.reason || 'The two games are different versions.' : 'Both games joined as the same role.';
          this.send('bye', { reason });
          this.shutdown('error', reason);
          return;
        }
        this.weAccepted = true;
        this.send('welcome', { version: LOCAL_VERSION });
        this.checkReady();
        return;
      }
      case 'welcome':
        this.theyAccepted = true;
        this.checkReady();
        return;
      case 'ping':
        this.send('pong', { t: msg.payload.t });
        return;
      case 'pong':
        return;
      case 'bye':
        this.endedBy = msg.payload.canRejoin ? 'drop' : 'them';
        this.shutdown('closed', msg.payload.reason);
        return;
      default:
        // Game messages only count once both sides have accepted each other
        if (this.isConnected) this.events.onMessage(msg);
        else console.warn('[net] a game message arrived before the hello finished:', msg.type);
    }
  }

  private checkReady() {
    if (!this.weAccepted || !this.theyAccepted || this.isConnected) return;
    this.setStatus('connected');
    this.pingTimer = setInterval(() => {
      this.send('ping', { t: Date.now() });
      const quiet = Date.now() - this.lastHeard > QUIET_AFTER_MS;
      if (quiet && this.status === 'connected') this.setStatus('quiet', 'Nothing heard from the other player for a while.');
    }, PING_EVERY_MS);
  }
}
