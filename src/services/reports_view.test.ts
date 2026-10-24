import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentRecord, AthleteProfile } from '../types/clinical';
import { loadAssessments, saveAssessment } from './storage';

describe('Reports & Emergency Protocol Flow', () => {
  let storageMap: Record<string, string> = {};

  const mockStorage: Storage = {
    getItem: (key: string) => (key in storageMap ? storageMap[key] : null),
    setItem: (key: string, value: string) => {
      storageMap[key] = String(value);
    },
    removeItem: (key: string) => {
      delete storageMap[key];
    },
    clear: () => {
      storageMap = {};
    },
    key: (index: number) => Object.keys(storageMap)[index] || null,
    get length() {
      return Object.keys(storageMap).length;
    }
  };

  beforeEach(() => {
    storageMap = {};
    (globalThis as unknown as { localStorage: Storage }).localStorage = mockStorage;
  });

  const mockAthlete: AthleteProfile = {
    id: 'ath-test-1',
    name: 'Test Athlete 1',
    jerseyNumber: '12',
    sport: 'Football',
    position: 'Quarterback',
    baselineStabilityIndex: 0.078,
    baselineReactionTimeMs: 220,
    baselineKingDevickSeconds: 39.5
  };

  it('initially loads an empty assessments list when no assessments exist', () => {
    const list = loadAssessments();
    expect(list).toEqual([]);
  });

  it('saves and retrieves an emergency lockdown assessment record', () => {
    const record: AssessmentRecord = {
      id: 'emergency-test-123',
      athleteId: mockAthlete.id,
      timestamp: new Date().toLocaleString(),
      isPostImpact: true,
      isDemo: false,
      isEmergencyLockdown: true,
      balanceScore: {
        durationSeconds: 0,
        stabilityIndex: 0,
        peakSway: 0,
        swayHistory: [],
        valid: false,
        skippedReason: 'Skipped for safety: Athlete showed an emergency warning sign.'
      },
      reactionScore: {
        averageMs: 0,
        fastestMs: 0,
        slowestMs: 0,
        trials: [],
        falseStarts: 0,
        valid: false,
        skippedReason: 'Skipped for safety: Athlete showed an emergency warning sign.'
      },
      kingDevickScore: {
        durationSeconds: 0,
        errorsCount: 0,
        completed: false,
        skippedReason: 'Skipped for safety: Athlete showed an emergency warning sign.'
      },
      redFlags: {
        neckPain: true,
        doubleVision: false,
        weaknessOrTingling: false,
        severeOrIncreasingHeadache: false,
        seizureOrConvulsion: false,
        lossOfConsciousness: false,
        deterioratingConsciousState: false,
        vomitingRepeated: false,
        increasingConfusion: false,
        maddocksVenueFailed: false,
        maddocksPeriodFailed: false,
        maddocksScoreFailed: false
      },
      triage: {
        verdict: 'IMMEDIATE_REMOVAL',
        primaryTriggers: ['EMERGENCY_RED_FLAGS'],
        swayDegradationPercent: 0,
        reactionDelayDeltaMs: 0,
        kingDevickDeltaSeconds: 0,
        nonDiagnosticDisclaimer: 'Emergency Warning'
      }
    };

    const saved = saveAssessment(record);
    expect(saved).toBe(true);

    const loaded = loadAssessments();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('emergency-test-123');
    expect(loaded[0].isEmergencyLockdown).toBe(true);
    expect(loaded[0].balanceScore.skippedReason).toContain('Skipped for safety');
  });

  it('aggregates multiple assessments preserving newest-first order', () => {
    const rec1: AssessmentRecord = {
      id: 'rec-1',
      athleteId: 'ath-1',
      timestamp: '2026-10-24 10:00:00',
      isPostImpact: true,
      isDemo: false,
      balanceScore: { durationSeconds: 15, stabilityIndex: 0.08, peakSway: 0.1, swayHistory: [], valid: true },
      reactionScore: { averageMs: 230, fastestMs: 220, slowestMs: 240, trials: [], falseStarts: 0, valid: true },
      kingDevickScore: { durationSeconds: 42.0, errorsCount: 0, completed: true },
      redFlags: {
        neckPain: false,
        doubleVision: false,
        weaknessOrTingling: false,
        severeOrIncreasingHeadache: false,
        seizureOrConvulsion: false,
        lossOfConsciousness: false,
        deterioratingConsciousState: false,
        vomitingRepeated: false,
        increasingConfusion: false,
        maddocksVenueFailed: false,
        maddocksPeriodFailed: false,
        maddocksScoreFailed: false
      },
      triage: {
        verdict: 'CLEAR_OBSERVED',
        primaryTriggers: [],
        swayDegradationPercent: 0,
        reactionDelayDeltaMs: 0,
        kingDevickDeltaSeconds: 0,
        nonDiagnosticDisclaimer: 'Scores normal'
      }
    };

    const rec2: AssessmentRecord = {
      ...rec1,
      id: 'rec-2',
      athleteId: 'ath-2'
    };

    saveAssessment(rec1);
    saveAssessment(rec2);

    const loaded = loadAssessments();
    expect(loaded.length).toBe(2);
    expect(loaded[0].id).toBe('rec-2');
    expect(loaded[1].id).toBe('rec-1');
  });
});
