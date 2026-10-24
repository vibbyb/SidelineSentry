import { describe, it, expect } from 'vitest';
import {
  SimulatedMotionProvider,
  MotionProviderFactory,
  HardwareMotionProvider,
  isMobileDevice,
  createMotionProvider
} from '../motion';
import { MotionFrame, AthleteProfile } from '../../types/clinical';
import { auditPosturalSway, calculateTriage } from '../scoring';

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

  it('uses simulated provider on desktop browsers and defaults to healthy profile', () => {
    const provider = createMotionProvider();
    expect(provider).toBeDefined();
    expect(provider.getMode()).toBe('simulated');
    expect((provider as SimulatedMotionProvider).getSimulationProfile()).toBe('healthy');

    const factoryProvider = MotionProviderFactory.createDefaultProvider();
    expect(factoryProvider.getMode()).toBe('simulated');
    expect((factoryProvider as SimulatedMotionProvider).getSimulationProfile()).toBe('healthy');
  });

  it('respects forceSimulated option even on mobile devices', () => {
    const originalNavigator = globalThis.navigator;
    // Mock mobile device
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'iPhone; CPU iPhone OS 17_0 like Mac OS X',
        maxTouchPoints: 5
      },
      configurable: true,
      writable: true
    });

    expect(isMobileDevice()).toBe(true);

    // Standard creation returns HardwareMotionProvider on mobile
    const normalMobileProvider = createMotionProvider();
    expect(normalMobileProvider.getMode()).toBe('hardware');

    // With forceSimulated: true, it returns SimulatedMotionProvider
    const forcedSimProvider = createMotionProvider('concussed', { forceSimulated: true });
    expect(forcedSimProvider.getMode()).toBe('simulated');
    expect((forcedSimProvider as SimulatedMotionProvider).getSimulationProfile()).toBe('concussed');

    // Restore original navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true
    });
  });

  it('switches simulation profile between healthy and concussed immediately', () => {
    const sim = new SimulatedMotionProvider('healthy');
    expect(sim.getSimulationProfile()).toBe('healthy');

    sim.setSimulationProfile('concussed');
    expect(sim.getSimulationProfile()).toBe('concussed');

    sim.setSimulationProfile('healthy');
    expect(sim.getSimulationProfile()).toBe('healthy');
  });

  it('confirms desktop simulated motion stays within validity boundaries (>0.005 and <2.5)', () => {
    const baseAthlete: AthleteProfile = {
      id: 'desktop-demo-ath',
      name: 'Demo Athlete',
      jerseyNumber: '7',
      sport: 'Basketball',
      position: 'Forward',
      hasRecordedBaseline: true,
      baselineStabilityIndex: 0.085,
      baselineReactionTimeMs: 230,
      baselineKingDevickSeconds: 42.0
    };

    // 1. Healthy Profile: run 200 ticks (~3.3 seconds of simulated motion)
    const healthySim = new SimulatedMotionProvider('healthy');
    let healthyPeak = 0;
    let lastHealthyFrame: MotionFrame = healthySim.tick();

    for (let i = 0; i < 200; i++) {
      const frame = healthySim.tick();
      lastHealthyFrame = frame;
      const mag = Math.sqrt(frame.x * frame.x + frame.z * frame.z);
      if (mag > healthyPeak) healthyPeak = mag;
    }

    // Verify healthy simulated RMS is well above 0.005 floor and peak below 2.5 spike limit
    expect(lastHealthyFrame.rms).toBeGreaterThan(0.005);
    expect(healthyPeak).toBeLessThan(2.5);

    const healthyAudit = auditPosturalSway(lastHealthyFrame.rms, false, healthyPeak);
    expect(healthyAudit.valid).toBe(true);

    const healthyTriage = calculateTriage(
      baseAthlete,
      {
        durationSeconds: 15,
        stabilityIndex: lastHealthyFrame.rms,
        peakSway: healthyPeak,
        swayHistory: [],
        valid: true
      },
      { averageMs: 230, fastestMs: 220, slowestMs: 240, trials: [230, 230, 230], falseStarts: 0, valid: true },
      { durationSeconds: 42.0, errorsCount: 0, completed: true, valid: true },
      {
        neckPain: false, doubleVision: false, weaknessOrTingling: false,
        severeOrIncreasingHeadache: false, seizureOrConvulsion: false,
        lossOfConsciousness: false, deterioratingConsciousState: false,
        vomitingRepeated: false, increasingConfusion: false
      }
    );
    expect(healthyTriage.verdict).toBe('CLEAR_OBSERVED');

    // 2. Concussed Profile: run 200 ticks
    const concussedSim = new SimulatedMotionProvider('concussed');
    let concussedPeak = 0;
    let lastConcussedFrame: MotionFrame = concussedSim.tick();

    for (let i = 0; i < 200; i++) {
      const frame = concussedSim.tick();
      lastConcussedFrame = frame;
      const mag = Math.sqrt(frame.x * frame.x + frame.z * frame.z);
      if (mag > concussedPeak) concussedPeak = mag;
    }

    expect(lastConcussedFrame.rms).toBeGreaterThan(0.005);
    expect(concussedPeak).toBeLessThan(2.5);

    const concussedAudit = auditPosturalSway(lastConcussedFrame.rms, false, concussedPeak);
    expect(concussedAudit.valid).toBe(true);

    const concussedTriage = calculateTriage(
      baseAthlete,
      {
        durationSeconds: 15,
        stabilityIndex: lastConcussedFrame.rms,
        peakSway: concussedPeak,
        swayHistory: [],
        valid: true
      },
      { averageMs: 230, fastestMs: 220, slowestMs: 240, trials: [230, 230, 230], falseStarts: 0, valid: true },
      { durationSeconds: 42.0, errorsCount: 0, completed: true, valid: true },
      {
        neckPain: false, doubleVision: false, weaknessOrTingling: false,
        severeOrIncreasingHeadache: false, seizureOrConvulsion: false,
        lossOfConsciousness: false, deterioratingConsciousState: false,
        vomitingRepeated: false, increasingConfusion: false
      }
    );
    // Concussed profile produces elevated sway => IMMEDIATE_REMOVAL, never INVALID_ASSESSMENT_RETEST_REQUIRED
    expect(concussedTriage.verdict).toBe('IMMEDIATE_REMOVAL');
    expect(concussedTriage.verdict).not.toBe('INVALID_ASSESSMENT_RETEST_REQUIRED');
  });
});
