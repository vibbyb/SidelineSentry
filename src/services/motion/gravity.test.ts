import { describe, it, expect } from 'vitest';
import { HighPassFilter, PosturalSwayFilter } from './GravityFilter';

describe('GravityFilter', () => {
  it('filters out constant tilt over time', () => {
    const filter = new HighPassFilter(0.9502, 0.5);
    const dt = 0.01667; // 60Hz iOS polling interval

    // 1. Initialize filter in upright vertical position (0 tilt)
    for (let i = 0; i < 30; i++) {
      filter.filter(0, dt);
    }

    // 2. Sudden step change to 20-degree chest pitch: 9.81 * sin(20 deg) ~= 3.355 m/s^2
    const stepTiltG = 3.355;
    const initialSpike = filter.filter(stepTiltG, dt);
    // Initial response to step impulse must capture the step
    expect(initialSpike).toBeGreaterThan(2.5);

    // 3. Observe exponential decay over 120 samples (~2.0 seconds at 60Hz)
    let decayedOutput = initialSpike;
    for (let i = 0; i < 120; i++) {
      decayedOutput = filter.filter(stepTiltG, dt);
    }

    // Residual DC leak must be attenuated below 0.05 m/s^2
    expect(Math.abs(decayedOutput)).toBeLessThan(0.05);
  });

  it('preserves motion tremor during active sway', () => {
    const filter = new PosturalSwayFilter();
    const staticAngleOffset = 2.5; // Sternum tilt offset

    let peakDynamicSway = 0;
    // Feed static tilt offset + 2Hz vestibular oscillation
    for (let i = 0; i < 120; i++) {
      const dynamicTremor = Math.sin(i * 0.2) * 0.35;
      const rawInput = staticAngleOffset + dynamicTremor;
      const res = filter.process(rawInput, 0, 9.8);
      if (i > 30) {
        peakDynamicSway = Math.max(peakDynamicSway, Math.abs(res.x));
      }
    }

    // Dynamic component must be retained (> 0.15 m/s^2)
    expect(peakDynamicSway).toBeGreaterThan(0.15);
  });

  it('adapts filter alpha to sampling rate dt', () => {
    const filter = new HighPassFilter(); // fc = 0.5Hz, RC = 1/(2*pi*0.5) ~= 0.31831

    // 100Hz hardware (dt = 0.01s): alpha = 0.31831 / (0.31831 + 0.01) ~= 0.9695
    filter.filter(1.0, 0.01);
    expect(filter.getAlpha()).toBeCloseTo(0.9695, 3);

    // 60Hz iOS hardware (dt = 0.01667s): alpha = 0.31831 / (0.31831 + 0.01667) ~= 0.9501
    filter.filter(1.0, 0.01667);
    expect(filter.getAlpha()).toBeCloseTo(0.9501, 3);

    // 50Hz Android hardware (dt = 0.02s): alpha = 0.31831 / (0.31831 + 0.02) ~= 0.9409
    filter.filter(1.0, 0.02);
    expect(filter.getAlpha()).toBeCloseTo(0.9409, 3);
  });

  it('calculates planar magnitude ignoring vertical axis', () => {
    const filter = new PosturalSwayFilter();

    // Process a frame where Y (vertical spinal heave) has high acceleration (2.0 m/s^2),
    // but X and Z (transverse sway) are zero
    for (let i = 0; i < 20; i++) {
      filter.process(0, 2.0, 0);
    }
    const verticalOnly = filter.process(0, 2.0, 0);

    // Transverse planar magnitude must be 0 because X and Z are 0
    expect(verticalOnly.planarMagnitude).toBe(0);
    expect(verticalOnly.magnitude).toBe(0);

    // Now process a frame with lateral sway X = 0.3, anteroposterior sway Z = 0.4, vertical heave Y = 5.0
    for (let i = 0; i < 20; i++) {
      filter.process(0.3, 5.0, 0.4);
    }
    const combined = filter.process(0.3, 5.0, 0.4);
    // fx and fz will settle to ~0 for DC, but planarMagnitude always computes sqrt(fx^2 + fz^2)
    expect(combined.planarMagnitude).toBe(Math.sqrt(combined.x * combined.x + combined.z * combined.z));
    expect(combined.magnitude).toBe(combined.planarMagnitude);
  });

  it('handles zero or negative cutoff frequency cleanly', () => {
    const zeroCutoffFilter = new HighPassFilter(0.95, 0);
    expect(zeroCutoffFilter.getCutoffHz()).toBe(0.01);

    const outZero1 = zeroCutoffFilter.filter(1.5, 0.01667);
    expect(Number.isFinite(outZero1)).toBe(true);
    expect(Number.isNaN(outZero1)).toBe(false);

    const outZero2 = zeroCutoffFilter.filter(2.0, 0.01667);
    expect(Number.isFinite(outZero2)).toBe(true);
    expect(Number.isNaN(outZero2)).toBe(false);

    const negativeCutoffFilter = new HighPassFilter(0.95, -5.0);
    expect(negativeCutoffFilter.getCutoffHz()).toBe(0.01);

    const outNeg1 = negativeCutoffFilter.filter(1.0, 0.02);
    expect(Number.isFinite(outNeg1)).toBe(true);
    expect(Number.isNaN(outNeg1)).toBe(false);

    const outNeg2 = negativeCutoffFilter.filter(1.8, 0.02);
    expect(Number.isFinite(outNeg2)).toBe(true);
    expect(Number.isNaN(outNeg2)).toBe(false);

    // Also test NaN input guard
    const outNan = zeroCutoffFilter.filter(NaN, 0.01667);
    expect(outNan).toBe(0);
  });
});
