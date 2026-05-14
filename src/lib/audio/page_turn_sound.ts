/**
 * Short procedural "page turn" burst — no external asset (avoids autoplay fetch issues).
 * Call at the same time Framer Motion begins exit / enter for route transitions.
 */
export function playPageTurnSound(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const AudioCtx: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    const ctx: AudioContext = new AudioCtx();
    const durationSec: number = 0.09;
    const sampleRate: number = ctx.sampleRate;
    const frameCount: number = Math.floor(sampleRate * durationSec);
    const buffer: AudioBuffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data: Float32Array = buffer.getChannelData(0);
    for (let i: number = 0; i < frameCount; i++) {
      const t: number = i / frameCount;
      const env: number = Math.sin(t * Math.PI) * Math.exp(-t * 4);
      data[i] = (Math.random() * 2 - 1) * 0.12 * env;
    }
    const src: AudioBufferSourceNode = ctx.createBufferSource();
    src.buffer = buffer;
    const bp: BiquadFilterNode = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.7;
    const gain: GainNode = ctx.createGain();
    gain.gain.value = 0.55;
    src.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + durationSec + 0.02);
    window.setTimeout(() => {
      void ctx.close().catch(() => {
        /* ignore */
      });
    }, 400);
  } catch {
    /* autoplay or AudioContext blocked */
  }
}
