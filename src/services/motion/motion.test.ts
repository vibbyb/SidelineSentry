import { describe, it, expect } from 'vitest';
import {
  SimulatedMotionProvider,
  MotionProviderFactory,
  HardwareMotionProvider,
  isMobileDevice
} from '../motion';
import { MotionFrame } from '../../types/clinical';

describe('motion providers', () => {
  it('generates healthy vs concussed motion profiles', () => {
    const healthySim = new SimulatedMotionProvider('healthy');
    const concussedSim = new SimulatedMotionProvider('concussed');

    let healthySumRms = 0;
    for (let i = 0; i < 100; i++) {
      const frame = healthySim.tick();
      expect(frame.isSimulated).toBe(true);
      healthySumRms += frame.rms;
    }
    const avgHealthyRms = healthySumRms / 100;

    let concussedSumRms = 0;
    for (let i = 0; i < 100; i++) {
      const frame = concussedSim.tick();
      expect(frame.isSimulated).toBe(true);
      concussedSumRms += frame.rms;
    }
    const avgConcussedRms = concussedSumRms / 100;

    // Concussed profile must demonstrate significantly elevated postural instability
    expect(avgConcussedRms).toBeGreaterThan(avgHealthyRms * 2.0);
  });

  it('responds to manual movement triggers', () => {
    const sim = new SimulatedMotionProvider('healthy');
    sim.tick();
    sim.triggerPerturbation(2.0);
    const frame = sim.tick();
    const magnitude = Math.sqrt(frame.x * frame.x + frame.z * frame.z);
    expect(magnitude).toBeGreaterThan(0.3);
  });

  it('detects iPadOS Safari user agents via maxTouchPoints', () => {
    const originalNavigator = globalThis.navigator;

    // iPadOS 13+ desktop-class Safari masquerades as Macintosh Intel with touch points:
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        maxTouchPoints: 5
      },
      configurable: true,
      writable: true
    });

    expect(isMobileDevice()).toBe(true);

    // Standard desktop Mac without touch screen:
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        maxTouchPoints: 0
      },
      configurable: true,
      writable: true
    });

    expect(isMobileDevice()).toBe(false);

    // Standard iPhone:
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5
      },
      configurable: true,
      writable: true
    });

    expect(isMobileDevice()).toBe(true);

    // Restore original navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
  });

  it('HardwareMotionProvider processes devicemotion events and cleans up on stop()', async () => {
    const listeners: Record<string, ((event: any) => void)[]> = {};
    const mockWindow = {
      addEventListener: (type: string, listener: any) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(listener);
      },
      removeEventListener: (type: string, listener: any) => {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter(l => l !== listener);
        }
      },
      dispatchEvent: (event: any) => {
        const type = event.type || 'devicemotion';
        listeners[type]?.forEach(l => l(event));
        return true;
      }
    };

    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = mockWindow;

    const provider = new HardwareMotionProvider();
    expect(provider.getMode()).toBe('hardware');

    const frames: MotionFrame[] = [];
    const callback = (frame: MotionFrame) => {
      frames.push({ ...frame });
    };

    await provider.start(callback);

    // Dispatch simulated devicemotion event
    const event1 = {
      type: 'devicemotion',
      accelerationIncludingGravity: { x: 0.1, y: 9.8, z: 0.2 }
    };
    mockWindow.dispatchEvent(event1);

    expect(frames.length).toBe(1);
    expect(frames[0].isSimulated).toBe(false);
    expect(typeof frames[0].x).toBe('number');
    expect(typeof frames[0].rms).toBe('number');

    // Clean up via stop()
    provider.stop();

    // Dispatch another devicemotion event after stop; callback must not be triggered
    const event2 = {
      type: 'devicemotion',
      accelerationIncludingGravity: { x: 0.5, y: 9.8, z: 0.5 }
    };
    mockWindow.dispatchEvent(event2);

    expect(frames.length).toBe(1);

    if (previousWindow !== undefined) {
      (globalThis as any).window = previousWindow;
    } else {
      delete (globalThis as any).window;
    }
  });

  it('uses simulated provider on desktop browsers', () => {
    const provider = MotionProviderFactory.createDefaultProvider();
    expect(provider).toBeDefined();
    expect(provider.getMode()).toBe('simulated');
  });
});
