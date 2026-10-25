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

  it('migrates legacy saved assessment in storage by stripping skipped test triggers when red flags are present', () => {
    const legacyRecord: AssessmentRecord = {
      id: 'legacy-rec-1',
      athleteId: 'ath-1',
      timestamp: '2026-10-24 10:00:00',
      isPostImpact: true,
      balanceScore: { durationSeconds: 0, stabilityIndex: 0, peakSway: 0, swayHistory: [], valid: false, skippedReason: 'Skipped for safety' },
      reactionScore: { averageMs: 0, fastestMs: 0, slowestMs: 0, trials: [], falseStarts: 0, valid: false, skippedReason: 'Skipped for safety' },
      kingDevickScore: { durationSeconds: 0, errorsCount: 0, completed: false, skippedReason: 'Skipped for safety' },
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
        hasRedFlags: true
      },
      triage: {
        verdict: 'IMMEDIATE_REMOVAL',
        primaryTriggers: [
          'EMERGENCY PROTOCOL: Neck pain or tenderness',
          'Balance Test Skipped: Skipped for safety',
          'Reaction Test Skipped: Skipped for safety',
          'Reading Test Skipped: Skipped for safety'
        ],
        swayDegradationPercent: 0,
        reactionDelayDeltaMs: 0,
        kingDevickDeltaSeconds: 0,
        nonDiagnosticDisclaimer: 'Notice'
      }
    };

    // Save directly to mockStorage to simulate pre-existing saved record in localStorage
    storageMap['sidelinesentry_assessments'] = JSON.stringify([legacyRecord]);

    const loaded = loadAssessments();
    expect(loaded.length).toBe(1);
    expect(loaded[0].triage.primaryTriggers).toEqual(['EMERGENCY PROTOCOL: Neck pain or tenderness']);
    expect(loaded[0].triage.primaryTriggers.some(t => t.includes('Skipped'))).toBe(false);
  });

  it('groups reports hierarchically under Sport -> Player -> Reports', () => {
    const athletesList: AthleteProfile[] = [
      { id: 'ath-1', name: 'Marcus Vance', jerseyNumber: '12', sport: 'Football', position: 'Quarterback' },
      { id: 'ath-2', name: 'Liam Chen', jerseyNumber: '7', sport: 'Soccer', position: 'Midfielder' },
      { id: 'ath-3', name: 'Tyler Ross', jerseyNumber: '18', sport: 'Football', position: 'Running Back' }
    ];

    const makeRec = (id: string, athleteId: string, timestamp: string): AssessmentRecord => ({
      id,
      athleteId,
      timestamp,
      isPostImpact: true,
      balanceScore: { durationSeconds: 15, stabilityIndex: 0.08, peakSway: 0.1, swayHistory: [], valid: true },
      reactionScore: { averageMs: 230, fastestMs: 220, slowestMs: 240, trials: [], falseStarts: 0, valid: true },
      kingDevickScore: { durationSeconds: 42.0, errorsCount: 0, completed: true },
      redFlags: {
        neckPain: false, doubleVision: false, weaknessOrTingling: false, severeOrIncreasingHeadache: false,
        seizureOrConvulsion: false, lossOfConsciousness: false, deterioratingConsciousState: false, vomitingRepeated: false,
        increasingConfusion: false, maddocksVenueFailed: false, maddocksPeriodFailed: false, maddocksScoreFailed: false
      },
      triage: {
        verdict: 'CLEAR_OBSERVED',
        primaryTriggers: [],
        swayDegradationPercent: 0,
        reactionDelayDeltaMs: 0,
        kingDevickDeltaSeconds: 0,
        nonDiagnosticDisclaimer: 'Scores normal'
      }
    });

    const records = [
      makeRec('r-1', 'ath-1', '2026-10-25 10:00'),
      makeRec('r-2', 'ath-1', '2026-10-25 11:00'),
      makeRec('r-3', 'ath-2', '2026-10-25 12:00'),
      makeRec('r-4', 'ath-3', '2026-10-25 13:00')
    ];

    // Build hierarchy
    const sportMap = new Map<string, Map<string, AssessmentRecord[]>>();
    for (const rec of records) {
      const ath = athletesList.find(a => a.id === rec.athleteId);
      const sport = ath?.sport || 'General';
      const player = ath?.name || rec.athleteId;
      if (!sportMap.has(sport)) sportMap.set(sport, new Map());
      const playerMap = sportMap.get(sport)!;
      if (!playerMap.has(player)) playerMap.set(player, []);
      playerMap.get(player)!.push(rec);
    }

    expect(Array.from(sportMap.keys()).sort()).toEqual(['Football', 'Soccer']);
    expect(sportMap.get('Football')?.get('Marcus Vance')?.length).toBe(2);
    expect(sportMap.get('Football')?.get('Tyler Ross')?.length).toBe(1);
    expect(sportMap.get('Soccer')?.get('Liam Chen')?.length).toBe(1);
  });
});
