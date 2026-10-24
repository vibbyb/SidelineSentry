// Offline Web Audio synthesizer for test countdown and completion beeps.
// Uses browser AudioContext directly so no mp3 or wav files are needed.

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
      } catch {
        return null;
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(err => console.warn('Audio resume blocked:', err));
  }
  return audioCtx;
}

export function warmAudioContext(): void {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(err => console.warn('Audio resume blocked:', err));
  }
}

export function playTone(freq: number, type: OscillatorType, durationMs: number, gainVal: number = 0.15): void {
  const ctx = getContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const safeDuration = Math.max(10, durationMs);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + safeDuration / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* ignore already disconnected */
      }
    };

    osc.start();
    osc.stop(ctx.currentTime + safeDuration / 1000);
  } catch (e) {
    console.warn('Audio cue suppressed or unsupported:', e);
  }
}

export function triggerHaptic(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics suppressed, unsupported, or restricted by permission policy
    }
  }
}

export function playCountdownPip(): void {
  triggerHaptic(40);
  playTone(440, 'sine', 120, 0.2); // 440Hz short beep
}

export function playTestStart(): void {
  triggerHaptic(150);
  playTone(880, 'triangle', 400, 0.25); // 880Hz high chime
}

export function playTestComplete(): void {
  triggerHaptic([100, 60, 150]);
  playTone(523.25, 'triangle', 150, 0.2); // C5
  setTimeout(() => playTone(659.25, 'triangle', 150, 0.2), 120); // E5
  setTimeout(() => playTone(783.99, 'triangle', 350, 0.25), 240); // G5
}

export function playFalseStartBuzz(): void {
  triggerHaptic([200, 80, 200]);
  playTone(160, 'sawtooth', 300, 0.3); // Low buzz for false starts
}

// Backward-compatible object for components
export const AudioCueService = {
  warmAudioContext,
  playTone,
  triggerHaptic,
  playCountdownPip,
  playTestStart,
  playTestComplete,
  playFalseStartBuzz,
};
