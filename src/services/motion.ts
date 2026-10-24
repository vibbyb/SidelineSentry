// Motion sensor service for balance testing, with desktop simulation fallback

import { IMotionProvider, MotionCallback, MotionFrame } from '../types/clinical';
import { PosturalSwayFilter } from './motion/GravityFilter';
import { RingBuffer } from './motion/RingBuffer';

// Checks if the user is running on a real phone or tablet (including iPadOS desktop-class Safari)
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))
  );
}

// Rounds to 3 decimal places
export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// Reads phone accelerometer using DeviceMotionEvent
export class HardwareMotionProvider implements IMotionProvider {
  private active = false;
  private callback: MotionCallback | null = null;
  private ringBuffer = new RingBuffer(256);
  private swayFilter = new PosturalSwayFilter(0.9502);
  private lastSampleTimeMs = 0;

  // Reusable frame object to keep memory clean
  private frame: MotionFrame = {
    timestamp: 0,
    x: 0,
    y: 0,
    z: 0,
    rms: 0,
    isSimulated: false
  };

  private motionListener = (event: DeviceMotionEvent) => {
    if (!this.active || !this.callback) return;

    let rawX: number | null = null;
    let rawY: number | null = null;
    let rawZ: number | null = null;

    const accelGrav = event.accelerationIncludingGravity;
    const accel = event.acceleration;

    if (accelGrav && accelGrav.x != null && accelGrav.y != null && accelGrav.z != null) {
      rawX = Number(accelGrav.x) || 0;
      rawY = Number(accelGrav.y) || 0;
      rawZ = Number(accelGrav.z) || 0;
    } else if (accel && accel.x != null && accel.y != null && accel.z != null) {
      rawX = Number(accel.x) || 0;
      rawY = Number(accel.y) || 0;
      rawZ = Number(accel.z) || 0;
    } else {
      return;
    }

    if (!Number.isFinite(rawX) || !Number.isFinite(rawY) || !Number.isFinite(rawZ)) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let dt = 0.01667; // Default ~60Hz
    if (this.lastSampleTimeMs > 0) {
      dt = (now - this.lastSampleTimeMs) / 1000;
    }
    this.lastSampleTimeMs = now;
    const clampedDt = Math.min(Math.max(dt, 0.005), 0.05);

    // Filter out static gravity tilt
    const filtered = this.swayFilter.process(rawX, rawY, rawZ, clampedDt);
    this.ringBuffer.push(filtered.planarMagnitude);

    this.frame.timestamp = now;
    this.frame.x = round3(filtered.x);
    this.frame.y = round3(filtered.y);
    this.frame.z = round3(filtered.z);
    this.frame.rms = round3(this.ringBuffer.getRMS());
    this.frame.isSimulated = false;

    this.callback(this.frame);
  };

  public async requestPermission(): Promise<boolean> {
    const DeviceMotion = typeof window !== 'undefined' ? (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent : undefined;
    if (DeviceMotion && typeof DeviceMotion.requestPermission === 'function') {
      try {
        const response = await DeviceMotion.requestPermission();
        return response === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  public isAvailable(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  public getMode(): 'hardware' | 'simulated' {
    return 'hardware';
  }

  public async start(callback: MotionCallback): Promise<boolean> {
    this.stop();
    this.callback = callback;
    this.active = true;
    this.lastSampleTimeMs = 0;
    this.ringBuffer.reset();
    this.swayFilter.reset();

    if (typeof window !== 'undefined') {
      window.addEventListener('devicemotion', this.motionListener, { passive: true });
    }
    return true;
  }

  public stop(): void {
    this.active = false;
    this.callback = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.motionListener);
    }
  }
}

// Simulates body sway oscillations for desktop testing
export class SimulatedMotionProvider implements IMotionProvider {
  private active = false;
  private timerId: number | null = null;
  private callback: MotionCallback | null = null;
  private profile: 'healthy' | 'concussed' = 'healthy';
  private ringBuffer = new RingBuffer(128);
  private phase = 0;
  private perturbation = 0;

  constructor(initialProfile: 'healthy' | 'concussed' = 'healthy') {
    this.profile = initialProfile;
  }

  public isAvailable(): boolean {
    return true;
  }

  public getMode(): 'hardware' | 'simulated' {
    return 'simulated';
  }

  public isRunning(): boolean {
    return this.active;
  }

  public getSimulationProfile(): 'healthy' | 'concussed' {
    return this.profile;
  }

  public setSimulationProfile(profile: 'healthy' | 'concussed'): void {
    this.profile = profile;
  }

  public triggerPerturbation(intensity = 1.2): void {
    this.perturbation = intensity;
  }

  public tick(): MotionFrame {
    this.phase += 0.05;

    // Normal tremor (~0.06 m/s²) vs concussed unsteady sway (~0.25 m/s²)
    const isConcussed = this.profile === 'concussed';
    const baseFreq = isConcussed ? 1.4 : 0.8;
    const baseAmp = isConcussed ? 0.22 : 0.05;

    const noiseX = (Math.random() - 0.5) * 0.04;
    const noiseZ = (Math.random() - 0.5) * 0.04;

    let x = Math.sin(this.phase * baseFreq) * baseAmp + noiseX;
    let z = Math.cos(this.phase * (baseFreq * 0.7)) * (baseAmp * 0.8) + noiseZ;

    // Apply any sudden movement spike (like a slip or cough)
    if (this.perturbation > 0) {
      const signX = Math.random() > 0.5 ? 1 : -1;
      const signZ = Math.random() > 0.5 ? 1 : -1;
      x += signX * this.perturbation * 0.7;
      z += signZ * this.perturbation * 0.7;
      this.perturbation *= 0.85;
      if (this.perturbation < 0.05) this.perturbation = 0;
    }

    const planarNorm = Math.sqrt(x * x + z * z);
    this.ringBuffer.push(planarNorm);

    return {
      timestamp: Date.now(),
      x: round3(x),
      y: 0,
      z: round3(z),
      rms: round3(this.ringBuffer.getRMS()),
      isSimulated: true
    };
  }

  public async start(callback: MotionCallback): Promise<boolean> {
    this.stop();
    this.callback = callback;
    this.active = true;
    this.ringBuffer.reset();
    this.phase = 0;
    this.perturbation = 0;

    this.timerId = window.setInterval(() => {
      if (this.callback) {
        this.callback(this.tick());
      }
    }, 16);

    return true;
  }

  public stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.active = false;
    this.callback = null;
  }
}

// Returns hardware provider on mobile or simulation on desktop, unless forceSimulated is requested
export function createMotionProvider(
  preferredProfile: 'healthy' | 'concussed' = 'healthy',
  options?: { forceSimulated?: boolean }
): IMotionProvider {
  if (options?.forceSimulated) {
    return new SimulatedMotionProvider(preferredProfile);
  }
  if (isMobileDevice()) {
    return new HardwareMotionProvider();
  }
  return new SimulatedMotionProvider(preferredProfile);
}

// Simple compatibility alias for tests and components
export const MotionProviderFactory = {
  isMobileDevice,
  createDefaultProvider: (
    preferredProfile: 'healthy' | 'concussed' = 'healthy',
    options?: { forceSimulated?: boolean }
  ) => createMotionProvider(preferredProfile, options),
  getHardwareProvider: () => new HardwareMotionProvider(),
  getSimulatedProvider: (profile: 'healthy' | 'concussed' = 'healthy') => new SimulatedMotionProvider(profile)
};
