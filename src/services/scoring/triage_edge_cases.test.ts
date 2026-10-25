import { describe, it, expect } from 'vitest';
import { calculateTriage, auditReactionTrials, auditPosturalSway } from '../scoring';
import { AthleteProfile, AssessmentRecord } from '../../types/clinical';
import { loadAssessments, getAthleteHistory, loadAthletes } from '../storage';
import { formatPlainTextReport } from '../../utils/reportFormatter';

describe('triage and scoring edge cases (correctness audit)', () => {
  const baseAthlete: AthleteProfile = {
    id: 'ath-test-1',
    name: 'Taylor Jordan',
    jerseyNumber: '10',
    sport: 'Soccer',
    position: 'Midfielder',
    hasRecordedBaseline: true,
    baselineStabilityIndex: 0.085,
    baselineReactionTimeMs: 230,
    baselineKingDevickSeconds: 42.0
  };

  const normalBalance: AssessmentRecord['balanceScore'] = {
    durationSeconds: 15,
    stabilityIndex: 0.088,
    peakSway: 0.15,
    swayHistory: [0.08, 0.09],
    valid: true
  };

  const normalReaction: AssessmentRecord['reactionScore'] = {
    averageMs: 235,
    fastestMs: 220,
    slowestMs: 245,
    trials: [230, 235, 240],
    falseStarts: 0,
    valid: true
  };

  const normalKD: AssessmentRecord['kingDevickScore'] = {
    durationSeconds: 43.0,
    errorsCount: 0,
    completed: true,
    valid: true
  };

  const noRedFlags: AssessmentRecord['redFlags'] = {
    neckPain: false,
    doubleVision: false,
    weaknessOrTingling: false,
    severeOrIncreasingHeadache: false,
    seizureOrConvulsion: false,
    lossOfConsciousness: false,
    deterioratingConsciousState: false,
    vomitingRepeated: false,
    increasingConfusion: false
  };

  it('never clears athlete as CLEAR_OBSERVED when a test was skipped', () => {
    // King-Devick skipped without red flags
    const skippedKD: AssessmentRecord['kingDevickScore'] = {
      durationSeconds: 0,
      errorsCount: 0,
      completed: false,
      skippedReason: 'Eye tracking skipped due to field lighting'
    };

    const triage = calculateTriage(baseAthlete, normalBalance, normalReaction, skippedKD, noRedFlags);
    expect(triage.verdict).toBe('INVALID_ASSESSMENT_RETEST_REQUIRED');
    expect(triage.verdict).not.toBe('CLEAR_OBSERVED');
    expect(triage.primaryTriggers.some(t => t.includes('skipped'))).toBe(true);
  });

  it('does NOT push skipped test triggers into primaryTriggers when red flags are checked', () => {
    const flagsWithNeckPain: AssessmentRecord['redFlags'] = {
      ...noRedFlags,
      neckPain: true,
      hasRedFlags: true
    };

    const skippedBalance: AssessmentRecord['balanceScore'] = {
      durationSeconds: 0,
      stabilityIndex: 0,
      peakSway: 0,
      swayHistory: [],
      valid: false,
      skippedReason: 'Skipped for safety: Emergency warning sign observed'
    };
    const skippedReaction: AssessmentRecord['reactionScore'] = {
      averageMs: 0,
      fastestMs: 0,
      slowestMs: 0,
      trials: [],
      falseStarts: 0,
      valid: false,
      skippedReason: 'Skipped for safety: Emergency warning sign observed'
    };
    const skippedKD: AssessmentRecord['kingDevickScore'] = {
      durationSeconds: 0,
      errorsCount: 0,
      completed: false,
      skippedReason: 'Skipped for safety: Emergency warning sign observed'
    };

    const triage = calculateTriage(baseAthlete, skippedBalance, skippedReaction, skippedKD, flagsWithNeckPain);
    expect(triage.verdict).toBe('IMMEDIATE_REMOVAL');
    expect(triage.primaryTriggers).toEqual(['EMERGENCY PROTOCOL: Neck pain or tenderness']);
    expect(triage.primaryTriggers.length).toBe(1);
    expect(triage.primaryTriggers.some(t => /skipped/i.test(t))).toBe(false);
  });

  it('normalizes deltas to zero for skipped tests instead of negative numbers', () => {
    const skippedBalance: AssessmentRecord['balanceScore'] = {
      durationSeconds: 0,
      stabilityIndex: 0,
      peakSway: 0,
      swayHistory: [],
      valid: false,
      skippedReason: 'Skipped'
    };
    const skippedReaction: AssessmentRecord['reactionScore'] = {
      averageMs: 0,
      fastestMs: 0,
      slowestMs: 0,
      trials: [],
      falseStarts: 0,
      valid: false,
      skippedReason: 'Skipped'
    };
    const skippedKD: AssessmentRecord['kingDevickScore'] = {
      durationSeconds: 0,
      errorsCount: 0,
      completed: false,
      skippedReason: 'Skipped'
    };

    const triage = calculateTriage(baseAthlete, skippedBalance, skippedReaction, skippedKD, noRedFlags);
    expect(triage.swayDegradationPercent).toBe(0);
    expect(triage.reactionDelayDeltaMs).toBe(0);
    expect(triage.kingDevickDeltaSeconds).toBe(0);
  });

  it('rejects negative or invalid baseline values and falls back to standard baseline without safety margin trigger', () => {
    const corruptedBaselineAthlete: AthleteProfile = {
      ...baseAthlete,
      hasRecordedBaseline: true,
      baselineStabilityIndex: -0.15,
      baselineReactionTimeMs: -200,
      baselineKingDevickSeconds: 0
    };

    const triage = calculateTriage(corruptedBaselineAthlete, normalBalance, normalReaction, normalKD, noRedFlags);
    expect(triage.hasIndividualBaseline).toBe(false);
    expect(triage.primaryTriggers.some(t => t.includes('Safety Margin') || t.includes('School Safety'))).toBe(false);
  });

  it('flags zero physiological tremor floor (<0.005 m/s^2) in calculateTriage', () => {
    const tableBalance: AssessmentRecord['balanceScore'] = {
      durationSeconds: 15,
      stabilityIndex: 0.001,
      peakSway: 0.002,
      swayHistory: [],
      valid: true
    };

    const triage = calculateTriage(baseAthlete, tableBalance, normalReaction, normalKD, noRedFlags);
    expect(triage.verdict).toBe('INVALID_ASSESSMENT_RETEST_REQUIRED');
    expect(triage.verdict).not.toBe('CLEAR_OBSERVED');

    const invalidSampleAudit = auditPosturalSway(0.08, 0);
    expect(invalidSampleAudit.valid).toBe(false);

    const invalidPeakAudit = auditPosturalSway(0.08, false, -1.0);
    expect(invalidPeakAudit.valid).toBe(false);
  });

  it('flags negative sensor readings as corrupted telemetry in calculateTriage', () => {
    const negativeBalance: AssessmentRecord['balanceScore'] = {
      durationSeconds: 15,
      stabilityIndex: -0.05,
      peakSway: 0.1,
      swayHistory: [],
      valid: true
    };

    const triage = calculateTriage(baseAthlete, negativeBalance, normalReaction, normalKD, noRedFlags);
    expect(triage.verdict).toBe('INVALID_ASSESSMENT_RETEST_REQUIRED');
    expect(triage.verdict).not.toBe('CLEAR_OBSERVED');
  });

  it('flags negative reaction trial as corrupted telemetry instead of anticipation', () => {
    const corruptedTrials = [-50, 220, 240];
    const audit = auditReactionTrials(corruptedTrials);
    expect(audit.valid).toBe(false);
    expect(audit.code).toBe('TIMING_TELEMETRY_CORRUPTED');
    expect(audit.reason).toContain('Corrupted or non-finite');
  });

  it('safely filters corrupted localStorage entries without crashing', () => {
    const storageStore: Record<string, string> = {
      sidelinesentry_assessments: JSON.stringify([null, { id: 'valid-1', athleteId: 'ath-1' }, 'string_entry', undefined]),
      sidelinesentry_athletes: JSON.stringify([null, { id: 'a1', name: 'Athlete 1' }, 123])
    };

    const mockStorage = {
      getItem: (key: string) => storageStore[key] || null,
      setItem: (key: string, value: string) => { storageStore[key] = value; },
      removeItem: (key: string) => { delete storageStore[key]; },
      clear: () => { Object.keys(storageStore).forEach(k => delete storageStore[k]); },
      key: (i: number) => Object.keys(storageStore)[i] || null,
      length: 0
    };

    (globalThis as unknown as { localStorage: typeof mockStorage }).localStorage = mockStorage;
    (globalThis as unknown as { window: { localStorage: typeof mockStorage } }).window = { localStorage: mockStorage };

    // Should not throw TypeError: Cannot read properties of null
    const history = getAthleteHistory('ath-1');
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('valid-1');

    const loaded = loadAssessments();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('valid-1');

    const athletes = loadAthletes([baseAthlete]);
    expect(athletes).toHaveLength(1);
    expect(athletes[0].name).toBe('Athlete 1');
  });

  it('formatPlainTextReport safely handles skipped tests and undefined metrics without throwing', () => {
    const assessmentWithSkipped: AssessmentRecord = {
      id: 'session-skip',
      athleteId: baseAthlete.id,
      timestamp: '2026-10-24 10:00:00',
      isPostImpact: true,
      balanceScore: {
        durationSeconds: 0,
        stabilityIndex: 0,
        peakSway: 0,
        swayHistory: [],
        valid: false,
        skippedReason: 'Injured limb'
      },
      reactionScore: {
        averageMs: 0,
        fastestMs: 0,
        slowestMs: 0,
        trials: [],
        falseStarts: 0,
        valid: false,
        skippedReason: 'Vision issues'
      },
      kingDevickScore: {
        durationSeconds: 0,
        errorsCount: 0,
        completed: false,
        skippedReason: 'Not completed'
      },
      redFlags: noRedFlags,
      triage: {
        verdict: 'INVALID_ASSESSMENT_RETEST_REQUIRED',
        primaryTriggers: ['Test Skipped: Injured limb'],
        swayDegradationPercent: 0,
        reactionDelayDeltaMs: 0,
        kingDevickDeltaSeconds: 0,
        nonDiagnosticDisclaimer: 'Notice'
      }
    };

    const text = formatPlainTextReport(
      baseAthlete,
      assessmentWithSkipped,
      'test-hash',
      { evaluatorName: 'Trainer', evaluatorRole: 'ATC', licenseNumber: '123', signatureUrl: null },
      'Notes'
    );
    expect(text).toContain('Taylor Jordan');
    expect(text).toContain('INVALID_ASSESSMENT_RETEST_REQUIRED');
  });
});
