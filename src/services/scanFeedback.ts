let audioContext: AudioContext | null = null;

const SUCCESS_BEEP_FREQUENCY_HZ = 1200;
const SUCCESS_BEEP_DURATION_SECONDS = 0.08;
const SUCCESS_BEEP_VOLUME = 0.08;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  if (typeof window === 'undefined') return null;

  const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextConstructor) return null;

  audioContext = new AudioContextConstructor();
  return audioContext;
}

// Call from the user gesture that starts/focuses scanning so mobile browsers
// allow the success sound to play after the asynchronous IndexedDB write.
export function prepareScanSuccessFeedback(): void {
  try {
    const context = getAudioContext();
    if (!context || context.state === 'running') return;

    void context.resume().catch(() => undefined);

    // Starting a silent source inside the gesture reliably unlocks Web Audio
    // on iOS Safari so a later post-persistence beep is allowed.
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    source.connect(context.destination);
    source.addEventListener('ended', () => source.disconnect(), { once: true });
    source.start();
  } catch (err) {
    // Audio feedback is optional and must never interrupt counting.
  }
}

export async function playScanSuccessFeedback(): Promise<void> {
  try { navigator.vibrate?.(40); } catch (err) { /* ignore */ }

  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') await context.resume();

    const startAt = context.currentTime;
    const stopAt = startAt + SUCCESS_BEEP_DURATION_SECONDS;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(SUCCESS_BEEP_FREQUENCY_HZ, startAt);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(SUCCESS_BEEP_VOLUME, startAt + 0.01);
    gain.gain.linearRampToValueAtTime(0, stopAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
    oscillator.start(startAt);
    oscillator.stop(stopAt);
  } catch (err) {
    // Scanning remains successful when sound is unavailable or blocked.
  }
}
