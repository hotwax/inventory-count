import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('scan success feedback', () => {
  let context: any;
  let oscillator: any;
  let gain: any;
  let silentSource: any;

  beforeEach(() => {
    vi.resetModules();

    oscillator = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      addEventListener: vi.fn(),
    };
    gain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    silentSource = {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      addEventListener: vi.fn(),
    };
    context = {
      state: 'suspended',
      currentTime: 4,
      sampleRate: 48000,
      destination: {},
      resume: vi.fn().mockImplementation(async () => { context.state = 'running'; }),
      createBuffer: vi.fn().mockReturnValue({}),
      createBufferSource: vi.fn().mockReturnValue(silentSource),
      createOscillator: vi.fn().mockReturnValue(oscillator),
      createGain: vi.fn().mockReturnValue(gain),
    };

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: vi.fn(function () { return context; }),
    });
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unlocks audio synchronously from the scan-start gesture', async () => {
    const { prepareScanSuccessFeedback } = await import('./scanFeedback');

    prepareScanSuccessFeedback();

    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.createBuffer).toHaveBeenCalledWith(1, 1, 48000);
    expect(silentSource.start).toHaveBeenCalledOnce();
  });

  it('plays a short beep and vibration after a successful scan', async () => {
    const { playScanSuccessFeedback } = await import('./scanFeedback');

    await playScanSuccessFeedback();

    expect(navigator.vibrate).toHaveBeenCalledWith(40);
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(1200, 4);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 4.08);
    expect(oscillator.start).toHaveBeenCalledWith(4);
    expect(oscillator.stop).toHaveBeenCalledWith(4.08);
  });
});
