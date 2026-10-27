/**
 * Seeded random numbers for the match, so the same seed always gives the same shuffles, coin flips and ids.
 * Online, both clients start from the same seed and replay the same actions, so their games stay identical.
 *
 * The generator is mulberry32: its whole state is one 32-bit number, which is saved with the game state.
 */

/** Advances a mulberry32 state: returns a number in [0, 1) and the next state. */
export function nextRandom(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: next };
}

/** A starting seed for a new hot seat match (online matches get theirs from both players). */
export function makeSeed(): number {
  return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;
}

/** A shuffled copy of `items` (Fisher-Yates), drawing each number from `random`. */
export function shuffleWith<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
