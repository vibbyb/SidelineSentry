import { describe, it, expect } from 'vitest';
import { ClinicalValidityAuditor, calculateTriage } from '../scoring';

describe('scoring and validity', () => {
  it('flags anticipatory reaction time trials (<150ms)', () => {
    const anticipatoryTrials = [120, 230, 240];
    const audit = ClinicalValidityAuditor.auditReactionTrials(anticipatoryTrials);
    expect(audit.valid).toBe(false);
    expect(audit.reason).toContain('Anticipatory reaction detected');
  });

  it('flags inconsistent reaction trials with high variance', () => {
    // Athlete purposely responds in 180ms, then waits 550ms, then 200ms
    const erraticTrials = [180, 550, 200];
    const audit = ClinicalValidityAuditor.auditReactionTrials(erraticTrials);
    expect(audit.valid).toBe(false);
    expect(audit.reason).toContain('Excessive trial variance detected');
  });

  it('accepts reaction trials with consistent response times', () => {
    const validTrials = [225, 245, 238];
    const audit = ClinicalValidityAuditor.auditReactionTrials(validTrials);
    expect(audit.valid).toBe(true);
  });

  it('flags flat stationary placement during balance test (<0.005 m/s^2)', () => {
    const audit = ClinicalValidityAuditor.auditPosturalSway(0.001);
    expect(audit.valid).toBe(false);
    expect(audit.reason).toContain('Zero physiological tremor detected');
  });

  it('flags sudden phone drops or slip spikes (>2.5 m/s^2)', () => {
    // Athlete dropped phone or cough caused 3.1 m/s^2 spike
    const audit = ClinicalValidityAuditor.auditPosturalSway(0.08, false, 3.1);
    expect(audit.valid).toBe(false);
    expect(audit.reason).toContain('Motion artifact / grip slip detected');

    const directAudit = ClinicalValidityAuditor.auditPeakMotionArtifact(2.8);
    expect(directAudit.valid).toBe(false);
    expect(directAudit.reason).toContain('Motion artifact or grip slip detected');

    const validPeak = ClinicalValidityAuditor.auditPeakMotionArtifact(0.45);
    expect(validPeak.valid).toBe(true);
  });

  it('flags excessive false starts (>= 3)', () => {
    const validTrials = [220, 230, 225];
    const audit = ClinicalValidityAuditor.auditReactionTrials(validTrials, 3);
    expect(audit.valid).toBe(false);
    expect(audit.reason).toContain('Excessive false starts');
  });

  it('flags unnaturally fast King-Devick reading (<12.0s)', () => {
    const dummyAthlete = {
      id: 'test-1',
      name: 'Test Athlete',
      jerseyNumber: '1',
      sport: 'Football',
      position: 'QB',
      baselineStabilityIndex: 0.085,
      baselineReactionTimeMs: 230,
      baselineKingDevickSeconds: 42.0
    };
    const triage = calculateTriage(
      dummyAthlete,
      { durationSeconds: 15, stabilityIndex: 0.085, peakSway: 0.1, swayHistory: [], valid: true },
      { averageMs: 230, fastestMs: 220, slowestMs: 240, trials: [230, 230, 230], falseStarts: 0, valid: true },
      { durationSeconds: 8.5, errorsCount: 0, completed: true, valid: false },
      {
        neckPain: false,
        doubleVision: false,
        weaknessOrTingling: false,
        severeOrIncreasingHeadache: false,
        seizureOrConvulsion: false,
        lossOfConsciousness: false,
        deterioratingConsciousState: false,
        vomitingRepeated: false,
        increasingConfusion: false
      }
    );
    expect(triage.verdict).toBe('INVALID_ASSESSMENT_RETEST_REQUIRED');
    expect(triage.primaryTriggers.some(t => t.includes('Reading completed unnaturally fast'))).toBe(true);
  });

  it('flags non-numeric stability index and routes to retest', () => {
    const audit = ClinicalValidityAuditor.auditPosturalSway(NaN);
    expect(audit.valid).toBe(false);
    expect(audit.reason).toContain('Corrupted or non-finite accelerometer telemetry stream');
    expect(audit.code).toBe('SENSOR_FROZEN_OR_SATURATED');

    const dummyAthlete = {
      id: 'test-nan',
      name: 'Test Athlete',
      jerseyNumber: '12',
      sport: 'Soccer',
      position: 'Midfielder',
      baselineStabilityIndex: 0.085,
      baselineReactionTimeMs: 230,
      baselineKingDevickSeconds: 42.0
    };

    const triage = calculateTriage(
      dummyAthlete,
      { durationSeconds: 15, stabilityIndex: NaN, peakSway: 0.1, swayHistory: [], valid: true },
      { averageMs: 230, fastestMs: 220, slowestMs: 240, trials: [230, 230, 230], falseStarts: 0, valid: true },
      { durationSeconds: 42.0, errorsCount: 0, completed: true, valid: true },
      {
        neckPain: false,
        doubleVision: false,
        weaknessOrTingling: false,
        severeOrIncreasingHeadache: false,
        seizureOrConvulsion: false,
        lossOfConsciousness: false,
        deterioratingConsciousState: false,
        vomitingRepeated: false,
        increasingConfusion: false
      }
    );

    expect(triage.verdict).toBe('INVALID_ASSESSMENT_RETEST_REQUIRED');
    expect(triage.verdict).not.toBe('CLEAR_OBSERVED');
    expect(triage.primaryTriggers.some(t => t.includes('Corrupted Sensor / Timing Telemetry'))).toBe(true);
  });

  it('routes incomplete King-Devick test to retest', () => {
    const dummyAthlete = {
      id: 'test-kd-incomplete',
      name: 'Test Athlete',
      jerseyNumber: '7',
      sport: 'Basketball',
      position: 'Guard',
      baselineStabilityIndex: 0.085,
      baselineReactionTimeMs: 230,
      baselineKingDevickSeconds: 42.0
    };

    const triage = calculateTriage(
      dummyAthlete,
      { durationSeconds: 15, stabilityIndex: 0.085, peakSway: 0.1, swayHistory: [], valid: true },
      { averageMs: 230, fastestMs: 220, slowestMs: 240, trials: [230, 230, 230], falseStarts: 0, valid: true },
      { durationSeconds: 30.0, errorsCount: 0, completed: false, valid: true },
      {
        neckPain: false,
        doubleVision: false,
        weaknessOrTingling: false,
        severeOrIncreasingHeadache: false,
        seizureOrConvulsion: false,
        lossOfConsciousness: false,
        deterioratingConsciousState: false,
        vomitingRepeated: false,
        increasingConfusion: false
      }
    );

    expect(triage.verdict).toBe('INVALID_ASSESSMENT_RETEST_REQUIRED');
    expect(triage.primaryTriggers.some(t => t.includes('Eye Tracking Incomplete: Assessment exited before all 3 test cards were completed'))).toBe(true);
  });
});
