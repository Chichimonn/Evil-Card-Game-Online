// Gentle synthesized Web Audio sound effects
export function playCardDrawSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Quick soft paper whoosh / flip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignore audio failures if browser policy blocks autoplay
  }
}
