import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadAthletes,
  saveAthletes,
  loadAssessments,
  saveAssessment,
  deleteAthlete,
  exportBackupData,
  importBackupData
} from './storage';
import { AthleteProfile, AssessmentRecord } from '../types/clinical';

describe('SidelineSentry storage service', () => {
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
    if (typeof window !== 'undefined') {
      (window as unknown as { localStorage: Storage }).localStorage = mockStorage;
    }
  });

  const sampleAthletes: AthleteProfile[] = [
    { id: 'ath-1', name: 'Marcus Vance', jerseyNumber: '12', sport: 'Football', position: 'Quarterback' },
    { id: 'ath-2', name: 'Jordan Hayes', jerseyNumber: '7', sport: 'Soccer', position: 'Midfielder' },
    { id: 'ath-custom', name: 'Taylor Swift', jerseyNumber: '13', sport: 'Basketball', position: 'Guard' }
  ];

  const sampleAssessment: AssessmentRecord = {
    id: 'session-101',
    athleteId: 'ath-1',
    timestamp: '2026-10-24 10:00:00',
    isPostImpact: true,
    balanceScore: { durationSeconds: 15, stabilityIndex: 0.08, peakSway: 0.12, swayHistory: [], valid: true },
    reactionScore: { averageMs: 230, fastestMs: 220, slowestMs: 245, trials: [230], falseStarts: 0, valid: true },
    kingDevickScore: { durationSeconds: 42.0, errorsCount: 0, completed: true },
    redFlags: {
      neckPain: false, doubleVision: false, weaknessOrTingling: false, severeOrIncreasingHeadache: false,
      seizureOrConvulsion: false, lossOfConsciousness: false, deterioratingConsciousState: false,
      vomitingRepeated: false, increasingConfusion: false
    },
    triage: {
      verdict: 'CLEAR_OBSERVED',
      primaryTriggers: [],
      swayDegradationPercent: 0,
      reactionDelayDeltaMs: 0,
      kingDevickDeltaSeconds: 0,
      nonDiagnosticDisclaimer: 'Screening only'
    }
  };

  describe('Seed athlete migration', () => {
    it('renames legacy seed athletes on ath-1..ath-6 to Test Athlete 1..6 and persists them', () => {
      mockStorage.setItem('sidelinesentry_athletes', JSON.stringify(sampleAthletes));

      const loaded = loadAthletes([]);
      const ath1 = loaded.find(a => a.id === 'ath-1');
      const ath2 = loaded.find(a => a.id === 'ath-2');
      const custom = loaded.find(a => a.id === 'ath-custom');

      expect(ath1?.name).toBe('Test Athlete 1');
      expect(ath2?.name).toBe('Test Athlete 2');
      expect(custom?.name).toBe('Taylor Swift');

      // Verify migration was persisted into storage
      const rawStored = mockStorage.getItem('sidelinesentry_athletes');
      expect(rawStored).toContain('Test Athlete 1');
      expect(rawStored).toContain('Test Athlete 2');
      expect(rawStored).toContain('Taylor Swift');
    });

    it('preserves coach-edited or custom names on ath-1..ath-6', () => {
      const customSeed: AthleteProfile[] = [
        { id: 'ath-1', name: 'Coach Special Athlete', jerseyNumber: '99', sport: 'Football', position: 'Quarterback' }
      ];
      mockStorage.setItem('sidelinesentry_athletes', JSON.stringify(customSeed));

      const loaded = loadAthletes([]);
      expect(loaded[0].name).toBe('Coach Special Athlete');
    });
  });

  describe('Assessment migration', () => {
    it('strips any trigger containing Safety Margin or Margen de seguridad from saved assessments', () => {
      const assessmentWithMargin: AssessmentRecord = {
        ...sampleAssessment,
        id: 'session-margin',
        triage: {
          ...sampleAssessment.triage,
          primaryTriggers: [
            'Standard School Safety Margin Applied (+15% tighter baseline check)',
            'Postural sway degraded +28.5%',
            'Margen de seguridad escolar aplicado'
          ]
        }
      };
      mockStorage.setItem('sidelinesentry_assessments', JSON.stringify([assessmentWithMargin]));

      const loaded = loadAssessments();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].triage.primaryTriggers).toEqual(['Postural sway degraded +28.5%']);
      expect(loaded[0].triage.primaryTriggers.some(t => /safety margin|margen de seguridad/i.test(t))).toBe(false);
    });
  });

  describe('Empty roster preservation', () => {
    it('keeps an intentionally empty array [] in storage without falling back to default athletes', () => {
      mockStorage.setItem('sidelinesentry_athletes', '[]');

      const fallbackDefaults: AthleteProfile[] = [
        { id: 'ath-fallback', name: 'Default Athlete', jerseyNumber: '0', sport: 'Track', position: 'Runner' }
      ];

      const loaded = loadAthletes(fallbackDefaults);
      expect(loaded).toEqual([]);
    });

    it('falls back to default athletes when storage key is null or uninitialized', () => {
      const fallbackDefaults: AthleteProfile[] = [
        { id: 'ath-1', name: 'Test Athlete 1', jerseyNumber: '12', sport: 'Football', position: 'QB' }
      ];

      const loaded = loadAthletes(fallbackDefaults);
      expect(loaded).toEqual(fallbackDefaults);
    });
  });

  describe('deleteAthlete', () => {
    it('removes athlete, their assessments, and their recovery entry while keeping others intact', () => {
      const athleteA: AthleteProfile = { id: 'ath-1', name: 'Test Athlete 1', jerseyNumber: '1', sport: 'Football', position: 'QB' };
      const athleteB: AthleteProfile = { id: 'ath-2', name: 'Test Athlete 2', jerseyNumber: '2', sport: 'Soccer', position: 'MID' };

      saveAthletes([athleteA, athleteB]);
      saveAssessment(sampleAssessment); // athleteId: ath-1
      const assessmentB: AssessmentRecord = { ...sampleAssessment, id: 'session-202', athleteId: 'ath-2' };
      saveAssessment(assessmentB);

      // Seed recovery entry
      mockStorage.setItem('sidelinesentry_recovery', JSON.stringify({
        'ath-1': { step: 3, notes: 'Resting' },
        'ath-2': { step: 1, notes: 'Monitoring' }
      }));

      // Delete athlete 1
      const remaining = deleteAthlete('ath-1');

      // Athlete list check
      expect(remaining.map(a => a.id)).toEqual(['ath-2']);
      expect(loadAthletes([]).map(a => a.id)).toEqual(['ath-2']);

      // Assessment check
      const remainingAssessments = loadAssessments();
      expect(remainingAssessments).toHaveLength(1);
      expect(remainingAssessments[0].athleteId).toBe('ath-2');

      // Recovery check
      const rawRecovery = mockStorage.getItem('sidelinesentry_recovery');
      const parsedRecovery = JSON.parse(rawRecovery || '{}');
      expect(parsedRecovery['ath-1']).toBeUndefined();
      expect(parsedRecovery['ath-2']).toBeDefined();
    });
  });

  describe('Backup export and import', () => {
    it('performs a valid round-trip backup export and import', () => {
      saveAthletes(sampleAthletes);
      saveAssessment(sampleAssessment);
      mockStorage.setItem('sidelinesentry_recovery', JSON.stringify({ 'ath-1': { stage: 2 } }));

      const exportedJson = exportBackupData();
      const parsed = JSON.parse(exportedJson);
      expect(parsed.app).toBe('SidelineSentry');
      expect(parsed.version).toBe(1);
      expect(parsed.athletes).toHaveLength(3);
      expect(parsed.assessments).toHaveLength(1);
      expect(parsed.recovery['ath-1']).toBeDefined();

      // Clear storage to simulate fresh device
      mockStorage.clear();
      expect(loadAthletes([])).toHaveLength(0);
      expect(loadAssessments()).toHaveLength(0);

      // Import the exported backup
      const importResult = importBackupData(exportedJson);
      expect(importResult.ok).toBe(true);
      expect(importResult.athletes).toHaveLength(3);

      expect(loadAthletes([])).toHaveLength(3);
      expect(loadAssessments()).toHaveLength(1);
      const restoredRecovery = JSON.parse(mockStorage.getItem('sidelinesentry_recovery') || '{}');
      expect(restoredRecovery['ath-1']).toBeDefined();
    });

    it('rejects malformed JSON without modifying existing storage', () => {
      saveAthletes(sampleAthletes);
      const res = importBackupData('{ invalid json ');

      expect(res.ok).toBe(false);
      expect(res.error).toBeDefined();
      expect(loadAthletes([])).toHaveLength(3);
    });

    it('rejects backup with incorrect app identifier without modifying storage', () => {
      saveAthletes(sampleAthletes);
      const invalidApp = JSON.stringify({
        app: 'WrongApp',
        version: 1,
        athletes: [],
        assessments: []
      });

      const res = importBackupData(invalidApp);
      expect(res.ok).toBe(false);
      expect(loadAthletes([])).toHaveLength(3);
    });

    it('rejects backup with invalid athlete items missing id or name', () => {
      saveAthletes(sampleAthletes);
      const invalidAthletes = JSON.stringify({
        app: 'SidelineSentry',
        version: 1,
        athletes: [{ jerseyNumber: '10' }], // Missing id and name
        assessments: []
      });

      const res = importBackupData(invalidAthletes);
      expect(res.ok).toBe(false);
      expect(loadAthletes([])).toHaveLength(3);
    });

    it('rejects backup with invalid assessments structure', () => {
      saveAthletes(sampleAthletes);
      const invalidAssessments = JSON.stringify({
        app: 'SidelineSentry',
        version: 1,
        athletes: [{ id: 'ath-1', name: 'Test Athlete 1' }],
        assessments: 'not-an-array'
      });

      const res = importBackupData(invalidAssessments);
      expect(res.ok).toBe(false);
      expect(loadAthletes([])).toHaveLength(3);
    });
  });
});
