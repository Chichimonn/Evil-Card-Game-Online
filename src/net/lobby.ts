import { PlayerId } from '../types/game';
import type { RoomRole } from './connection';

/**
 * Online play, Phase 4: a match seed neither player can pick on their own (commit, then reveal).
 *
 * Each side draws a secret number and first sends only a commitment to it (a SHA-256 hash). Once both commitments are
 * in, each reveals its secret; the other side checks it against the commitment. The match seed is then a hash of both
 * secrets, so neither player could have steered it after seeing the other's choice. The seed decides who sits where,
 * then drives the shuffles, the deal and the coin flip like any hot seat match (see utils/rng).
 */

/** A random 32-bit secret (from the browser's secure random source, not the match's seeded one). */
export function makeSecret(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The commitment a side sends first. The room code and role are mixed in, so one can't be replayed elsewhere. */
export function commitTo(secret: number, role: RoomRole, roomCode: string): Promise<string> {
  return sha256Hex(`evil-card-game|commit|${roomCode}|${role}|${secret >>> 0}`);
}

/** Whether a revealed secret is the one the other side committed to. */
export async function checkReveal(secret: number, role: RoomRole, roomCode: string, commitment: string): Promise<boolean> {
  if (!Number.isInteger(secret) || secret < 0 || secret > 0xffffffff) return false;
  return (await commitTo(secret, role, roomCode)) === commitment;
}

/** The match seed from both secrets (the same on both screens). */
export async function combineSeed(hostSecret: number, guestSecret: number, roomCode: string): Promise<number> {
  const hex = await sha256Hex(`evil-card-game|seed|${roomCode}|${hostSecret >>> 0}|${guestSecret >>> 0}`);
  return parseInt(hex.slice(0, 8), 16) >>> 0;
}

/** Who sits where, from the seed: Player 1 flips the coin and Player 2 calls it (Rule 4). */
export function seatsFromSeed(seed: number): Record<RoomRole, PlayerId> {
  return (seed & 1) === 0 ? { host: 'player1', guest: 'player2' } : { host: 'player2', guest: 'player1' };
}
