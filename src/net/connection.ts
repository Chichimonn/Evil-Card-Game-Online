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

// How the two browsers reach each other. STUN servers let each browser learn its public address, which is enough for
// most home networks. When both sides are behind stricter networks (many mobile carriers, some ISPs, work and school
// networks), the connection has to go through a relay (TURN) server instead. PeerJS's own free relays no longer
// exist, so the relay comes from build settings (e.g. Vercel's environment variables):
//   VITE_TURN_URLS        comma-separated, e.g. turn:standard.relay.metered.ca:80,turns:standard.relay.metered.ca:443
//   VITE_TURN_USERNAME    the relay's username
//   VITE_TURN_CREDENTIAL  the relay's password
// (they end up in the published game, as any relay a browser game uses must: use one meant for that, with its own
// usage limits)
const TURN_URLS = String(import.meta.env.VITE_TURN_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
  ...(TURN_URLS.length > 0
    ? [{ urls: TURN_URLS, username: String(import.meta.env.VITE_TURN_USERNAME || ''), credential: String(import.meta.env.VITE_TURN_CREDENTIAL || '') }]
    : [])
];
const PEER_OPTIONS = { debug: 0, config: { iceServers: ICE_SERVERS } };
/** Whether this build has a relay server for players whose networks can't connect directly. */
export const HAS_RELAY = TURN_URLS.length > 0;

// The two games found each other but couldn't open a connection between them
const negotiationFailedText = () =>
  HAS_RELAY
    ? "Found the other player's game, but couldn't connect to it, even through the relay server. One of your networks may be blocking it: try another network (e.g. a phone hotspot)."
    : "Found the other player's game, but your two networks won't let your browsers connect directly, and this game has no relay server set up for that. Try another network (e.g. a phone hotspot); the game's host can add a relay (TURN) server to fix this for everyone.";
const isNegotiationFailure = (err: any) =>
  err?.type === 'negotiation-failed' || /negotiation/i.test(String(err?.message || ''));
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
  private joinAttempts = 0;
  // Gives up on a join that found the room but never managed to connect (see openGuest)
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
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
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
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
    const peer = new Peer(PEER_PREFIX + this.code, PEER_OPTIONS);
    this.peer = peer;
    peer.on('open', () => {
      // (and again after reconnecting to the server, below)
      if (!this.conn) this.setStatus('waiting', this.code);
    });
    this.keepRegistered(peer);
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

  // The host must stay registered with the connection server to be found. Browsers slow down background tabs (e.g.
  // while the code is being sent over chat), and networks blip: the server then drops the host without a word, and
  // its room can no longer be found although its screen still shows the code. Whenever that happens, re-register.
  private keepRegistered(peer: Peer) {
    peer.on('disconnected', () => {
      if (this.peer !== peer || peer.destroyed) return;
      setTimeout(() => {
        if (this.peer === peer && !peer.destroyed && peer.disconnected) peer.reconnect();
      }, 1000);
    });
    // (a tab coming back to the front checks straight away rather than waiting)
    const onVisible = () => {
      if (this.peer !== peer || peer.destroyed) return document.removeEventListener('visibilitychange', onVisible);
      if (document.visibilityState === 'visible' && peer.disconnected) peer.reconnect();
    };
    document.addEventListener('visibilitychange', onVisible);
  }

  private openGuest() {
    this.joinAttempts += 1;
    this.setStatus('opening');
    const peer = new Peer(PEER_OPTIONS);
    this.peer = peer;
    peer.on('open', () => {
      this.setStatus('connecting');
      // (binary: PeerJS splits big messages, e.g. a whole match, into pieces; its JSON mode refuses anything over ~16KB)
      this.attach(peer.connect(PEER_PREFIX + this.code, { reliable: true, serialization: 'binary' }));
      // Found, but the two browsers can't reach each other directly (some networks block it): say so, don't hang
      this.connectTimer = setTimeout(() => {
        if (this.peer === peer && (this.status === 'connecting' || this.status === 'handshake')) {
          this.shutdown(
            'error',
            `Couldn't reach a game with the code ${this.code}. Check the code, and that the host's game is still open and showing it (if not, the host can host again and send the new code). If both are right, one of your networks may be blocking direct connections (common on work, school and some mobile networks): try another network, or a phone hotspot.`
          );
        }
      }, 20000);
    });
    peer.on('error', (err: any) => {
      // The host may be re-registering with the server for a moment: look again a few times before giving up
      if (err?.type === 'peer-unavailable' && this.joinAttempts < 4 && this.status !== 'closed') {
        if (this.connectTimer) clearTimeout(this.connectTimer);
        this.connectTimer = null;
        this.conn = null;
        peer.destroy();
        setTimeout(() => this.status !== 'closed' && this.status !== 'error' && this.openGuest(), 2000);
        return;
      }
      this.handlePeerError(err);
    });
  }

  private handlePeerError(err: any) {
    const type = err?.type as string | undefined;
    const detail =
      type === 'peer-unavailable'
        ? `No open room has the code ${this.code}. Check the code, and that the host's game still shows it (if not, the host can host again and send the new code).`
        : type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed'
        ? "Couldn't reach the connection server. Check your internet connection."
        : isNegotiationFailure(err)
        ? negotiationFailedText()
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
      if (this.connectTimer) clearTimeout(this.connectTimer);
      this.connectTimer = null;
      this.setStatus('handshake');
      this.lastHeard = Date.now();
      this.send('hello', { version: LOCAL_VERSION, role: this.role });
    });
    conn.on('data', (data) => this.receive(data));
    conn.on('close', () => {
      if (this.status !== 'closed' && this.status !== 'error') this.shutdown('closed', 'The connection to the other player closed.');
    });
    conn.on('error', (err: any) =>
      this.shutdown('error', isNegotiationFailure(err) ? negotiationFailedText() : `Connection error: ${err?.message || err}`)
    );
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
