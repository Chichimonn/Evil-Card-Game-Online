// Gentle synthesized Web Audio sound effects

// One audio engine for every sound effect. (Each effect used to create its own and never close it; they piled up
// over a match, and the sound turned into crackling static, worst when several played at once.)
let sharedContext: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedContext || sharedContext.state === 'closed') sharedContext = new AudioContextClass();
  // (browsers start it suspended until the page has been clicked)
  if (sharedContext.state === 'suspended') sharedContext.resume().catch(() => {});
  return sharedContext;
}

// Several effects at the same moment (e.g. a hit and a loot) play one bloop, not a stack of them
let lastBloopAt = 0;

export function playCardDrawSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - lastBloopAt < 0.05) return;
    lastBloopAt = now;

    // Quick soft "bloop"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

    // (a few milliseconds' fade in: starting at full volume makes a click)
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    osc.start(now);
    osc.stop(now + 0.16);
  } catch {
    // Ignore audio failures if browser policy blocks autoplay
  }
}
